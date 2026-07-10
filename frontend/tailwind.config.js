module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ink:    "#0a0a0a",
        surface:"#111111",
        elevated:"#171717",
        subtle: "#1f1f1f",
        border: "#2a2a2a",
        muted:  "#6b7280",
        accent: "#6366f1",
        signal: "#22c55e",
        alarm:  "#ef4444",
        amber:  "#f59e0b",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
    },
  },
  plugins: [],
};
