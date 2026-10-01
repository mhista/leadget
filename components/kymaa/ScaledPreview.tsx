"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a fixed-width document scaled down to fit its column, and reserves
 * the scaled height so the scroll area is right.
 */
export function ScaledPreview({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [h, setH] = useState(1000);

  useEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, o.clientWidth / width));
      setH(i.scrollHeight);
    });
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);

  return (
    <div ref={outer} className="mx-auto w-full" style={{ maxWidth: width }}>
      <div style={{ height: h * scale, overflow: "hidden" }}>
        <div ref={inner} style={{ width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
