"use client";

import { useState } from "react";

/**
 * The business's own icon when it has a site, a coloured initial when it
 * doesn't. Google's favicon service answers with a generic 16px globe for
 * unknown sites, so anything smaller than 32px is treated as "no icon".
 */
export function Favicon({ website, name, size = 32 }: { website?: string; name: string; size?: number }) {
  const [show, setShow] = useState(false);
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  let domain = "";
  try { domain = website ? new URL(website).hostname : ""; } catch { /* no icon */ }
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-md text-[12px] font-semibold ring-1 ring-inset ring-black/5"
      style={{ width: size, height: size, background: `hsl(${hue} 42% 90%)`, color: `hsl(${hue} 45% 28%)` }}
    >
      {letter}
      {domain && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`}
          alt=""
          loading="lazy"
          onLoad={(e) => setShow(e.currentTarget.naturalWidth >= 32)}
          onError={() => setShow(false)}
          className={`absolute inset-0 h-full w-full bg-white object-contain p-[5px] transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
