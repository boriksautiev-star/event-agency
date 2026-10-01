/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#667eea",
        primaryDark: "#5a67d8",
        accent: "#0F766E",
        danger: "#dc2626",
        success: "#10b981",
        warning: "#f59e0b",
        alert: "#ef4444",
        border: "#e5e7eb",
        muted: "#6b7280",
        bg: "#f5f6fa",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "zoom-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "zoom-in": "zoom-in 180ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
