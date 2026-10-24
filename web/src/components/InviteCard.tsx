"use client";
import { useEffect, useState } from "react";
import { useToast } from "./Toasts";

/**
 * The contract has no allowlist: anyone joins by signing join(id) themselves.
 * So "inviting" = sharing this circle's link. Copy + native share where available.
 */
export function InviteCard({
  id,
  name,
  seatsLeft,
  maxMembers,
  contribution,
}: {
  id: bigint;
  name: string;
  seatsLeft: number;
  maxMembers: number;
  contribution: string;
}) {
  const toast = useToast();
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}${window.location.pathname}?id=${id}`);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [id]);

  const title = name || `Circle #${id}`;
  const text = `Join "${title}" on AjoCircle: ${contribution} per round, ${maxMembers} members. Onchain ajo on Mezo.`;
  const full = seatsLeft === 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API can be blocked (http, iframes): fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) {
        toast.push({ kind: "error", title: "Couldn't copy automatically", body: "Select the link and copy it by hand." });
        return;
      }
    }
    setCopied(true);
    toast.push({ kind: "success", title: "Invite link copied", body: "Send it to the people you want in this circle." });
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    try {
      await navigator.share({ title: `AjoCircle · ${title}`, text, url });
    } catch (e) {
      if ((e as Error).name !== "AbortError") copy();
    }
  }

  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <section className="card invite" aria-labelledby="invite-title">
      <div className="invite-head">
        <div>
          <h2 id="invite-title">{full ? "Circle full" : "Invite members"}</h2>
          <p className="muted small">
            {full
              ? `All ${maxMembers} seats are taken, so no one else can join. You can still share the link so people can follow along.`
              : `${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left. There's no invite list: whoever opens this link and signs join with their own wallet takes a seat, first come, first served.`}
          </p>
        </div>
        <div className="seats" aria-label={`${maxMembers - seatsLeft} of ${maxMembers} seats taken`}>
          {Array.from({ length: maxMembers }, (_, i) => (
            <span key={i} className={`seat ${i < maxMembers - seatsLeft ? "taken" : ""}`} />
          ))}
        </div>
      </div>
      <div className="invite-row">
        <input readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy link"}</button>
        {canShare ? (
          <button type="button" className="btn ghost" onClick={share}>Share…</button>
        ) : (
          <a className="btn ghost" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>
        )}
      </div>
    </section>
  );
}
