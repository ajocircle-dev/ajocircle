"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress, chain, explorerUrl, faucetUrl } from "@/lib/config";
import { STATUS, duration, fmt, short } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { History } from "./History";
import { useYieldConfig } from "./MusdBanner";

type Circle = {
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
type Member = {
  joined: boolean;
  exited: boolean;
  defaulted: boolean;
  receivedPayout: boolean;
  missedPayments: number;
  collateral: bigint;
};

const ajo = { address: ajoAddress as Address, abi: ajoAbi } as const;

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function countdown(secs: number) {
  if (secs <= 0) return "deadline passed";
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return d > 0 ? `${d}d ${h}h ${m}m left` : `${h}h ${m}m ${s}s left`;
}

export function CircleView({ id }: { id: bigint }) {
  const { address: me } = useAccount();
  const tx = useTx();
  const now = useNow();
  const [copied, setCopied] = useState(false);

  const { data: base, isLoading, error } = useReadContracts({
    contracts: [
      { ...ajo, functionName: "getCircle", args: [id] },
      { ...ajo, functionName: "getMembers", args: [id] },
      { ...ajo, functionName: "getPayoutOrder", args: [id] },
    ],
    query: { refetchInterval: 10_000 },
  });
  const circle = base?.[0]?.result as Circle | undefined;
  const members = (base?.[1]?.result as Address[] | undefined) ?? [];
  const order = (base?.[2]?.result as Address[] | undefined) ?? [];

  const { data: tokenMeta } = useReadContracts({
    contracts: [
      { address: circle?.token, abi: erc20Abi, functionName: "symbol" },
      { address: circle?.token, abi: erc20Abi, functionName: "decimals" },
      { address: circle?.token, abi: erc20Abi, functionName: "allowance", args: [me!, ajoAddress as Address] },
      { address: circle?.token, abi: erc20Abi, functionName: "balanceOf", args: [me!] },
    ],
    query: { enabled: !!circle, refetchInterval: 10_000 },
  });
  const symbol = (tokenMeta?.[0]?.result as string) ?? "";
  const decimals = (tokenMeta?.[1]?.result as number) ?? 18;
  const allowance = tokenMeta?.[2]?.result as bigint | undefined;
  const balance = tokenMeta?.[3]?.result as bigint | undefined;

  const { data: memberData } = useReadContracts({
    contracts: members.map((m) => ({ ...ajo, functionName: "getMember" as const, args: [id, m] as const })),
    query: { enabled: members.length > 0, refetchInterval: 10_000 },
  });
  const infos = new Map<string, Member>(members.map((m, i) => [m, memberData?.[i]?.result as Member]));

  const roundsSoFar = circle && circle.status >= 1 ? Math.min(circle.currentRound, circle.maxMembers - 1) + 1 : 0;
  const { data: roundData } = useReadContracts({
    contracts: Array.from({ length: roundsSoFar }, (_, r) => ({
      ...ajo,
      functionName: "roundStatus" as const,
      args: [id, BigInt(r)] as const,
    })),
    query: { enabled: roundsSoFar > 0, refetchInterval: 10_000 },
  });
  const paidInRound = (r: number, who: Address) => {
    const res = roundData?.[r]?.result as readonly [readonly Address[], readonly boolean[]] | undefined;
    if (!res) return false;
    const idx = res[0].findIndex((a) => a.toLowerCase() === who.toLowerCase());
    return idx >= 0 && res[1][idx];
  };

  const { data: claimable } = useReadContract({
    ...ajo,
    functionName: "claimable",
    args: [id, me!],
    query: { enabled: !!me, refetchInterval: 10_000 },
  });

  const yieldCfg = useYieldConfig();
  const { data: yieldData } = useReadContracts({
    contracts: [
      { ...ajo, functionName: "getYield", args: [id] },
      { ...ajo, functionName: "yieldEarned", args: [id, (me ?? "0x0000000000000000000000000000000000000000") as Address] },
    ],
    query: { enabled: !!yieldCfg.adapter, refetchInterval: 10_000 },
  });
  const yieldPos = yieldData?.[0]?.result as readonly [bigint, bigint, bigint] | undefined;
  const myYield = yieldData?.[1]?.result as bigint | undefined;

  if (!ajoAddress) return <div className="card error">NEXT_PUBLIC_AJO_ADDRESS is not set.</div>;
  if (isLoading) return <div className="card muted">Loading circle…</div>;
  if (error || !circle) return <div className="card error">Circle #{id.toString()} not found on {chain.name}.</div>;

  const mine = me ? infos.get(members.find((m) => m.toLowerCase() === me.toLowerCase()) ?? "") : undefined;
  const isMember = !!mine?.joined;
  const isCreator = me?.toLowerCase() === circle.creator.toLowerCase();
  const status = STATUS[circle.status];
  const active = circle.status === 1;
  const round = circle.currentRound;
  const deadline = Number(circle.roundDeadline);
  const pastDeadline = active && now > deadline;
  const recipient = active ? order[round] : undefined;
  const iPaid = active && me ? paidInRound(round, me) : false;
  const amount = circle.contributionAmount;
  const potSize = amount * BigInt(circle.activeMembers);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const join = () =>
    tx.run(async () => {
      if (circle.requireCollateral) await tx.approveIfNeeded(circle.token, me!, amount, allowance);
      return tx.send("Join", "join", [id]);
    });
  const contribute = () =>
    tx.run(async () => {
      await tx.approveIfNeeded(circle.token, me!, amount, allowance);
      return tx.send("Contribute", "contribute", [id]);
    });
  const simple = (label: string, fn: string, confirmText?: string) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    tx.run(() => tx.send(label, fn, [id]));
  };

  return (
    <>
      <div className="card">
        <div className="head">
          <div>
            <h1>{circle.name || `Circle #${id}`}</h1>
            <p className="muted">
              #{id.toString()} · created by {short(circle.creator)} · <span className={`pill s${circle.status}`}>{status}</span>
            </p>
          </div>
          <button className="btn ghost" onClick={copy}>{copied ? "Link copied ✓" : "Copy invite link"}</button>
        </div>
        <div className="stats">
          <div><span>Contribution</span><strong>{fmt(amount, decimals)} {symbol}</strong></div>
          <div><span>Members</span><strong>{members.length}/{circle.maxMembers}</strong></div>
          <div><span>Round length</span><strong>{duration(Number(circle.roundLength))}</strong></div>
          <div><span>Pot per round</span><strong>{fmt(potSize, decimals)} {symbol}</strong></div>
          <div><span>Payout order</span><strong>{circle.randomOrder ? "Random at start" : "Join order"}</strong></div>
          <div><span>Collateral</span><strong>{circle.requireCollateral ? `${fmt(amount, decimals)} ${symbol}` : "None"}</strong></div>
        </div>

        {(() => {
          const routes =
            !!yieldCfg.adapter && circle.requireCollateral && circle.token.toLowerCase() === yieldCfg.asset?.toLowerCase();
          if (!routes) {
            return symbol === "MUSD" ? (
              <p className="muted small yieldline">
                Powered by MUSD · collateral held as plain MUSD
                {yieldCfg.adapter ? (circle.requireCollateral ? "" : " (no collateral in this circle, so nothing to earn on)") : " (no yield adapter on this deployment)"}
              </p>
            ) : null;
          }
          const [routed, earned, distributed] = yieldPos ?? [0n, 0n, 0n];
          return (
            <div className="yieldbox">
              <div><span>Collateral earning</span><strong>{fmt(routed, decimals)} {symbol}</strong></div>
              <div>
                <span>{circle.status === 2 ? "Yield paid to members" : "Yield earned so far"}</span>
                <strong className="good">+{fmt(circle.status === 2 ? distributed : earned, decimals, 4)} {symbol}</strong>
              </div>
              {myYield !== undefined && myYield > 0n && (
                <div><span>Your yield</span><strong className="good">+{fmt(myYield, decimals, 4)} {symbol}</strong></div>
              )}
              <p className="muted small">
                Collateral sits in the MUSD Savings Vault while the circle runs; the round pot never leaves the contract,
                so payouts are never delayed. At close, yield is shared pro rata to the collateral each member still holds.
              </p>
            </div>
          );
        })()}

        {active && (
          <div className="next">
            <div>
              <span className="muted">Round {round + 1} of {circle.maxMembers} · next payout</span>
              <strong>{fmt(potSize, decimals)} {symbol} → {short(recipient)}{recipient?.toLowerCase() === me?.toLowerCase() ? " (you)" : ""}</strong>
            </div>
            <div className={pastDeadline ? "error" : "muted"}>{countdown(deadline - now)}</div>
          </div>
        )}

        <div className="actions">
          {!me && <p className="muted">Connect a wallet to take part.</p>}
          {me && circle.status === 0 && !isMember && members.length < circle.maxMembers && (
            <button className="btn" disabled={tx.busy} onClick={join}>
              {circle.requireCollateral ? `Approve & join (${fmt(amount, decimals)} ${symbol} collateral)` : "Join circle"}
            </button>
          )}
          {me && circle.status === 0 && isMember && (
            <button className="btn ghost" disabled={tx.busy} onClick={simple("Leave", "leave")}>Leave (refund)</button>
          )}
          {isCreator && circle.status === 0 && (
            <>
              <button className="btn" disabled={tx.busy || members.length !== circle.maxMembers} onClick={simple("Start", "start")}>
                {members.length === circle.maxMembers ? "Start circle" : `Start (needs ${circle.maxMembers - members.length} more)`}
              </button>
              <button className="btn ghost" disabled={tx.busy} onClick={simple("Cancel", "cancelCircle", "Cancel this circle and refund everyone?")}>Cancel</button>
            </>
          )}
          {active && isMember && !mine?.exited && !iPaid && (
            <button className="btn" disabled={tx.busy} onClick={contribute}>
              {allowance !== undefined && allowance >= amount ? "" : "Approve & "}Contribute {fmt(amount, decimals)} {symbol}
            </button>
          )}
          {active && iPaid && <span className="pill s2">You paid this round ✓</span>}
          {pastDeadline && (
            <button className="btn warn" disabled={tx.busy} onClick={simple("Settle round", "settleRound")}>
              Settle round (slash missed payments)
            </button>
          )}
          {active && isMember && !mine?.exited && !mine?.receivedPayout && (
            <button className="btn ghost" disabled={tx.busy} onClick={simple("Exit", "exitCircle", "Exiting forfeits your collateral and your payout turn. Continue?")}>
              Exit early
            </button>
          )}
          {claimable !== undefined && claimable > 0n && (
            <button className="btn" disabled={tx.busy} onClick={simple("Claim", "claimPayout")}>
              Claim {fmt(claimable, decimals)} {symbol}
            </button>
          )}
        </div>
        {me && balance !== undefined && (
          <p className="muted small">
            Your balance: {fmt(balance, decimals)} {symbol}
            {faucetUrl && <> · <a href={faucetUrl} target="_blank" rel="noreferrer">faucet ↗</a></>}
          </p>
        )}
        {tx.status && <p className="muted">{tx.status}</p>}
        {tx.error && <p className="error">{tx.error}</p>}
      </div>

      <div className="grid2">
        <div className="card">
          <h2>Members</h2>
          {members.length === 0 && <p className="muted">Nobody has joined yet. Share the invite link.</p>}
          <table>
            <thead><tr><th>Member</th><th>Collateral</th>{active && <th>Round {round + 1}</th>}<th></th></tr></thead>
            <tbody>
              {members.map((m) => {
                const info = infos.get(m);
                return (
                  <tr key={m}>
                    <td>
                      {explorerUrl ? <a href={`${explorerUrl}/address/${m}`} target="_blank" rel="noreferrer">{short(m)}</a> : short(m)}
                      {m.toLowerCase() === me?.toLowerCase() && <span className="muted"> (you)</span>}
                    </td>
                    <td>{info ? `${fmt(info.collateral, decimals)}` : "…"}</td>
                    {active && <td>{info?.exited ? "—" : paidInRound(round, m) ? "✅ paid" : "⏳ pending"}</td>}
                    <td>
                      {info?.defaulted && <span className="pill bad">defaulter ×{info.missedPayments}</span>}
                      {info?.exited && <span className="pill">exited</span>}
                      {info?.receivedPayout && <span className="pill s2">paid out</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2>Rounds</h2>
          {order.length === 0 ? (
            <p className="muted">The payout order is fixed when the creator starts the circle.</p>
          ) : (
            <table>
              <thead><tr><th>#</th><th>Recipient</th><th>Paid in</th><th>State</th></tr></thead>
              <tbody>
                {order.map((r, i) => {
                  const done = circle.status === 2 || i < round;
                  const current = active && i === round;
                  const paidCount = i < roundsSoFar ? members.filter((m) => paidInRound(i, m)).length : 0;
                  return (
                    <tr key={i} className={current ? "current" : ""}>
                      <td>{i + 1}</td>
                      <td>{short(r)}{r.toLowerCase() === me?.toLowerCase() && <span className="muted"> (you)</span>}</td>
                      <td>{i < roundsSoFar ? `${paidCount}/${circle.activeMembers}` : "—"}</td>
                      <td>{done ? "Paid out" : current ? "In progress" : "Upcoming"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <History circleId={id} decimals={decimals} symbol={symbol} />
    </>
  );
}
