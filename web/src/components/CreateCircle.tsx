"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useReadContracts } from "wagmi";
import { decodeEventLog, erc20Abi, isAddress, parseUnits, type Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { defaultToken } from "@/lib/config";
import { useTx } from "@/lib/useTx";

const UNITS = { minutes: 60, hours: 3600, days: 86400 } as const;

export function CreateCircle() {
  const router = useRouter();
  const { isConnected } = useAccount();
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || decimals === undefined) return;
    const receipt = await tx.run(() =>
      tx.send("Create circle", "createCircle", [
        token,
        parseUnits(amount, decimals),
        members,
        BigInt(roundLen * UNITS[unit]),
        random,
        collateral,
        name,
      ]),
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
    <form className="card" onSubmit={submit}>
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
      <button className="btn" disabled={!isConnected || !valid || decimals === undefined || tx.busy}>
        {isConnected ? "Create circle" : "Connect a wallet first"}
      </button>
      {tx.status && <p className="muted">{tx.status}</p>}
      {tx.error && <p className="error">{tx.error}</p>}
    </form>
  );
}
