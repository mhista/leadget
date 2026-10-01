import type { Config } from "tailwindcss";

/* Every colour is a CSS variable defined in app/globals.css, so the dark theme
   is a change of variables rather than a second set of class names. Tailwind
   only knows the semantic names — product code never reaches for a hex. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        page: v("page"),
        "page-alt": v("page-alt"),
        surface: v("surface"),
        sunken: v("sunken"),
        ink: v("ink"),
        muted: v("muted"),
        faint: v("faint"),
        line: v("line"),
        "line-strong": v("line-strong"),
        brand: v("brand"),
        "brand-ink": v("brand-ink"),
        accent: v("accent"),
        "accent-ink": v("accent-ink"),
        rail: v("rail"),
        "rail-ink": v("rail-ink"),
        "rail-muted": v("rail-muted"),
        "rail-line": v("rail-line"),
        success: v("success"),
        warning: v("warning"),
        danger: v("danger"),
        info: v("info"),
      },
      fontFamily: {
        display: ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
        body: ["Instrument Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        pill: "999px",
      },
      boxShadow: {
        soft: "0 1px 2px rgb(var(--shadow) / 0.05), 0 6px 20px rgb(var(--shadow) / 0.06)",
        lift: "0 2px 4px rgb(var(--shadow) / 0.06), 0 18px 44px rgb(var(--shadow) / 0.12)",
        pop: "0 1px 2px rgb(var(--shadow) / 0.08), 0 10px 28px rgb(var(--shadow) / 0.16)",
      },
      transitionTimingFunction: {
        entrance: "cubic-bezier(0.16, 1, 0.3, 1)",
        layout: "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } },
        shimmer: { from: { backgroundPosition: "-200% 0" }, to: { backgroundPosition: "200% 0" } },
      },
      animation: {
        rise: "rise .5s cubic-bezier(.16,1,.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
