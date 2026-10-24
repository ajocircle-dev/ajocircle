"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { decodeEventLog, type Address, type Log, type PublicClient } from "viem";
import { ajoAbi } from "./abi";
import { ajoAddress, deployBlock } from "./config";

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

const ajo = { address: ajoAddress as Address, abi: ajoAbi } as const;
const CHUNK = 9_000n;

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

async function loadAll(client: PublicClient): Promise<Dashboard> {
  const state = { multicall: !!client.chain?.contracts?.multicall3 };
  const count = Number(await client.readContract({ ...ajo, functionName: "circleCount" }));
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

  // 3) events since deploy: contributions, payouts, slashes, collateral returns
  const latestBlock = await client.getBlockNumber();
  const logs: Log[] = [];
  const ranges: [bigint, bigint][] = [];
  for (let from = deployBlock; from <= latestBlock; from += CHUNK + 1n) ranges.push([from, from + CHUNK > latestBlock ? latestBlock : from + CHUNK]);
  for (let i = 0; i < ranges.length; i += 4) {
    const part = await Promise.all(
      ranges.slice(i, i + 4).map(([fromBlock, toBlock]) => client.getLogs({ address: ajoAddress as Address, fromBlock, toBlock })),
    );
    part.forEach((p) => logs.push(...p));
  }
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const log of logs) {
    let ev;
    try {
      ev = decodeEventLog({ abi: ajoAbi, data: log.data, topics: log.topics });
    } catch {
      continue;
    }
    const a = ev.args as unknown as Record<string, unknown>;
    const row = byId.get(Number(a.circleId as bigint));
    if (!row) continue;
    switch (ev.eventName) {
      case "ContributionMade":
        row.contributed += a.amount as bigint;
        break;
      case "PayoutSent":
      case "PayoutCredited":
        row.payouts += 1;
        break;
      case "CollateralSlashed": {
        const k = (a.member as string).toLowerCase();
        row.slashedBy[k] = (row.slashedBy[k] ?? 0n) + (a.amount as bigint);
        row.defaulted = true;
        break;
      }
      case "CollateralReturned": {
        const k = (a.member as string).toLowerCase();
        row.returnedTo[k] = (row.returnedTo[k] ?? 0n) + (a.amount as bigint);
        break;
      }
    }
  }
  for (const row of rows) {
    for (const m of Object.values(row.info)) {
      if (!m) continue;
      row.collateralLocked += m.collateral;
      if (m.defaulted) row.defaulted = true;
    }
  }
  return { rows, latestBlock, multicall: state.multicall };
}

export function useDashboard() {
  const client = usePublicClient();
  return useQuery({
    queryKey: ["dashboard", ajoAddress],
    enabled: !!client && !!ajoAddress,
    refetchInterval: 20_000,
    retry: 1,
    queryFn: () => loadAll(client as PublicClient),
  });
}
