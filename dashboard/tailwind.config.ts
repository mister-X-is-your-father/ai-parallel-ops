import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crt: {
          black: "#0a0a0a",
          dark: "#0d1117",
          green: "#00ff41",
          "green-dim": "#00aa2a",
          amber: "#ffb000",
          red: "#ff3333",
          blue: "#00aaff",
          cyan: "#00ffcc",
          purple: "#bb77ff",
          gray: "#1a1f2e",
          "gray-light": "#2d3548",
          "gray-text": "#6b7280",
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', "monospace"],
        display: ['"Share Tech Mono"', "monospace"],
      },
      animation: {
        "scan": "scan 8s linear infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "flicker": "flicker 0.15s infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.97" },
        },
        "slide-in": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
