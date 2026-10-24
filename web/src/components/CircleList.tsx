"use client";
import Link from "next/link";
import { useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress } from "@/lib/config";
import { STATUS, duration } from "@/lib/format";

export function CircleList() {
  const { data: count } = useReadContract({
    address: ajoAddress as Address,
    abi: ajoAbi,
    functionName: "circleCount",
    query: { enabled: !!ajoAddress },
  });
  const n = Number(count ?? 0n);
  const ids = Array.from({ length: Math.min(n, 20) }, (_, i) => BigInt(n - i));
  const { data } = useReadContracts({
    contracts: ids.map((id) => ({
      address: ajoAddress as Address,
      abi: ajoAbi,
      functionName: "getCircle" as const,
      args: [id] as const,
    })),
    query: { enabled: ids.length > 0 },
  });

  return (
    <div className="card">
      <h2>Recent circles</h2>
      {n === 0 && <p className="muted">No circles yet. Start the first one.</p>}
      <ul className="list">
        {ids.map((id, i) => {
          const c = data?.[i]?.result as
            | { name: string; status: number; maxMembers: number; activeMembers: number; roundLength: bigint }
            | undefined;
          return (
            <li key={id.toString()}>
              <Link href={`/circle/${id}`}>
                <strong>#{id.toString()} {c?.name ?? "…"}</strong>
                {c && (
                  <span className="muted">
                    {STATUS[c.status]} · {c.maxMembers} members · every {duration(Number(c.roundLength))}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
