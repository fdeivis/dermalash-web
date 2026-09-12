import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "var(--brand-bg)",
          surface: "var(--brand-surface)",
          ink: "var(--brand-ink)",
          muted: "var(--brand-muted)",
          accent: "var(--brand-accent)",
          "accent-ink": "var(--brand-accent-ink)",
          border: "var(--brand-border)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        brand: "var(--brand-radius)",
      },
    },
  },
  plugins: [],
};

export default config;
