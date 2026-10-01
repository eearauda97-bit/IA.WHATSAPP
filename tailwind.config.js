/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#E6F4F7",
        surface: "#FFFFFF",
        surfaceMuted: "#EEF8FA",
        border: "#CDE3E9",
        borderStrong: "#B4D0D8",
        ink: "#101828",
        inkSecondary: "#475467",
        inkMuted: "#557079",
        accent: "#0E7490",
        accentHover: "#0B5E75",
        accentSoft: "#DFF3F8",
        success: "#17825A",
        successSoft: "#E4F7EF",
        warning: "#B54708",
        warningSoft: "#FFF6ED",
        danger: "#B42318",
        dangerSoft: "#FEF3F2",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};