import { formatUnits } from "viem";

export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export const fmt = (v: bigint | undefined, decimals = 18) => {
  if (v === undefined) return "…";
  const s = formatUnits(v, decimals);
  const [i, f = ""] = s.split(".");
  const frac = f.slice(0, 2).replace(/0+$/, "");
  return frac ? `${Number(i).toLocaleString()}.${frac}` : Number(i).toLocaleString();
};

export const duration = (secs: number) => {
  if (secs >= 86400 && secs % 86400 === 0) return `${secs / 86400} day${secs === 86400 ? "" : "s"}`;
  if (secs >= 3600 && secs % 3600 === 0) return `${secs / 3600} h`;
  if (secs >= 60 && secs % 60 === 0) return `${secs / 60} min`;
  return `${secs} s`;
};

export const STATUS = ["Open", "Active", "Completed", "Cancelled"] as const;
