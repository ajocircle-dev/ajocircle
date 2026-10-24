import { BaseError, ContractFunctionRevertedError } from "viem";

const REVERTS: Record<string, string> = {
  InvalidParams: "Those circle settings aren't valid. Check the amount, member count and round length.",
  NotCreator: "Only the circle's creator can do that.",
  WrongStatus: "The circle isn't in the right state for that anymore. The page will refresh.",
  CircleFull: "This circle is already full.",
  AlreadyMember: "You're already a member of this circle.",
  NotMember: "Only members of this circle can do that.",
  NotFull: "The circle needs every seat filled before it can start.",
  AlreadyPaid: "You've already paid for this round.",
  RoundNotOver: "This round's deadline hasn't passed yet.",
  MemberHasExited: "You've exited this circle.",
  AlreadyReceivedPayout: "You've already received your payout.",
  NothingToClaim: "There's nothing to claim right now.",
  UnknownCircle: "That circle doesn't exist.",
  AdapterShortfall: "The yield vault couldn't return enough funds. Try again shortly.",
};

type Codeish = { code?: number; name?: string; shortMessage?: string; message?: string; cause?: unknown };

function find(e: unknown, pred: (x: Codeish) => boolean): Codeish | undefined {
  let cur = e as Codeish | undefined;
  for (let i = 0; cur && i < 12; i++) {
    if (pred(cur)) return cur;
    cur = cur.cause as Codeish | undefined;
  }
  return undefined;
}

/** Turn wallet / viem / RPC errors into a sentence a person can act on. */
export function friendlyError(e: unknown): string {
  const all = () => {
    const parts: string[] = [];
    find(e, (x) => {
      parts.push(`${x.name ?? ""} ${x.shortMessage ?? ""} ${x.message ?? ""}`);
      return false;
    });
    return parts.join(" ").toLowerCase();
  };
  const text = all();

  if (find(e, (x) => x.code === 4001 || x.name === "UserRejectedRequestError") || /user (rejected|denied)|rejected the request|user cancel/.test(text))
    return "You cancelled the request in your wallet. Nothing was sent.";
  if (find(e, (x) => x.code === -32002) || /already pending|request of type .* already pending/.test(text))
    return "Your wallet already has a request waiting. Open your wallet extension to approve or reject it.";
  if (find(e, (x) => x.name === "ProviderNotFoundError") || /provider not found/.test(text))
    return "No browser wallet found. Install MetaMask or Rabby, or open this site in your wallet's browser.";
  if (find(e, (x) => x.name === "ChainMismatchError" || x.name === "ConnectorChainMismatchError") || /chain mismatch|does not match the target chain/.test(text))
    return "Your wallet is on a different network. Switch to Mezo Testnet and try again.";
  if (/insufficient funds|exceeds balance|gas required exceeds/.test(text))
    return "Not enough testnet BTC to pay for gas. Top up from the Mezo faucet and try again.";
  if (/erc20insufficientbalance|transfer amount exceeds balance/.test(text))
    return "Not enough MUSD in your wallet for this payment.";
  if (/erc20insufficientallowance|insufficient allowance/.test(text))
    return "The token approval didn't go through. Try again and approve the spend in your wallet.";
  if (find(e, (x) => x.name === "ConnectorNotConnectedError") || /connector not connected/.test(text))
    return "Connect your wallet first.";

  if (e instanceof BaseError) {
    const rev = e.walk((x) => x instanceof ContractFunctionRevertedError) as ContractFunctionRevertedError | null;
    const name = rev?.data?.errorName;
    if (name && REVERTS[name]) return REVERTS[name];
    if (name) return `The contract rejected this (${name}).`;
    if (rev) return "The contract rejected this transaction.";
  }
  if (/reverted/.test(text)) return "The transaction was reverted onchain. Nothing changed. Refresh and try again.";
  if (/timeout|timed out|network|fetch failed|failed to fetch/.test(text))
    return "Couldn't reach the Mezo testnet RPC. Check your connection and try again.";

  const raw = (e as Codeish)?.shortMessage || (e as Error)?.message || "Something went wrong.";
  const first = raw.split("\n")[0];
  return first.length > 160 ? `${first.slice(0, 157)}…` : first;
}

export const isUserRejection = (e: unknown) => /cancelled the request/.test(friendlyError(e));
