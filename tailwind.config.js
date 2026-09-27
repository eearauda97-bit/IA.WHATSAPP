/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F6F7F4",
        surface: "#FFFFFF",
        border: "#E3E7E0",
        ink: "#1B2420",
        muted: "#5B6B63",
        accent: "#1F6F5C",
        accentSoft: "#DCEDE7",
        amber: "#C97A2A",
        amberSoft: "#F3E3CE",
        danger: "#B3483F",
        dangerSoft: "#F3DEDB",
        quiet: "#8A938D",
        quietSoft: "#E8EAE6",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
    },
  },
  plugins: [],
};