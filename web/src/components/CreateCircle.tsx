"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReadContracts } from "wagmi";
import { decodeEventLog, erc20Abi, isAddress, parseUnits, type Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { defaultToken } from "@/lib/config";
import { useTx } from "@/lib/useTx";
import { TxButton } from "./TxButton";

const UNITS = { minutes: 60, hours: 3600, days: 86400 } as const;

export function CreateCircle() {
  const router = useRouter();
  const tx = useTx();
  const [name, setName] = useState("Family Ajo");
  const [token, setToken] = useState<string>(defaultToken);
  const [amount, setAmount] = useState("50");
  const [members, setMembers] = useState(5);
  const [roundLen, setRoundLen] = useState(7);
  const [unit, setUnit] = useState<keyof typeof UNITS>("days");
  const [random, setRandom] = useState(false);
  const [collateral, setCollateral] = useState(true);

  const valid = isAddress(token);
  const { data: meta } = useReadContracts({
    contracts: [
      { address: token as Address, abi: erc20Abi, functionName: "symbol" },
      { address: token as Address, abi: erc20Abi, functionName: "decimals" },
    ],
    query: { enabled: valid },
  });
  const symbol = meta?.[0]?.result as string | undefined;
  const decimals = meta?.[1]?.result as number | undefined;

  const amountOk = /^\d+(\.\d+)?$/.test(amount) && Number(amount) > 0;
  const membersOk = members >= 2 && members <= 50;
  const roundOk = roundLen >= 1;
  const problem = !valid
    ? "Enter a valid token address"
    : decimals === undefined
      ? "Reading token…"
      : !amountOk
        ? "Enter a contribution above 0"
        : !membersOk
          ? "Members must be 2 to 50"
          : !roundOk
            ? "Round length must be at least 1"
            : "";

  async function submit() {
    if (problem || decimals === undefined) return;
    const receipt = await tx.run("Create circle", () =>
      tx.send("Create circle", "createCircle", [
        token,
        parseUnits(amount, decimals),
        members,
        BigInt(roundLen * UNITS[unit]),
        random,
        collateral,
        name,
      ]),
      `"${name}" created`,
    );
    if (!receipt) return;
    for (const log of receipt.logs) {
      try {
        const ev = decodeEventLog({ abi: ajoAbi, data: log.data, topics: log.topics });
        if (ev.eventName === "CircleCreated") {
          router.push(`/circle/?id=${(ev.args as { circleId: bigint }).circleId.toString()}`);
          return;
        }
      } catch {}
    }
  }

  return (
    <form className="card" id="create" onSubmit={(e) => { e.preventDefault(); }}>
      <h2>Start a circle</h2>
      <label>
        Name
        <input value={name} maxLength={64} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Stablecoin address {symbol && <span className="pill">{symbol}</span>}
        <input value={token} onChange={(e) => setToken(e.target.value.trim())} placeholder="0x…" />
      </label>
      <div className="row">
        <label>
          Contribution per round
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
        </label>
        <label>
          Members
          <input type="number" min={2} max={50} value={members} onChange={(e) => setMembers(+e.target.value)} />
        </label>
      </div>
      <div className="row">
        <label>
          Round length
          <input type="number" min={1} value={roundLen} onChange={(e) => setRoundLen(+e.target.value)} />
        </label>
        <label>
          Unit
          <select value={unit} onChange={(e) => setUnit(e.target.value as keyof typeof UNITS)}>
            <option value="minutes">minutes</option>
            <option value="hours">hours</option>
            <option value="days">days</option>
          </select>
        </label>
      </div>
      <label className="check">
        <input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} />
        Randomize payout order at start (otherwise join order)
      </label>
      <label className="check">
        <input type="checkbox" checked={collateral} onChange={(e) => setCollateral(e.target.checked)} />
        Require collateral (one contribution, returned at the end, slashed if a payment is missed)
      </label>
      <p className="muted">
        Each round everyone pays {amount || "0"} {symbol ?? ""}; the pot of{" "}
        {(Number(amount || 0) * members).toLocaleString()} {symbol ?? ""} goes to that round&apos;s recipient.
      </p>
      <TxButton
        id="Create circle" current={tx.action} busy={tx.busy} onRun={submit}
        busyText="Creating…" needsWalletText="Connect wallet to create"
        disabled={!!problem} disabledReason={problem}
      >
        {problem && problem !== "Reading token…" ? problem : "Create circle"}
      </TxButton>
      {tx.status && <p className="muted small"><span className="spinner" aria-hidden /> {tx.status}</p>}
      {tx.error && <p className="error small">{tx.error}</p>}
    </form>
  );
}
