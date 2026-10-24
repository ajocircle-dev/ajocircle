"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CircleView } from "@/components/CircleView";

// Static-export friendly: /circle/?id=N is resolved entirely on the client,
// so any circle id works on static hosts (Cloudflare Pages, GitHub Pages).
function CircleById() {
  const id = useSearchParams().get("id") ?? "";
  if (!/^\d+$/.test(id)) return <div className="card error">Invalid circle id.</div>;
  return <CircleView id={BigInt(id)} />;
}

export default function CirclePage() {
  return (
    <Suspense fallback={<div className="card muted">Loading circle…</div>}>
      <CircleById />
    </Suspense>
  );
}
