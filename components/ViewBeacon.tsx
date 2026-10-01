"use client";

import { useEffect } from "react";

/**
 * Tells Leadget the prospect opened the link. Waits a couple of seconds (so a
 * bounce or a crawler doesn't count) and skips your own opens: previews from
 * the app carry ?preview=1, and any browser you've used Leadget in is marked.
 */
export function ViewBeacon({ id, kind }: { id: string; kind: "report" | "mockup" | "invoice" }) {
  useEffect(() => {
    if (new URLSearchParams(location.search).has("preview")) return;
    try { if (localStorage.getItem("leadget-owner")) return; } catch { /* no storage */ }
    const t = setTimeout(() => {
      fetch("/api/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, kind }), keepalive: true }).catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, [id, kind]);
  return null;
}

/** Marks this browser as yours, so opening your own links doesn't count. */
export function OwnerMark() {
  useEffect(() => { try { localStorage.setItem("leadget-owner", "1"); } catch { /* no storage */ } }, []);
  return null;
}
