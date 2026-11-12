"use client";
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { decodeEventLog, type Address, type PublicClient } from "viem";
import { ajoAbi } from "./abi";
import { ajoAddress } from "./config";
import { scanOptions } from "./logScan";
import { fromStored, getCachedLogs, readStored, type LogClient, type StoredLog } from "./logCache";

export type CircleT = {
  creator: Address;
  token: Address;
  contributionAmount: bigint;
  roundLength: bigint;
  roundDeadline: bigint;
  startedAt: bigint;
  maxMembers: number;
  currentRound: number;
  activeMembers: number;
  randomOrder: boolean;
  requireCollateral: boolean;
  status: number;
  pot: bigint;
  name: string;
};
export type MemberT = {
  joined: boolean;
  exited: boolean;
  defaulted: boolean;
  receivedPayout: boolean;
  missedPayments: number;
  collateral: bigint;
};
export type Row = {
  id: number;
  c: CircleT;
  members: Address[];
  order: Address[];
  info: Record<string, MemberT | undefined>;
  /** paid-status for the current round, keyed by lowercase address (active circles only) */
  paidNow: Record<string, boolean>;
  recipient?: Address;
  defaulted: boolean;
  slashedBy: Record<string, bigint>;
  returnedTo: Record<string, bigint>;
  contributed: bigint;
  payouts: number;
  collateralLocked: bigint;
};
export type Dashboard = { rows: Row[]; latestBlock: bigint; multicall: boolean };
/** Figures derived from contract events, per circle id. They load after the circle data. */
export type EventTotals = {
  defaulted: boolean;
  slashedBy: Record<string, bigint>;
  returnedTo: Record<string, bigint>;
  contributed: bigint;
  payouts: number;
};
export type EventData = { byId: Map<number, EventTotals>; scannedTo: bigint };

const REFETCH_MS = 60_000;

const ajo = { address: ajoAddress as Address, abi: ajoAbi } as const;

type Call = { functionName: string; args: readonly unknown[] };

/** Multicall3 when available on the chain; otherwise plain parallel eth_calls. Results align with `calls`. */
async function batch(client: PublicClient, calls: Call[], state: { multicall: boolean }): Promise<unknown[]> {
  if (calls.length === 0) return [];
  const contracts = calls.map((c) => ({ ...ajo, functionName: c.functionName, args: c.args })) as never[];
  if (state.multicall) {
    try {
      const out = await client.multicall({ contracts, allowFailure: true, batchSize: 4096 });
      return out.map((r) => (r.status === "success" ? r.result : undefined));
    } catch {
      state.multicall = false;
    }
  }
  const settled = await Promise.allSettled(
    calls.map((c) => client.readContract({ ...ajo, functionName: c.functionName as never, args: c.args as never })),
  );
  return settled.map((r) => (r.status === "fulfilled" ? r.value : undefined));
}

/** Step 1: circles, members, status. Multicall only: no event scan, so it renders fast. */
async function loadCore(client: PublicClient): Promise<Dashboard> {
  const state = { multicall: !!client.chain?.contracts?.multicall3 };
  const [countRaw, latestBlock] = await Promise.all([
    client.readContract({ ...ajo, functionName: "circleCount" }),
    client.getBlockNumber(),
  ]);
  const count = Number(countRaw);
  const ids = Array.from({ length: count }, (_, i) => i + 1);

  // 1) circle, members, payout order
  const base = await batch(
    client,
    ids.flatMap((id) => [
      { functionName: "getCircle", args: [BigInt(id)] },
      { functionName: "getMembers", args: [BigInt(id)] },
      { functionName: "getPayoutOrder", args: [BigInt(id)] },
    ]),
    state,
  );
  const partial = ids
    .map((id, i) => ({
      id,
      c: base[i * 3] as CircleT | undefined,
      members: ((base[i * 3 + 1] as Address[] | undefined) ?? []) as Address[],
      order: ((base[i * 3 + 2] as Address[] | undefined) ?? []) as Address[],
    }))
    .filter((r): r is { id: number; c: CircleT; members: Address[]; order: Address[] } => !!r.c);

  // 2) member structs, current-round paid flags, current recipient
  const calls: Call[] = [];
  const idx: { kind: "m" | "p" | "r"; row: number; who?: Address }[] = [];
  partial.forEach((r, ri) => {
    for (const m of r.members) {
      calls.push({ functionName: "getMember", args: [BigInt(r.id), m] });
      idx.push({ kind: "m", row: ri, who: m });
      if (r.c.status === 1) {
        calls.push({ functionName: "hasPaid", args: [BigInt(r.id), BigInt(r.c.currentRound), m] });
        idx.push({ kind: "p", row: ri, who: m });
      }
    }
    if (r.c.status === 1) {
      calls.push({ functionName: "currentRecipient", args: [BigInt(r.id)] });
      idx.push({ kind: "r", row: ri });
    }
  });
  const res = await batch(client, calls, state);

  const rows: Row[] = partial.map((r) => ({
    ...r,
    info: {},
    paidNow: {},
    defaulted: false,
    slashedBy: {},
    returnedTo: {},
    contributed: 0n,
    payouts: 0,
    collateralLocked: 0n,
  }));
  idx.forEach((x, i) => {
    const row = rows[x.row];
    if (x.kind === "m") row.info[x.who!.toLowerCase()] = res[i] as MemberT | undefined;
    else if (x.kind === "p") row.paidNow[x.who!.toLowerCase()] = !!res[i];
    else row.recipient = res[i] as Address | undefined;
  });
  for (const row of rows) {
    for (const m of Object.values(row.info)) {
      if (!m) continue;
      row.collateralLocked += m.collateral;
      if (m.defaulted) row.defaulted = true;
    }
  }
  return { rows, latestBlock, multicall: state.multicall };
}

/** Folds decoded contract events into per-circle totals. Pure, so it also works on cached logs. */
export function foldEvents(logs: StoredLog[], scannedTo: bigint): EventData {
  const byId = new Map<number, EventTotals>();
  const get = (id: number) => {
    let t = byId.get(id);
    if (!t) byId.set(id, (t = { defaulted: false, slashedBy: {}, returnedTo: {}, contributed: 0n, payouts: 0 }));
    return t;
  };
  for (const l of logs) {
    let ev;
    try {
      const log = fromStored(l, ajoAddress as Address);
      ev = decodeEventLog({ abi: ajoAbi, data: log.data, topics: log.topics });
    } catch {
      continue;
    }
    const a = ev.args as unknown as Record<string, unknown>;
    if (typeof a.circleId !== "bigint") continue;
    const t = get(Number(a.circleId));
    switch (ev.eventName) {
      case "ContributionMade":
        t.contributed += a.amount as bigint;
        break;
      case "PayoutSent":
      case "PayoutCredited":
        t.payouts += 1;
        break;
      case "CollateralSlashed": {
        const k = (a.member as string).toLowerCase();
        t.slashedBy[k] = (t.slashedBy[k] ?? 0n) + (a.amount as bigint);
        t.defaulted = true;
        break;
      }
      case "CollateralReturned": {
        const k = (a.member as string).toLowerCase();
        t.returnedTo[k] = (t.returnedTo[k] ?? 0n) + (a.amount as bigint);
        break;
      }
    }
  }
  return { byId, scannedTo };
}

/** Step 2: event totals from the cached incremental log scan (only new blocks are fetched). */
async function loadEvents(client: PublicClient): Promise<EventData> {
  const set = await getCachedLogs(client as unknown as LogClient, scanOptions());
  return foldEvents(set.logs, set.toBlock);
}

export type DashboardState = {
  data: Dashboard | undefined;
  /** true until the circle data (not the event totals) has loaded */
  isLoading: boolean;
  /** true while event-derived figures (saved total, payouts, slashes) have not loaded yet */
  eventsLoading: boolean;
  eventsError: boolean;
  error: Error | null;
  isFetching: boolean;
  dataUpdatedAt: number;
  refetch: () => void;
};

export function useDashboard(): DashboardState {
  const client = usePublicClient();
  const qc = useQueryClient();
  const enabled = !!client && !!ajoAddress;

  const core = useQuery({
    queryKey: ["dashboard", "core", ajoAddress],
    enabled,
    refetchInterval: REFETCH_MS,
    retry: 1,
    queryFn: () => loadCore(client as PublicClient),
  });
  const events = useQuery({
    queryKey: ["dashboard", "events", ajoAddress],
    enabled,
    refetchInterval: REFETCH_MS,
    retry: 1,
    queryFn: () => loadEvents(client as PublicClient),
  });

  // Warm visit: show totals from the localStorage cache straight away, then let the query refresh them.
  useEffect(() => {
    if (!enabled || qc.getQueryData(["dashboard", "events", ajoAddress])) return;
    const hit = readStored(scanOptions());
    if (hit) qc.setQueryData(["dashboard", "events", ajoAddress], foldEvents(hit.logs, hit.toBlock), { updatedAt: hit.savedAt || undefined });
  }, [enabled, qc]);

  const data = useMemo<Dashboard | undefined>(() => {
    if (!core.data) return undefined;
    const ev = events.data;
    if (!ev) return core.data;
    const rows = core.data.rows.map((r) => {
      const t = ev.byId.get(r.id);
      return t ? { ...r, ...t, defaulted: r.defaulted || t.defaulted } : r;
    });
    return { ...core.data, rows };
  }, [core.data, events.data]);

  return {
    data,
    isLoading: core.isLoading,
    eventsLoading: !events.data && !events.isError,
    eventsError: !events.data && events.isError,
    error: core.error as Error | null,
    isFetching: core.isFetching || events.isFetching,
    dataUpdatedAt: core.dataUpdatedAt,
    refetch: () => {
      core.refetch();
      events.refetch();
    },
  };
}
