/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#3B82F6",
          violet: "#8B5CF6",
          green: "#22C55E",
          yellow: "#EAB308",
        },
      },
      borderRadius: { xl2: "1.25rem" },
    },
  },
  plugins: [],
};
