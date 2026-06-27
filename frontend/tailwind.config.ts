import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#7c3aed",
        "accent-hover": "#6d28d9",
        sidebar: "#0f0f0f",
        "sidebar-text": "#e5e7eb",
        "content-bg": "#f9fafb",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
