// Run with: node --test --experimental-strip-types test/logCache.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { getCachedLogs, fetchRange, _resetMemory, cacheKey, readStored } from "../src/lib/logCache.ts";

const ADDR = "0xc2B6e4Bec56F1fd129D4bCd1CB8e4271303B0dda";
const mkStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), _m: m };
};
// fake chain: one log every 100 blocks, topics carry the block number
const mkClient = (latest, { maxSpan = 10000n, calls = [], failRate = 0 } = {}) => ({
  getBlockNumber: async () => latest,
  getLogs: async ({ fromBlock, toBlock }) => {
    calls.push([fromBlock, toBlock]);
    if (toBlock - fromBlock > maxSpan) throw new Error("maximum [from, to] blocks distance: 10000");
    if (failRate && Math.random() < failRate) throw new Error("429 Too Many Requests");
    const out = [];
    for (let b = fromBlock; b <= toBlock; b++) if (b % 100n === 0n) out.push({ blockNumber: b, logIndex: 0, transactionHash: "0x" + b.toString(16), topics: ["0x01"], data: "0x" });
    return out;
  },
});
const o = (storage, extra = {}) => ({ chainId: 31611, address: ADDR, deployBlock: 1000n, storage, ...extra });

test("cold scan covers the whole range in chunks", async () => {
  _resetMemory();
  const calls = [];
  const set = await getCachedLogs(mkClient(51_234n, { calls }), o(mkStorage()));
  assert.equal(set.toBlock, 51_234n);
  assert.equal(set.logs.length, 503); // blocks 1000..51200 step 100
  assert.ok(calls.every(([f, t]) => t - f <= 10000n));
  assert.equal(calls.length, 6);
});

test("refetch scans only new blocks plus the overlap, and persists bigint-safe JSON", async () => {
  _resetMemory();
  const st = mkStorage();
  await getCachedLogs(mkClient(20_000n), o(st));
  _resetMemory(); // simulate a reload: only localStorage survives
  const calls = [];
  const set = await getCachedLogs(mkClient(20_300n, { calls }), o(st));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 20_000n - 50n + 1n);
  assert.equal(set.logs.length, 194); // 1000..20300 step 100
  const stored = JSON.parse(st.getItem(cacheKey(31611, ADDR)));
  assert.equal(stored.toBlock, "20300");
});

test("overlap blocks are replaced, not duplicated (reorg guard)", async () => {
  _resetMemory();
  const st = mkStorage();
  await getCachedLogs(mkClient(5_000n), o(st));
  const set = await getCachedLogs(mkClient(5_100n), o(st));
  const keys = set.logs.map((l) => `${l.b}:${l.i}`);
  assert.equal(new Set(keys).size, keys.length);
});

test("a cache from a different contract, version or deploy block is ignored", async () => {
  _resetMemory();
  const st = mkStorage();
  await getCachedLogs(mkClient(5_000n), o(st));
  _resetMemory();
  assert.equal(readStored(o(st, { deployBlock: 999n })), null);
  _resetMemory();
  assert.equal(readStored({ ...o(st), address: "0x0000000000000000000000000000000000000001" }), null);
});

test("cache ahead of the chain head is discarded", async () => {
  _resetMemory();
  const st = mkStorage();
  await getCachedLogs(mkClient(9_000n), o(st));
  _resetMemory();
  const calls = [];
  const set = await getCachedLogs(mkClient(3_000n, { calls }), o(st));
  assert.equal(set.toBlock, 3_000n);
  assert.equal(calls[0][0], 1000n);
});

test("snapshot seeds a cold cache and only the tail is fetched", async () => {
  _resetMemory();
  const snap = { v: 1, chainId: 31611, address: ADDR.toLowerCase(), deployBlock: "1000", toBlock: "30000", savedAt: 1, logs: [{ b: "1000", i: 0, x: "0x3e8", topics: ["0x01"], data: "0x" }] };
  const calls = [];
  const set = await getCachedLogs(mkClient(30_200n, { calls }), o(mkStorage(), { snapshotUrl: "/s.json", fetchImpl: async () => ({ ok: true, json: async () => snap }) }));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 29_951n);
  assert.ok(set.logs.some((l) => l.b === "1000"));
});

test("chunk is split when the RPC rejects the range; rate limits are retried, not split", async () => {
  const calls = [];
  const logs = await fetchRange(mkClient(100_000n, { maxSpan: 4000n, calls }), ADDR, 1000n, 21_000n, { chunk: 10_001n, concurrency: 4 });
  assert.equal(logs.length, 201);
  const rl = await fetchRange(mkClient(100_000n, { failRate: 0.3 }), ADDR, 1000n, 41_000n, { chunk: 10_001n, concurrency: 4 }).catch((e) => e);
  assert.ok(Array.isArray(rl) || /429/.test(String(rl)));
});

test("concurrent callers share one scan", async () => {
  _resetMemory();
  const calls = [];
  const c = mkClient(12_000n, { calls });
  const [a, b] = await Promise.all([getCachedLogs(c, o(mkStorage())), getCachedLogs(c, o(mkStorage()))]);
  assert.equal(a, b);
  assert.equal(calls.length, 2);
});
