"use client";
import { useState } from "react";
import { useConfig, useWriteContract } from "wagmi";
import { getAccount, readContract, waitForTransactionReceipt } from "wagmi/actions";
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
    const r = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    if (r.status !== "success") throw new Error(`${label} reverted`);
    return r;
  }

  /** Fresh on-chain allowance of the connected wallet for the AjoCircle contract. */
  async function readAllowance(token: Address): Promise<bigint> {
    const owner = getAccount(config).address;
    if (!owner) throw new Error("Connect your wallet first");
    return readContract(config, { address: token, abi: erc20Abi, functionName: "allowance", args: [owner, ajoAddress as Address] });
  }

  /**
   * Approval rule (every flow that moves tokens goes through here):
   *  1. read the allowance fresh from the chain, not from a possibly stale UI value;
   *  2. approve the EXACT amount (never unlimited);
   *  3. wait for 1 confirmation and require status "success" before returning;
   *  4. re-read the allowance and require it to cover the amount before the caller sends the dependent tx.
   * The dependent transaction is only sent after this function resolves.
   */
  async function approveIfNeeded(token: Address, amount: bigint, current: bigint | undefined) {
    let have = current;
    try {
      have = await readAllowance(token);
    } catch (e) {
      if (current === undefined) throw e;
    }
    if (have !== undefined && have >= amount) return;
    setStatus("Step 1 of 2 · approve the token spend in your wallet…");
    const hash = await writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [ajoAddress as Address, amount],
    });
    setLastHash(hash);
    setStatus("Step 1 of 2 · waiting for the approval to confirm…");
    const r = await waitForTransactionReceipt(config, { hash, confirmations: 1 });
    if (r.status !== "success") throw new Error("Approve reverted");
    // Refetch the allowance after the approval confirmed. A load balanced RPC node can lag a block behind
    // the node that served the receipt, so retry briefly before giving up.
    setStatus("Step 1 of 2 · checking the new allowance…");
    let after = 0n;
    for (let i = 0; i < 6; i++) {
      after = await readAllowance(token);
      if (after >= amount) break;
      await new Promise((res) => setTimeout(res, 1000));
    }
    if (after < amount) throw new Error("The approval confirmed but the allowance did not update yet. Wait a few seconds and try again.");
    void qc.invalidateQueries({ queryKey: ["readContracts"] });
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
