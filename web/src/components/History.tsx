"use client";
import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { decodeEventLog, type Address, type Log } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress, deployBlock, explorerUrl } from "@/lib/config";
import { fmt, short } from "@/lib/format";

const CHUNK = 9_000n; // stay under common eth_getLogs range limits

type Row = { name: string; args: Record<string, unknown>; tx: string; block: bigint };

export function History({ circleId, decimals, symbol }: { circleId: bigint; decimals: number; symbol: string }) {
  const client = usePublicClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["history", circleId.toString()],
    enabled: !!client && !!ajoAddress,
    refetchInterval: 15_000,
    queryFn: async () => {
      const latest = await client!.getBlockNumber();
      const logs: Log[] = [];
      for (let from = deployBlock; from <= latest; from += CHUNK + 1n) {
        const to = from + CHUNK > latest ? latest : from + CHUNK;
        logs.push(...(await client!.getLogs({ address: ajoAddress as Address, fromBlock: from, toBlock: to })));
      }
      const rows: Row[] = [];
      for (const log of logs) {
        try {
          const ev = decodeEventLog({ abi: ajoAbi, data: log.data, topics: log.topics });
          const args = ev.args as unknown as Record<string, unknown>;
          if (args.circleId !== circleId) continue;
          rows.push({ name: ev.eventName, args, tx: log.transactionHash!, block: log.blockNumber! });
        } catch {}
      }
      return rows.reverse();
    },
  });

  const amt = (v: unknown) => `${fmt(v as bigint, decimals)} ${symbol}`;
  const who = (v: unknown) => short(v as string);
  const describe = (r: Row): string => {
    const a = r.args;
    switch (r.name) {
      case "CircleCreated": return `Circle created by ${who(a.creator)}`;
      case "MemberJoined": return `${who(a.member)} joined${(a.collateral as bigint) > 0n ? ` (collateral ${amt(a.collateral)})` : ""}`;
      case "MemberLeft": return `${who(a.member)} left (refunded ${amt(a.refunded)})`;
      case "CircleCancelled": return "Circle cancelled";
      case "CircleStarted": return "Circle started, payout order fixed";
      case "RoundStarted": return `Round ${Number(a.round) + 1} opened, recipient ${who(a.recipient)}`;
      case "ContributionMade": return `${who(a.member)} paid ${amt(a.amount)} for round ${Number(a.round) + 1}`;
      case "CollateralSlashed": return `${who(a.member)} missed round ${Number(a.round) + 1}: ${amt(a.amount)} collateral slashed`;
      case "MemberDefaulted": return `${who(a.member)} flagged as defaulter`;
      case "MemberExited": return `${who(a.member)} exited early, forfeiting ${amt(a.forfeited)}`;
      case "PayoutSent": return `Round ${Number(a.round) + 1} pot ${amt(a.amount)} sent to ${who(a.recipient)}`;
      case "PayoutCredited": return `Round ${Number(a.round) + 1} pot ${amt(a.amount)} credited to ${who(a.recipient)}`;
      case "ForfeitedPotSplit": return `Round ${Number(a.round) + 1} pot ${amt(a.amount)} split between ${a.recipients} members`;
      case "RoundSettled": return `Round ${Number(a.round) + 1} settled by ${who(a.caller)}`;
      case "CollateralReturned": return `${amt(a.amount)} collateral returned to ${who(a.member)}`;
      case "CircleCompleted": return "Circle completed 🎉";
      case "Claimed": return `${who(a.account)} claimed ${amt(a.amount)}`;
      default: return r.name;
    }
  };

  return (
    <div className="card">
      <h2>History</h2>
      {isLoading && <p className="muted">Loading events…</p>}
      {error && <p className="error">Could not load history: {(error as Error).message}</p>}
      {data && data.length === 0 && <p className="muted">No activity yet.</p>}
      <ul className="history">
        {data?.map((r, i) => (
          <li key={`${r.tx}-${i}`}>
            <span>{describe(r)}</span>
            {explorerUrl ? (
              <a className="muted" href={`${explorerUrl}/tx/${r.tx}`} target="_blank" rel="noreferrer">
                tx ↗
              </a>
            ) : (
              <span className="muted">#{r.block.toString()}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
