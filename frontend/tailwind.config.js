/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          200: "#5DCAA5",
          400: "#1D9E75",
          600: "#0F6E56",
          700: "#085041",
          900: "#04342C",
        },
        tag: {
          50: "#FAEEDA",
          100: "#FAC775",
          400: "#EF9F27",
          600: "#BA7517",
          800: "#633806",
        },
        paper: "#FAF9F5",
        ink: "#22271F",
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
    },
  },
  plugins: [],
};
