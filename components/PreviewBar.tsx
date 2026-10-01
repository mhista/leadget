"use client";

import { useState } from "react";

/**
 * Floating toolbar on your own preview of a mock-up or report: copy the
 * shareable link, save it as an image or PDF to attach to a WhatsApp or email.
 */
export function PreviewBar({ kind, name, backHref }: { kind: "mockup" | "report" | "invoice"; name: string; backHref: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const link = typeof window !== "undefined" ? location.href.replace(/[?&]preview=1/, "") : "";
  const local = typeof window !== "undefined" && /^(localhost|127\.|192\.168\.)/.test(location.hostname);

  async function saveImage() {
    setBusy(true);
    try {
      const { toJpeg } = await import("html-to-image");
      const node = document.getElementById("capture")!;
      const url = await toJpeg(node, { quality: 0.9, pixelRatio: 1.5, backgroundColor: "#ffffff", skipFonts: false, filter: (n) => !(n instanceof HTMLIFrameElement) });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name.replace(/[^\w]+/g, "-").toLowerCase()}-${kind}.jpg`;
      a.click();
    } catch {
      setMsg("Couldn't make the image — use your browser's screenshot instead.");
    }
    setBusy(false);
  }

  return (
    <div className={`fixed bottom-5 left-1/2 z-50 w-[min(640px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl border border-black/10 p-2 text-[13px] text-white shadow-2xl print:hidden ${kind === "mockup" ? "bg-[#0D1310]" : "bg-[#00244E]"}`} data-kind={kind}>
      <div className="flex flex-wrap items-center gap-1.5">
        <a href={backHref} className="rounded-xl px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white">{kind === "invoice" ? "← Edit invoice" : "← Leadget"}</a>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <button onClick={() => { navigator.clipboard?.writeText(link); setMsg(local ? "Copied — but this link only opens on your computer. Deploy Leadget to share it." : "Link copied. Paste it into your message."); }}
          className={kind === "mockup" ? "rounded-xl bg-[#C8F04C] px-3 py-2 font-medium text-[#162008] hover:brightness-95" : "rounded-xl bg-[#0678FF] px-3 py-2 font-medium text-white hover:brightness-110"}>Copy share link</button>
        {kind === "mockup"
          ? <button onClick={saveImage} disabled={busy} className="rounded-xl px-3 py-2 hover:bg-white/10">{busy ? "Saving…" : "Save as image"}</button>
          : <button onClick={() => window.print()} className="rounded-xl px-3 py-2 hover:bg-white/10">Save as PDF</button>}
        <span className="ml-auto hidden px-2 text-white/50 sm:inline">Your preview — not counted as a view</span>
      </div>
      {msg && <p className="px-3 pb-1 pt-2 text-[12px] text-white/70">{msg}</p>}
    </div>
  );
}
