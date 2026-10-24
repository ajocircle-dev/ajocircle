"use client";
import { useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { erc20Abi, type Address, type Hash } from "viem";
import { ajoAbi } from "./abi";
import { ajoAddress, explorerUrl } from "./config";
import { friendlyError, isUserRejection } from "./errors";
import { useToast } from "@/components/Toasts";

const txLink = (hash?: Hash) => (hash && explorerUrl ? { href: `${explorerUrl}/tx/${hash}`, label: "View transaction" } : undefined);

/**
 * Helper around writeContract: tracks which action is running (for per-button spinners),
 * a step message, waits for receipts, shows readable toasts and refreshes reads.
 */
export function useTx() {
  const config = useConfig();
  const qc = useQueryClient();
  const toast = useToast();
  const { writeContractAsync } = useWriteContract();
  const [action, setAction] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [lastHash, setLastHash] = useState<Hash>();

  async function send(label: string, fn: string, args: readonly unknown[]) {
    setStatus(`${label}: confirm in your wallet…`);
    const hash = await writeContractAsync({
      address: ajoAddress as Address,
      abi: ajoAbi,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      functionName: fn as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
    });
    setLastHash(hash);
    setStatus(`${label}: waiting for the network to confirm…`);
    const r = await waitForTransactionReceipt(config, { hash });
    if (r.status !== "success") throw new Error(`${label} reverted`);
    return r;
  }

  async function approveIfNeeded(token: Address, amount: bigint, current: bigint | undefined) {
    if (current !== undefined && current >= amount) return;
    setStatus("Step 1 of 2 · approve the token spend in your wallet…");
    const hash = await writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [ajoAddress as Address, amount],
    });
    setLastHash(hash);
    setStatus("Step 1 of 2 · waiting for the approval to confirm…");
    const r = await waitForTransactionReceipt(config, { hash });
    if (r.status !== "success") throw new Error("Approve reverted");
  }

  /** `label` names the action ("Join", "Contribute"…); buttons compare it with `action` to show a spinner. */
  async function run<T extends { transactionHash?: Hash } | undefined>(label: string, work: () => Promise<T>, successText?: string) {
    setAction(label);
    setError("");
    setLastHash(undefined);
    try {
      const out = await work();
      setStatus("");
      toast.push({ kind: "success", title: successText ?? `${label} confirmed`, link: txLink(out?.transactionHash) });
      await qc.invalidateQueries();
      return out;
    } catch (e) {
      const msg = friendlyError(e);
      setError(isUserRejection(e) ? "" : msg);
      setStatus("");
      toast.push({ kind: isUserRejection(e) ? "info" : "error", title: isUserRejection(e) ? `${label} cancelled` : `${label} failed`, body: msg });
    } finally {
      setAction("");
    }
  }

  return { busy: !!action, action, status, error, lastHash, send, approveIfNeeded, run };
}
