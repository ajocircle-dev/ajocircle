"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinById() {
  const [id, setId] = useState("");
  const router = useRouter();
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        if (/^\d+$/.test(id)) router.push(`/circle/?id=${id}`);
      }}
    >
      <h2>Got an invite?</h2>
      <div className="row">
        <input placeholder="Circle number, e.g. 3" value={id} onChange={(e) => setId(e.target.value.trim())} />
        <button className="btn" disabled={!/^\d+$/.test(id)}>Open</button>
      </div>
    </form>
  );
}
