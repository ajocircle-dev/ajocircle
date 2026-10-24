"use client";
import { useReadContract } from "wagmi";
import type { Address } from "viem";
import { ajoAbi } from "@/lib/abi";
import { ajoAddress, chain, tokenLabel } from "@/lib/config";

export function LiveStats() {
  const { data: count, isLoading } = useReadContract({
    address: ajoAddress as Address,
    abi: ajoAbi,
    functionName: "circleCount",
    query: { enabled: !!ajoAddress, refetchInterval: 30_000 },
  });
  return (
    <dl className="live">
      <div><dt>Circles onchain</dt><dd>{isLoading ? <span className="skeleton inline" /> : (count ?? 0n).toString()}</dd></div>
      <div><dt>Network</dt><dd>{chain.name}</dd></div>
      <div><dt>Savings token</dt><dd>{tokenLabel}</dd></div>
      <div><dt>Custody</dt><dd>Smart contract</dd></div>
    </dl>
  );
}
