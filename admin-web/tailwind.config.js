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
      },
    },
  },
  plugins: [],
};
