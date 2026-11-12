/**
 * Incremental, cached eth_getLogs scan for one contract.
 *
 * - Scans only blocks that have not been scanned yet (plus a small overlap as a reorg guard).
 * - Keeps the result in memory and in localStorage, keyed by chainId + contract + version.
 * - Optionally seeds a cold visitor from a build-time snapshot (public/logs-snapshot.json).
 * - Fetches in parallel chunks, and shrinks the chunk or the parallelism when the RPC pushes back.
 *
 * This module has no runtime imports so it can be unit tested with plain node.
 */
import type { Address, Hex } from "viem";

export type StoredLog = {
  /** block number as a decimal string (bigint is not JSON safe) */
  b: string;
  /** log index */
  i: number;
  /** transaction hash */
  x: Hex;
  topics: Hex[];
  data: Hex;
};

export type LogSet = { toBlock: bigint; logs: StoredLog[]; savedAt: number };

type Persisted = { v: number; chainId: number; address: string; deployBlock: string; toBlock: string; savedAt: number; logs: StoredLog[] };

export type RawLog = { blockNumber: bigint | null; logIndex: number | null; transactionHash: Hex | null; topics: readonly Hex[]; data: Hex };

export type LogClient = {
  getBlockNumber: () => Promise<bigint>;
  getLogs: (a: { address: Address; fromBlock: bigint; toBlock: bigint }) => Promise<RawLog[]>;
};

export type ScanOptions = {
  chainId: number;
  address: Address;
  deployBlock: bigint;
  /** blocks per eth_getLogs request (inclusive span). Mezo testnet allows to - from <= 10000, i.e. 10001 blocks. */
  chunk?: bigint;
  concurrency?: number;
  /** blocks re-scanned on every sync, so a shallow reorg cannot leave stale logs behind */
  overlap?: bigint;
  /** URL of a build-time snapshot used when nothing is cached yet */
  snapshotUrl?: string;
  storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export const CACHE_VERSION = 1;
export const DEFAULT_CHUNK = 10_001n;
export const DEFAULT_CONCURRENCY = 8;
export const DEFAULT_OVERLAP = 50n;

const memory = new Map<string, LogSet>();
const inflight = new Map<string, Promise<LogSet>>();

export const cacheKey = (chainId: number, address: string) => `ajo:logs:v${CACHE_VERSION}:${chainId}:${address.toLowerCase()}`;

export function toStored(l: RawLog): StoredLog {
  return { b: String(l.blockNumber ?? 0n), i: l.logIndex ?? 0, x: (l.transactionHash ?? "0x") as Hex, topics: [...l.topics], data: l.data };
}

/** Rebuilds the log shape viem's decodeEventLog and the UI need. */
export function fromStored(s: StoredLog, address: Address) {
  return { address, blockNumber: BigInt(s.b), logIndex: s.i, transactionHash: s.x, topics: s.topics as [Hex, ...Hex[]], data: s.data };
}

function parsePersisted(raw: unknown, o: ScanOptions): LogSet | null {
  const p = raw as Persisted | null;
  if (!p || p.v !== CACHE_VERSION || p.chainId !== o.chainId || String(p.address).toLowerCase() !== o.address.toLowerCase()) return null;
  if (p.deployBlock !== o.deployBlock.toString() || !Array.isArray(p.logs)) return null;
  try {
    const toBlock = BigInt(p.toBlock);
    if (toBlock < o.deployBlock - 1n) return null;
    return { toBlock, logs: p.logs, savedAt: p.savedAt ?? 0 };
  } catch {
    return null;
  }
}

function defaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null; // storage blocked (private mode, iframe)
  }
}

export function readStored(o: ScanOptions): LogSet | null {
  const key = cacheKey(o.chainId, o.address);
  const mem = memory.get(key);
  if (mem) return mem;
  const st = o.storage === undefined ? defaultStorage() : o.storage;
  if (!st) return null;
  try {
    const raw = st.getItem(key);
    if (!raw) return null;
    const set = parsePersisted(JSON.parse(raw), o);
    if (!set) {
      st.removeItem(key);
      return null;
    }
    memory.set(key, set);
    return set;
  } catch {
    return null;
  }
}

function persist(o: ScanOptions, set: LogSet) {
  const key = cacheKey(o.chainId, o.address);
  memory.set(key, set);
  const st = o.storage === undefined ? defaultStorage() : o.storage;
  if (!st) return;
  const p: Persisted = {
    v: CACHE_VERSION,
    chainId: o.chainId,
    address: o.address.toLowerCase(),
    deployBlock: o.deployBlock.toString(),
    toBlock: set.toBlock.toString(),
    savedAt: set.savedAt,
    logs: set.logs,
  };
  try {
    st.setItem(key, JSON.stringify(p));
  } catch {
    // quota exceeded or storage blocked: memory cache still works
  }
}

async function loadSnapshot(o: ScanOptions): Promise<LogSet | null> {
  if (!o.snapshotUrl) return null;
  try {
    const f = o.fetchImpl ?? fetch;
    const res = await f(o.snapshotUrl, { cache: "no-cache" });
    if (!res.ok) return null;
    return parsePersisted(await res.json(), o);
  } catch {
    return null;
  }
}

const isRateLimit = (e: unknown) => /rate|429|too many requests|timeout|timed out/i.test(String((e as Error)?.message ?? e));
const isRangeError = (e: unknown) => !isRateLimit(e) && /range|distance|too many|exceed|limit|too large|max/i.test(String((e as Error)?.message ?? e));

/** Fetches [from, to] in parallel chunks. Splits a chunk in half when the RPC rejects its size. */
export async function fetchRange(
  client: LogClient,
  address: Address,
  from: bigint,
  to: bigint,
  opts: { chunk: bigint; concurrency: number },
): Promise<RawLog[]> {
  if (to < from) return [];
  const ranges: [bigint, bigint][] = [];
  for (let f = from; f <= to; f += opts.chunk) ranges.push([f, f + opts.chunk - 1n > to ? to : f + opts.chunk - 1n]);
  const results: RawLog[][] = new Array(ranges.length);
  let next = 0;
  const concurrency = Math.max(1, opts.concurrency);

  const one = async (f: bigint, t: bigint, attempt = 0): Promise<RawLog[]> => {
    try {
      return await client.getLogs({ address, fromBlock: f, toBlock: t });
    } catch (e) {
      const span = t - f + 1n;
      if (isRangeError(e) && span > 1n) {
        const mid = f + span / 2n - 1n;
        const a = await one(f, mid, attempt);
        const b = await one(mid + 1n, t, attempt);
        return [...a, ...b];
      }
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        return one(f, t, attempt + 1);
      }
      throw e;
    }
  };

  const worker = async () => {
    for (;;) {
      const idx = next++;
      if (idx >= ranges.length) return;
      results[idx] = await one(ranges[idx][0], ranges[idx][1]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, ranges.length) }, worker));
  return results.flat();
}

const sortKey = (l: StoredLog) => [BigInt(l.b), l.i] as const;
function sortLogs(a: StoredLog[]) {
  return a.sort((x, y) => {
    const [bx, ix] = sortKey(x);
    const [by, iy] = sortKey(y);
    return bx < by ? -1 : bx > by ? 1 : ix - iy;
  });
}

async function sync(client: LogClient, o: ScanOptions): Promise<LogSet> {
  const chunk = o.chunk ?? DEFAULT_CHUNK;
  const concurrency = o.concurrency ?? DEFAULT_CONCURRENCY;
  const overlap = o.overlap ?? DEFAULT_OVERLAP;
  const now = o.now ?? Date.now;

  // start the snapshot request in parallel with the block number call, but only use it if nothing is cached
  let cached = readStored(o);
  const snapP = cached ? Promise.resolve(null) : loadSnapshot(o);
  const latest = await client.getBlockNumber();
  if (!cached) cached = await snapP;
  if (cached && cached.toBlock > latest) cached = null; // chain was reset or RPC is behind: do not trust the cache

  const keepUntil = cached ? (cached.toBlock - overlap < o.deployBlock - 1n ? o.deployBlock - 1n : cached.toBlock - overlap) : o.deployBlock - 1n;
  const kept = cached ? cached.logs.filter((l) => BigInt(l.b) <= keepUntil) : [];
  const fresh = await fetchRange(client, o.address, keepUntil + 1n, latest, { chunk, concurrency });
  const byId = new Map<string, StoredLog>();
  for (const l of [...kept, ...fresh.map(toStored)]) byId.set(`${l.b}:${l.i}:${l.x}`, l);
  const set: LogSet = { toBlock: latest, logs: sortLogs([...byId.values()]), savedAt: now() };
  persist(o, set);
  return set;
}

/** Returns all logs from deployBlock to the chain head. Concurrent callers share one scan. */
export function getCachedLogs(client: LogClient, o: ScanOptions): Promise<LogSet> {
  const key = cacheKey(o.chainId, o.address);
  const running = inflight.get(key);
  if (running) return running;
  const p = sync(client, o).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Test helper. */
export function _resetMemory() {
  memory.clear();
  inflight.clear();
}
