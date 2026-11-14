/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/app/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        auralis: {
          bg: "#F6F7F4",
          surface: "#FFFFFF",
          text: "#172521",
          muted: "#68746F",
          accent: "#176B60",
          "accent-hover": "#12544B",
          secondary: "#B7D9CF",
          highlight: "#D9EDDF",
          border: "#E1E7E2",
          dark: "#142B29",
          success: "#23865B",
          warning: "#D99A37",
        },
        highcontrast: {
          bg: "#0A100F",
          surface: "#111C19",
          text: "#FFFFFF",
          muted: "#A9B8B3",
          accent: "#2FE4BD",
          border: "#2A453E",
        },
      },
      fontFamily: {
        heading: ["Manrope", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        caption: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        tactile: "0 1px 3px 0 rgba(23, 37, 33, 0.05), 0 1px 2px -1px rgba(23, 37, 33, 0.05)",
        float: "0 10px 30px -5px rgba(20, 43, 41, 0.08)",
        focus: "0 0 0 3px rgba(23, 107, 96, 0.25)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
