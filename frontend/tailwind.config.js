/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Google Drive design tokens
        g: {
          blue: "#1a73e8",
          blueHover: "#1b66c9",
          surface: "#ffffff",
          rail: "#f8fafd",
          hover: "#f0f4f9",
          selected: "#c2e7ff",
          selectedText: "#041e49",
          text: "#1f1f1f",
          muted: "#444746",
          border: "#e3e3e3",
          borderStrong: "#c4c7c5",
        },
        // legacy brand palette kept for any un-migrated spots
        brand: {
          blue: "#1a73e8",
          violet: "#8B5CF6",
          green: "#22C55E",
          yellow: "#EAB308",
        },
      },
      fontFamily: {
        sans: ['Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"Google Sans"', '"Product Sans"', 'Roboto', 'sans-serif'],
      },
      borderRadius: { xl2: "1rem" },
    },
  },
  plugins: [],
};
