"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { IconCheck, IconX } from "@/components/icons";

/* One toast system for the whole app. Rises into the bottom-right corner and
   dismisses itself; errors stay a little longer because they need reading. */

type Toast = { id: number; tone: "ok" | "error"; text: string };
const Ctx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, tone, text }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), tone === "error" ? 6500 : 3200);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto flex animate-rise items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-ink shadow-pop">
            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${t.tone === "ok" ? "bg-success/15 text-success" : "bg-danger/15 text-danger"}`}>
              {t.tone === "ok" ? <IconCheck className="h-3 w-3" /> : <IconX className="h-3 w-3" />}
            </span>
            <span className="leading-snug">{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
