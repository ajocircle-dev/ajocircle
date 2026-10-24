"use client";
import { useParams } from "next/navigation";
import { CircleView } from "@/components/CircleView";

export default function CirclePage() {
  const { id } = useParams<{ id: string }>();
  if (!/^\d+$/.test(id ?? "")) return <div className="card error">Invalid circle id.</div>;
  return <CircleView id={BigInt(id)} />;
}
