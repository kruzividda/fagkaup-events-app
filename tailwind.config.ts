import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        elevated: "var(--elevated)",
        border: "var(--border)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)",
        "accent-bright": "var(--accent-bright)",
        "accent-soft": "var(--accent-soft)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        "3xl": "26px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.7)",
        pop: "0 24px 60px -28px rgba(0,0,0,0.8)",
        glow: "0 10px 28px -10px rgba(200,164,92,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
