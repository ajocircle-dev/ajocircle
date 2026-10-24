"use client";
import { useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address } from "viem";
import { ajoAbi } from "./abi";
import { ajoAddress } from "./config";

/** Small helper around writeContract: tracks a status message, waits for receipts, refreshes reads. */
export function useTx() {
  const config = useConfig();
  const qc = useQueryClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function send(label: string, fn: string, args: readonly unknown[]) {
    setStatus(`${label}: confirm in wallet…`);
    const hash = await writeContractAsync({
      address: ajoAddress as Address,
      abi: ajoAbi,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      functionName: fn as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
    });
    setStatus(`${label}: waiting for confirmation…`);
    const r = await waitForTransactionReceipt(config, { hash });
    if (r.status !== "success") throw new Error(`${label} reverted`);
    return r;
  }

  async function approveIfNeeded(token: Address, owner: Address, amount: bigint, current: bigint | undefined) {
    if (current !== undefined && current >= amount) return;
    setStatus("Approve: confirm in wallet…");
    const hash = await writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [ajoAddress as Address, amount],
    });
    setStatus("Approve: waiting for confirmation…");
    await waitForTransactionReceipt(config, { hash });
  }

  async function run<T>(work: () => Promise<T>): Promise<T | undefined> {
    setBusy(true);
    setError("");
    try {
      const out = await work();
      setStatus("Done ✓");
      await qc.invalidateQueries();
      return out;
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string }).shortMessage || (e as Error).message;
      setError(msg);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return { busy, status, error, send, approveIfNeeded, run };
}
