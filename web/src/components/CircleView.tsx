"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { erc20Abi, type Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress, chain, explorerUrl, faucetUrl } from "@/lib/config";
import { STATUS, duration, fmt, short } from "@/lib/format";
import { useTx } from "@/lib/useTx";
import { History } from "./History";
import { InviteCard } from "./InviteCard";
import { TxButton } from "./TxButton";
import { useWallet } from "./Wallet";
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
  if (secs <= 0) return "Deadline passed, awaiting settle";
  const d = Math.floor(secs / 86400), h = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
  return d > 0 ? `${d}d ${h}h ${m}m left` : `${h}h ${m}m ${s}s left`;
}

export function CircleView({ id }: { id: bigint }) {
  const { address: me } = useAccount();
  const tx = useTx();
  const now = useNow();
  const wallet = useWallet();

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
    ],
    query: { enabled: !!circle, staleTime: Infinity },
  });
  const symbol = (tokenMeta?.[0]?.result as string) ?? "";
  const decimals = (tokenMeta?.[1]?.result as number) ?? 18;
  // Wallet-specific reads only run when a wallet is connected; read-only visitors never need them.
  const { data: mineMeta } = useReadContracts({
    contracts: [
      { address: circle?.token, abi: erc20Abi, functionName: "allowance", args: [me!, ajoAddress as Address] },
      { address: circle?.token, abi: erc20Abi, functionName: "balanceOf", args: [me!] },
    ],
    query: { enabled: !!circle && !!me, refetchInterval: 10_000 },
  });
  const allowance = mineMeta?.[0]?.result as bigint | undefined;
  const balance = mineMeta?.[1]?.result as bigint | undefined;

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
  if (isLoading)
    return (
      <div className="card skeleton-card" aria-busy="true">
        <div className="skeleton w40" />
        <div className="skeleton w25" />
        <div className="stats">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h48" />)}</div>
        <p className="muted small">Loading circle #{id.toString()} from {chain.name}…</p>
      </div>
    );
  const notFound = !error && circle && circle.creator === "0x0000000000000000000000000000000000000000";
  if (error || !circle || notFound)
    return (
      <div className="card empty">
        <h1>Circle #{id.toString()} not found</h1>
        <p className="muted">
          {error ? `We couldn't read it from ${chain.name}. Check your connection and refresh.` : `There's no circle with that number on ${chain.name} yet.`}
        </p>
        <Link className="btn" href="/">Back to home</Link>
      </div>
    );

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

  const seatsLeft = Math.max(0, circle.maxMembers - members.length);
  const full = circle.status === 0 && seatsLeft === 0;

  const join = () =>
    tx.run("Join", async () => {
      if (circle.requireCollateral) await tx.approveIfNeeded(circle.token, amount, allowance);
      return tx.send("Join", "join", [id]);
    }, `You joined ${circle.name || `circle #${id}`}`);
  const contribute = () =>
    tx.run("Contribute", async () => {
      await tx.approveIfNeeded(circle.token, amount, allowance);
      return tx.send("Contribute", "contribute", [id]);
    }, `Paid ${fmt(amount, decimals)} ${symbol} for round ${circle.currentRound + 1}`);
  const simple = (label: string, fn: string, confirmText?: string) => () => {
    if (confirmText && !window.confirm(confirmText)) return;
    tx.run(label, () => tx.send(label, fn, [id]));
  };
  const lowBalance = balance !== undefined && balance < amount;

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

        {circle.status === 0 && (
          full ? (
            <div className="callout ok" role="status">
              <strong>Circle full · {members.length}/{circle.maxMembers} members</strong>
              <span className="muted small">
                {isCreator ? "Everyone's in. Start the circle to fix the payout order and open round 1." : "All seats are taken. Waiting for the creator to start the circle."}
              </span>
            </div>
          ) : (
            <div className="callout" role="status">
              <strong>{seatsLeft} of {circle.maxMembers} seat{circle.maxMembers === 1 ? "" : "s"} open</strong>
              <span className="muted small">
                Anyone with the link can join by signing one transaction{circle.requireCollateral ? ` and posting ${fmt(amount, decimals)} ${symbol} collateral` : ""}.
              </span>
            </div>
          )
        )}
        {circle.status === 3 && <div className="callout bad"><strong>This circle was cancelled.</strong><span className="muted small">All collateral was refunded.</span></div>}
        {circle.status === 2 && <div className="callout ok"><strong>Circle completed 🎉</strong><span className="muted small">Every member received the pot once. See the history below.</span></div>}

        <div className="actions">
          {circle.status === 0 && !isMember && !full && (
            <TxButton
              id="Join" current={tx.action} busy={tx.busy} onRun={join}
              busyText={tx.status.startsWith("Step 1") ? "Approving…" : "Joining…"}
              needsWalletText="Connect wallet to join"
              disabled={lowBalance && circle.requireCollateral}
              disabledReason={`You need ${fmt(amount, decimals)} ${symbol} for collateral`}
            >
              {circle.requireCollateral ? `Approve & join (${fmt(amount, decimals)} ${symbol} collateral)` : "Join circle"}
            </TxButton>
          )}
          {me && circle.status === 0 && isMember && (
            <TxButton id="Leave" variant="ghost" current={tx.action} busy={tx.busy} onRun={simple("Leave", "leave")} busyText="Leaving…">
              Leave (refund)
            </TxButton>
          )}
          {isCreator && circle.status === 0 && (
            <>
              <TxButton
                id="Start" current={tx.action} busy={tx.busy} onRun={simple("Start", "start")} busyText="Starting…"
                disabled={!full} disabledReason="Every seat must be filled first"
              >
                {full ? "Start circle" : `Start (needs ${seatsLeft} more)`}
              </TxButton>
              <TxButton id="Cancel" variant="ghost" current={tx.action} busy={tx.busy} onRun={simple("Cancel", "cancelCircle", "Cancel this circle and refund everyone?")} busyText="Cancelling…">
                Cancel circle
              </TxButton>
            </>
          )}
          {active && isMember && !mine?.exited && !iPaid && (
            <TxButton
              id="Contribute" current={tx.action} busy={tx.busy} onRun={contribute}
              busyText={tx.status.startsWith("Step 1") ? "Approving…" : "Paying…"}
              disabled={lowBalance} disabledReason={`Your balance is below ${fmt(amount, decimals)} ${symbol}`}
            >
              {allowance !== undefined && allowance >= amount ? "" : "Approve & "}Contribute {fmt(amount, decimals)} {symbol}
            </TxButton>
          )}
          {active && iPaid && <span className="pill s2">You paid this round ✓</span>}
          {pastDeadline && (
            <TxButton id="Settle round" variant="warn" current={tx.action} busy={tx.busy} onRun={simple("Settle round", "settleRound")} busyText="Settling…" needsWalletText="Connect wallet to settle">
              Settle round (slash missed payments)
            </TxButton>
          )}
          {active && isMember && !mine?.exited && !mine?.receivedPayout && (
            <TxButton id="Exit" variant="ghost" current={tx.action} busy={tx.busy} onRun={simple("Exit", "exitCircle", "Exiting forfeits your collateral and your payout turn. Continue?")} busyText="Exiting…">
              Exit early
            </TxButton>
          )}
          {claimable !== undefined && claimable > 0n && (
            <TxButton id="Claim" current={tx.action} busy={tx.busy} onRun={simple("Claim", "claimPayout")} busyText="Claiming…">
              Claim {fmt(claimable, decimals)} {symbol}
            </TxButton>
          )}
        </div>
        {!me && wallet.hasWallet === false && (
          <p className="muted small">
            You&apos;re viewing this circle read-only. To join or pay you need a browser wallet.{" "}
            <button className="linklike" onClick={wallet.showHelp}>How to get one</button>
          </p>
        )}
        {!me && wallet.hasWallet !== false && circle.status !== 0 && (
          <p className="muted small">Read-only view. Connect a wallet if you&apos;re a member of this circle.</p>
        )}
        {me && balance !== undefined && (
          <p className={`small ${lowBalance ? "error" : "muted"}`}>
            Your balance: {fmt(balance, decimals)} {symbol}
            {lowBalance && ` · you need at least ${fmt(amount, decimals)} ${symbol}`}
            {faucetUrl && <> · <a href={faucetUrl} target="_blank" rel="noreferrer">BTC faucet ↗</a></>}
          </p>
        )}
        {tx.status && <p className="muted small"><span className="spinner" aria-hidden /> {tx.status}</p>}
        {tx.error && <p className="error small">{tx.error}</p>}
      </div>

      {circle.status === 0 && (
        <InviteCard id={id} name={circle.name} seatsLeft={seatsLeft} maxMembers={circle.maxMembers} contribution={`${fmt(amount, decimals)} ${symbol}`} />
      )}

      <div className="grid2">
        <div className="card">
          <h2>Members</h2>
          {members.length === 0 && <p className="muted">Nobody has joined yet. Share the invite link above.</p>}
          <div className="table-wrap"><table>
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
                    {active && <td>{info?.exited ? "n/a" : paidInRound(round, m) ? "✅ paid" : "⏳ pending"}</td>}
                    <td>
                      {info?.defaulted && <span className="pill bad">defaulter ×{info.missedPayments}</span>}
                      {info?.exited && <span className="pill">exited</span>}
                      {info?.receivedPayout && <span className="pill s2">paid out</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
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
                      <td>{i < roundsSoFar ? `${paidCount}/${circle.activeMembers}` : "n/a"}</td>
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
