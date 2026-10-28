"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { chain, defaultToken, explorerUrl, tokenLabel } from "@/lib/config";
import { fmt, short } from "@/lib/format";
import { useDashboard, type Row } from "@/lib/useDashboard";
import { useWallet, Spinner } from "./Wallet";

type StatusKey = "open" | "active" | "completed" | "cancelled";
const STATUS_KEYS: StatusKey[] = ["open", "active", "completed", "cancelled"];
const STATUS_LABEL: Record<StatusKey, string> = { open: "Open", active: "Active", completed: "Completed", cancelled: "Cancelled" };
type Filter = "all" | StatusKey | "defaulted";
type SortKey = "id" | "name" | "contribution" | "members" | "round" | "pot" | "deadline" | "status";

const ZERO = "0x0000000000000000000000000000000000000000";

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function rel(secs: number) {
  const a = Math.abs(secs);
  const d = Math.floor(a / 86400), h = Math.floor((a % 86400) / 3600), m = Math.floor((a % 3600) / 60), s = a % 60;
  const txt = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  return `in ${txt}`;
}
const localTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const sym = (r: Row) => (defaultToken && r.c.token.toLowerCase() === defaultToken.toLowerCase() ? tokenLabel : short(r.c.token));
const statusKey = (r: Row): StatusKey => STATUS_KEYS[r.c.status] ?? "open";
const potSize = (r: Row) => r.c.contributionAmount * BigInt(r.c.status === 0 ? r.c.maxMembers : r.c.activeMembers);
const nextRecipient = (r: Row) => (r.c.status === 1 ? r.recipient ?? r.order[r.c.currentRound] : undefined);
const roundOf = (r: Row) => (r.c.status === 1 ? r.c.currentRound + 1 : r.c.status === 2 ? r.c.maxMembers : 0);

export function Dashboard() {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useDashboard();
  const { address: me } = useAccount();
  const now = useNow();
  const [tab, setTab] = useState<"all" | "mine">("all");

  useEffect(() => {
    if (window.location.hash === "#mine") setTab("mine");
  }, []);

  return (
    <div className="dash">
      <div className="page-head dash-head">
        <div>
          <span className="kicker">Dashboard</span>
          <h1>Every circle on {chain.name}</h1>
          <p className="muted">
            Live from the AjoCircle contract over the public RPC. No wallet needed to look around.
          </p>
        </div>
        <div className="dash-head-actions">
          <span className="muted small" aria-live="polite">
            {isFetching ? <><Spinner /> Refreshing…</> : dataUpdatedAt ? `Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ""}
          </span>
          <Link className="btn" href="/create/">+ New circle</Link>
        </div>
      </div>

      {error && !data ? (
        <div className="card empty" role="alert">
          <h2>Couldn&apos;t load circles</h2>
          <p className="muted">We couldn&apos;t reach the {chain.name} RPC. Check your connection, then try again.</p>
          <p className="muted small">{(error as Error).message.split("\n")[0].slice(0, 160)}</p>
          <button className="btn" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <><Spinner /> Retrying…</> : "Retry"}
          </button>
        </div>
      ) : (
        <>
          <Summary rows={data?.rows} loading={isLoading} now={now} />
          <div className="tabs" role="tablist" aria-label="Circle lists">
            <button role="tab" aria-selected={tab === "all"} className={tab === "all" ? "on" : ""} onClick={() => setTab("all")}>
              All circles {data && <span className="count">{data.rows.length}</span>}
            </button>
            <button role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>
              My circles {data && me && <span className="count">{mineOf(data.rows, me).length}</span>}
            </button>
          </div>
          {tab === "all" ? (
            <AllCircles rows={data?.rows} loading={isLoading} now={now} />
          ) : (
            <MyCircles rows={data?.rows} loading={isLoading} now={now} />
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- summary ---------------- */

function Summary({ rows, loading, now }: { rows?: Row[]; loading: boolean; now: number }) {
  const s = useMemo(() => {
    if (!rows) return null;
    const musd = rows.filter((r) => sym(r) === tokenLabel);
    const contributed = musd.reduce((a, r) => a + r.contributed, 0n);
    const locked = musd.reduce((a, r) => a + r.collateralLocked, 0n);
    const people = new Set<string>();
    rows
      .filter((r) => r.c.status === 0 || r.c.status === 1)
      .forEach((r) => r.members.forEach((m) => { const i = r.info[m.toLowerCase()]; if (i?.joined && !i.exited) people.add(m.toLowerCase()); }));
    const payouts = rows.reduce((a, r) => a + r.payouts, 0);
    const next = rows.filter((r) => r.c.status === 1).sort((a, b) => Number(a.c.roundDeadline - b.c.roundDeadline))[0];
    return { contributed, locked, people: people.size, payouts, next, total: rows.length };
  }, [rows]);

  if (loading || !s)
    return (
      <div className="sum-grid" aria-busy="true">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="sum-card"><div className="skeleton w40" /><div className="skeleton" /></div>
        ))}
      </div>
    );

  const n = s.next;
  const dl = n ? Number(n.c.roundDeadline) : 0;
  return (
    <div className="sum-grid">
      <div className="sum-card">
        <span className="sum-label">Total circles</span>
        <strong className="sum-val">{s.total}</strong>
        <span className="muted small">created onchain</span>
      </div>
      <div className="sum-card orange">
        <span className="sum-label">Total {tokenLabel} saved</span>
        <strong className="sum-val">{fmt(s.contributed + s.locked, 18)}</strong>
        <span className="muted small">
          {fmt(s.contributed, 18)} contributed + {fmt(s.locked, 18)} collateral locked
        </span>
      </div>
      <div className="sum-card">
        <span className="sum-label">Active members</span>
        <strong className="sum-val">{s.people}</strong>
        <span className="muted small">unique wallets in open or active circles</span>
      </div>
      <div className="sum-card">
        <span className="sum-label">Payouts made</span>
        <strong className="sum-val">{s.payouts}</strong>
        <span className="muted small">pots sent or credited to recipients</span>
      </div>
      <div className="sum-card next-card">
        <span className="sum-label">Next payout</span>
        {n ? (
          <>
            <strong className="sum-val sm">
              <Link href={`/circle/?id=${n.id}`}>{n.c.name || `Circle #${n.id}`}</Link>
            </strong>
            <span className="small">
              {fmt(potSize(n), 18)} {sym(n)} → <span className="mono">{short(nextRecipient(n))}</span>
            </span>
            <span className={`small ${dl - now < 0 ? "error" : "good"}`}>
              {dl - now < 0 ? `Deadline passed, awaiting settle (${localTime(dl)})` : `${rel(dl - now)} · ${localTime(dl)}`}
            </span>
          </>
        ) : (
          <>
            <strong className="sum-val sm">None scheduled</strong>
            <span className="muted small">No circle is active right now.</span>
          </>
        )}
      </div>
    </div>
  );
}

function Deadline({ dl, now }: { dl: number; now: number }) {
  const passed = dl - now < 0;
  return (
    <span className="dl" title={passed ? "Anyone can now settle this round: unpaid members are slashed and the pot is credited to the recipient." : undefined}>
      <span className={passed ? "pill warnpill" : ""}>{passed ? "Deadline passed, awaiting settle" : rel(dl - now)}</span>
      <span className="muted small">{passed ? `was ${localTime(dl)}` : localTime(dl)}</span>
    </span>
  );
}

/* ---------------- all circles ---------------- */

function StatusCell({ r }: { r: Row }) {
  const k = statusKey(r);
  return (
    <span className="status-cell">
      <span className={`pill st-${k}`}>{STATUS_LABEL[k]}</span>
      {r.defaulted && <span className="pill bad" title="At least one member missed a payment and had collateral slashed">Defaulted</span>}
    </span>
  );
}

function AllCircles({ rows, loading, now }: { rows?: Row[]; loading: boolean; now: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "id", dir: -1 });

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, open: 0, active: 0, completed: 0, cancelled: 0, defaulted: 0 };
    rows?.forEach((r) => { c.all++; c[statusKey(r)]++; if (r.defaulted) c.defaulted++; });
    return c;
  }, [rows]);

  const view = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase().replace(/^#/, "");
    const list = rows.filter((r) => {
      if (filter === "defaulted" ? !r.defaulted : filter !== "all" && statusKey(r) !== filter) return false;
      if (!needle) return true;
      return String(r.id) === needle || r.c.name.toLowerCase().includes(needle);
    });
    const val = (r: Row): number | string => {
      switch (sort.k) {
        case "id": return r.id;
        case "name": return r.c.name.toLowerCase();
        case "contribution": return Number(r.c.contributionAmount / 10n ** 12n);
        case "members": return r.members.length / r.c.maxMembers;
        case "round": return roundOf(r);
        case "pot": return Number(potSize(r) / 10n ** 12n);
        case "deadline": return r.c.status === 1 ? Number(r.c.roundDeadline) : Number.MAX_SAFE_INTEGER;
        case "status": return r.c.status * 2 + (r.defaulted ? 1 : 0);
      }
    };
    return [...list].sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : a.id - b.id) * sort.dir;
    });
  }, [rows, filter, q, sort]);

  const th = (k: SortKey, label: string) => (
    <th aria-sort={sort.k === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button className="sort" onClick={() => setSort((s) => ({ k, dir: s.k === k ? ((-s.dir) as 1 | -1) : 1 }))}>
        {label} <span aria-hidden className="sort-i">{sort.k === k ? (sort.dir === 1 ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  const filters: Filter[] = ["all", "open", "active", "completed", "defaulted", ...(counts.cancelled ? (["cancelled"] as Filter[]) : [])];

  return (
    <section className="card dash-card" aria-label="All circles">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by status">
          {filters.map((f) => (
            <button key={f} className={`chip ${filter === f ? "on" : ""} ${f === "defaulted" ? "chip-bad" : ""}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "defaulted" ? "Defaulted" : STATUS_LABEL[f]} <span className="count">{rows ? counts[f] : "…"}</span>
            </button>
          ))}
        </div>
        <input className="search" type="search" placeholder="Search name or #ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search circles by name or ID" />
      </div>

      {loading ? (
        <div aria-busy="true">{Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton row-skel" />)}</div>
      ) : rows && rows.length === 0 ? (
        <div className="empty">
          <h2>No circles yet</h2>
          <p className="muted">Be the first to start one on {chain.name}.</p>
          <Link className="btn" href="/create/">Create a circle</Link>
        </div>
      ) : view.length === 0 ? (
        <div className="empty">
          <h2>No matches</h2>
          <p className="muted">No circle matches that filter{q ? ` and “${q}”` : ""}.</p>
          <button className="btn ghost" onClick={() => { setFilter("all"); setQ(""); }}>Clear filters</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="dtable">
            <thead>
              <tr>
                {th("id", "ID")}{th("name", "Name")}{th("contribution", "Contribution")}{th("members", "Members")}
                {th("round", "Round")}{th("pot", "Pot / round")}<th>Next recipient</th>{th("deadline", "Next deadline")}{th("status", "Status")}<th><span className="sr">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => {
                const rec = nextRecipient(r);
                const dl = Number(r.c.roundDeadline);
                const s = sym(r);
                return (
                  <tr key={r.id}>
                    <td data-label="ID" className="mono">#{r.id}</td>
                    <td data-label="Name" className="name-cell"><Link href={`/circle/?id=${r.id}`}>{r.c.name || `Circle #${r.id}`}</Link></td>
                    <td data-label="Contribution">{fmt(r.c.contributionAmount, 18)} {s}</td>
                    <td data-label="Members">
                      <span className="meter" aria-hidden><span style={{ width: `${(100 * r.members.length) / r.c.maxMembers}%` }} /></span>
                      {r.members.length}/{r.c.maxMembers}
                    </td>
                    <td data-label="Round">{r.c.status === 0 ? `–/${r.c.maxMembers}` : `${roundOf(r)}/${r.c.maxMembers}`}</td>
                    <td data-label="Pot / round">{fmt(potSize(r), 18)} {s}</td>
                    <td data-label="Next recipient" className="mono">
                      {rec && rec !== ZERO ? (explorerUrl ? <a href={`${explorerUrl}/address/${rec}`} target="_blank" rel="noreferrer">{short(rec)}</a> : short(rec)) : <span className="muted">n/a</span>}
                    </td>
                    <td data-label="Next deadline">
                      {r.c.status === 1 ? (
                        <Deadline dl={dl} now={now} />
                      ) : <span className="muted">{r.c.status === 0 ? "Not started" : "n/a"}</span>}
                    </td>
                    <td data-label="Status"><StatusCell r={r} /></td>
                    <td className="go"><Link className="btn ghost small-btn" href={`/circle/?id=${r.id}`}>View →</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ---------------- my circles ---------------- */

function mineOf(rows: Row[], me: string) {
  const m = me.toLowerCase();
  return rows.filter((r) => r.c.creator.toLowerCase() === m || r.members.some((x) => x.toLowerCase() === m));
}

function MyCircles({ rows, loading, now }: { rows?: Row[]; loading: boolean; now: number }) {
  const w = useWallet();
  const { address: me } = useAccount();

  if (!me) {
    const noWallet = w.hasWallet === false;
    return (
      <section className="card empty nowallet-inline">
        <div className="modal-badge" aria-hidden>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M16 13h2.5M2.5 10h19M6 6V4.5A1.5 1.5 0 0 1 7.5 3h9" />
          </svg>
        </div>
        <h2>{noWallet ? "You need a wallet to see your circles" : "Connect your wallet to see your circles"}</h2>
        <p className="muted">
          {noWallet
            ? "We couldn't find a browser wallet. Install MetaMask or Rabby, or on a phone open this page inside your wallet app's browser."
            : "Your circles, payout turn and collateral are tied to your wallet address. Connecting is read-only until you sign something."}
        </p>
        <div className="cta" style={{ justifyContent: "center" }}>
          {noWallet ? (
            <>
              <button className="btn" onClick={w.showHelp}>How to get a wallet</button>
              <a className="btn ghost" href="https://metamask.io/download" target="_blank" rel="noreferrer">Install MetaMask ↗</a>
            </>
          ) : (
            <button className="btn" onClick={() => w.connect()} disabled={w.connecting}>
              {w.connecting ? <><Spinner /> Check your wallet…</> : "Connect wallet"}
            </button>
          )}
        </div>
      </section>
    );
  }

  if (loading || !rows)
    return <section className="card">{Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton row-skel" />)}</section>;

  const mine = mineOf(rows, me);
  if (mine.length === 0)
    return (
      <section className="card empty">
        <h2>You&apos;re not in any circle yet</h2>
        <p className="muted">Wallet <span className="mono">{short(me)}</span> hasn&apos;t created or joined a circle on {chain.name}.</p>
        <div className="cta" style={{ justifyContent: "center" }}>
          <Link className="btn" href="/create/">Create a circle</Link>
          <Link className="btn ghost" href="/circle/?id=1">Open the demo circle</Link>
        </div>
      </section>
    );

  const k = me.toLowerCase();
  return (
    <section className="card dash-card" aria-label="My circles">
      {w.wrongNetwork && <div className="callout" role="status"><strong>Wrong network</strong><span className="muted small">You can read this, but switch to {chain.name} before paying.</span></div>}
      <div className="table-wrap">
        <table className="dtable">
          <thead>
            <tr><th>Circle</th><th>My role</th><th>Status</th><th>Paid this round</th><th>My payout round</th><th>Collateral</th><th>Next deadline</th><th><span className="sr">Open</span></th></tr>
          </thead>
          <tbody>
            {mine.map((r) => {
              const info = r.info[k];
              const isCreator = r.c.creator.toLowerCase() === k;
              const isMember = !!info?.joined;
              const role = isCreator && isMember ? "Creator · member" : isCreator ? "Creator" : "Member";
              const s = sym(r);
              const pos = r.order.findIndex((a) => a.toLowerCase() === k);
              const slashed = r.slashedBy[k];
              const returned = r.returnedTo[k];
              let col: { t: string; cls: string };
              if (!isMember) col = { t: "n/a", cls: "muted" };
              else if (!r.c.requireCollateral) col = { t: "None required", cls: "muted" };
              else if (slashed && info && info.collateral > 0n) col = { t: `Partly slashed (−${fmt(slashed, 18)}) · ${fmt(info.collateral, 18)} locked`, cls: "error" };
              else if (slashed) col = { t: `Slashed (−${fmt(slashed, 18)} ${s})`, cls: "error" };
              else if (info?.exited) col = { t: "Forfeited on exit", cls: "error" };
              else if (info && info.collateral > 0n) col = { t: `Locked · ${fmt(info.collateral, 18)} ${s}`, cls: "" };
              else if (returned) col = { t: `Returned · ${fmt(returned, 18)} ${s}`, cls: "good" };
              else col = { t: "Returned", cls: "good" };
              const paid = r.c.status === 1 && isMember && !info?.exited ? (r.paidNow[k] ? "yes" : "no") : null;
              const dl = Number(r.c.roundDeadline);
              return (
                <tr key={r.id}>
                  <td data-label="Circle" className="name-cell"><Link href={`/circle/?id=${r.id}`}>{r.c.name || `Circle #${r.id}`}</Link> <span className="muted small mono">#{r.id}</span></td>
                  <td data-label="My role">{role}</td>
                  <td data-label="Status"><StatusCell r={r} /></td>
                  <td data-label="Paid this round">
                    {paid === "yes" ? <span className="pill s2">Yes ✓</span> : paid === "no" ? <span className="pill warnpill">No, due</span> : <span className="muted">n/a</span>}
                  </td>
                  <td data-label="My payout round">
                    {!isMember ? <span className="muted">Not a member</span> :
                      r.c.status === 0 ? <span className="muted">Set at start</span> :
                      pos < 0 ? <span className="muted">n/a</span> :
                      <>Round {pos + 1} of {r.c.maxMembers}{info?.receivedPayout ? <span className="pill s2 ml">received</span> : r.c.status === 1 && pos === r.c.currentRound ? <span className="pill orangepill ml">this round</span> : null}</>}
                  </td>
                  <td data-label="Collateral" className={col.cls}>{col.t}</td>
                  <td data-label="Next deadline">{r.c.status === 1 ? <Deadline dl={dl} now={now} /> : <span className="muted">n/a</span>}</td>
                  <td className="go"><Link className="btn ghost small-btn" href={`/circle/?id=${r.id}`}>Open →</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
