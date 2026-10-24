import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/core"; // avoids bundling every optional connector SDK
import { anvil, arc, arcTestnet, mezoTestnet } from "./chains";
import type { Address, Chain } from "viem";

type ChainKey = "mezoTestnet" | "arc" | "arcTestnet" | "anvil";

const CHAINS: Record<ChainKey, { chain: Chain; defaultToken?: Address; tokenLabel: string; faucet?: string }> = {
  mezoTestnet: {
    chain: mezoTestnet,
    defaultToken: "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503", // MUSD (Mezo docs, contracts reference)
    tokenLabel: "MUSD",
    faucet: "https://faucet.test.mezo.org/",
  },
  arc: {
    chain: arc,
    defaultToken: "0x3600000000000000000000000000000000000000", // USDC ERC-20 interface, 6 decimals
    tokenLabel: "USDC",
  },
  arcTestnet: {
    chain: arcTestnet,
    defaultToken: "0x3600000000000000000000000000000000000000",
    tokenLabel: "USDC",
    faucet: "https://faucet.circle.com",
  },
  anvil: { chain: anvil, tokenLabel: "mock token" },
};

const key = (process.env.NEXT_PUBLIC_CHAIN || "mezoTestnet") as ChainKey;
const selected = CHAINS[key] ?? CHAINS.mezoTestnet;

export const chain = selected.chain;
export const chainKey = key;
export const tokenLabel = selected.tokenLabel;
export const faucetUrl = selected.faucet;
export const defaultToken = (process.env.NEXT_PUBLIC_DEFAULT_TOKEN || selected.defaultToken || "") as Address | "";
export const ajoAddress = (process.env.NEXT_PUBLIC_AJO_ADDRESS || "") as Address | "";
export const deployBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0];

export const explorerUrl = chain.blockExplorers?.default.url;

export const wagmiConfig = createConfig({
  chains: [chain],
  connectors: [injected()],
  transports: { [chain.id]: http(rpcUrl) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
