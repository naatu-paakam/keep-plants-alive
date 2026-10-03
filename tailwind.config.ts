import type { Config } from "tailwindcss";

export default {
  content: ["./client/src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#22c55e",
        "primary-dark": "#16a34a",
        "primary-light": "#86efac",
      },
    },
  },
  plugins: [],
} satisfies Config;
