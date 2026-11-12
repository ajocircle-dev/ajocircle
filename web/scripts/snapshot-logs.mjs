// Writes public/logs-snapshot.json: every log the AjoCircle contract emitted from the deploy block to the current head.
// A cold visitor loads this file and only scans the blocks after it, instead of the whole history.
// Run before `npm run build` (the deploy steps in README.md do). Read-only: it only calls eth_getLogs.
//   NEXT_PUBLIC_AJO_ADDRESS=0x... NEXT_PUBLIC_DEPLOY_BLOCK=16487793 RPC_URL=https://rpc.test.mezo.org node scripts/snapshot-logs.mjs
import { writeFileSync, mkdirSync } from "node:fs";

const address = process.env.NEXT_PUBLIC_AJO_ADDRESS;
const deployBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "0");
const rpc = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.test.mezo.org";
const CHUNK = 10_001n; // Mezo testnet allows to - from <= 10000
const CONC = 6;
if (!address) throw new Error("NEXT_PUBLIC_AJO_ADDRESS is required");

let id = 0;
const call = async (method, params) => {
  const r = await fetch(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }) });
  const j = await r.json();
  if (j.error) throw new Error(`${method}: ${j.error.message}`);
  return j.result;
};
const hex = (n) => "0x" + n.toString(16);

const chainId = parseInt(await call("eth_chainId", []), 16);
const latest = BigInt(await call("eth_blockNumber", []));
const ranges = [];
for (let f = deployBlock; f <= latest; f += CHUNK) ranges.push([f, f + CHUNK - 1n > latest ? latest : f + CHUNK - 1n]);
const out = new Array(ranges.length);
let next = 0;
await Promise.all(
  Array.from({ length: CONC }, async () => {
    for (;;) {
      const i = next++;
      if (i >= ranges.length) return;
      for (let attempt = 0; ; attempt++) {
        try {
          out[i] = await call("eth_getLogs", [{ address, fromBlock: hex(ranges[i][0]), toBlock: hex(ranges[i][1]) }]);
          break;
        } catch (e) {
          if (attempt >= 3) throw e;
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
  }),
);
const logs = out.flat().map((l) => ({ b: BigInt(l.blockNumber).toString(), i: parseInt(l.logIndex, 16), x: l.transactionHash, topics: l.topics, data: l.data }));
const snap = { v: 1, chainId, address: address.toLowerCase(), deployBlock: deployBlock.toString(), toBlock: latest.toString(), savedAt: Date.now(), logs };
mkdirSync("public", { recursive: true });
writeFileSync("public/logs-snapshot.json", JSON.stringify(snap));
console.log(`snapshot: chain ${chainId}, blocks ${deployBlock}..${latest}, ${logs.length} logs`);
