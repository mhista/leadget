"use client";

import clsx from "clsx";
import { IconCheck } from "@/components/icons";

export function Check({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button" role="checkbox" aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={clsx("grid h-4 w-4 shrink-0 place-items-center rounded-[4px] border transition-colors", checked ? "border-ink bg-ink text-page" : "border-line-strong bg-surface hover:border-ink/50")}
    >
      {checked && <IconCheck className="h-3 w-3" />}
    </button>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
