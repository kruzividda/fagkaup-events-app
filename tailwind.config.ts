import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      "var(--bg)",
        surface: "var(--surface)",
        elevated:"var(--elevated)",
        border:  "var(--border)",
        text:    "var(--text)",
        muted:   "var(--muted)",
        accent:  "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        danger:  "var(--danger)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "14px",
      },
    },
  },
  plugins: [],
};
export default config;
