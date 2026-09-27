/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F7F8FA",
        surface: "#FFFFFF",
        surfaceMuted: "#F2F4F7",
        border: "#E4E7EC",
        borderStrong: "#D0D5DD",
        ink: "#101828",
        inkSecondary: "#475467",
        inkMuted: "#667085",
        accent: "#3654E0",
        accentHover: "#2C44C4",
        accentSoft: "#EEF1FE",
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