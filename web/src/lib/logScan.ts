import type { Address } from "viem";
import { ajoAddress, chain, deployBlock } from "./config";

/** Block-range limit measured on https://rpc.test.mezo.org: eth_getLogs allows to - from <= 10000 (10001 blocks). Larger spans are
 *  rejected with "maximum [from, to] blocks distance: 10000". Other chains start from the same size and split on a range error. */
const snapshotUrl = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logs-snapshot.json`;

export const scanOptions = () => ({
  chainId: chain.id,
  address: ajoAddress as Address,
  deployBlock,
  snapshotUrl,
});
