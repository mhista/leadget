"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IconX } from "@/components/icons";

export function Modal({
  open, onClose, title, description, children, wide,
}: { open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; wide?: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  // Portalled to <body>: an animated (transformed) ancestor would otherwise
  // trap a fixed-position overlay inside itself.
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div
            className={`relative max-h-[88vh] w-full overflow-y-auto rounded-xl border border-line bg-surface shadow-lift scroll-thin ${wide ? "max-w-3xl" : "max-w-lg"}`}
            initial={{ opacity: 0, y: 14, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
              <div>
                <h2 className="display text-[1.35rem] text-ink">{title}</h2>
                {description && <p className="mt-1 text-[12.5px] text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-page-alt hover:text-ink" aria-label="Close">
                <IconX />
              </button>
            </div>
            <div className="px-6 py-5">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
