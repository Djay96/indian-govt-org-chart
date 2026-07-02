/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5dae3",
          300: "#b0b9c9",
          400: "#8593ab",
          500: "#667690",
          600: "#515f78",
          700: "#434d62",
          800: "#3a4253",
          900: "#333947",
          950: "#22262f",
        },
        saffron: {
          400: "#ff9933",
          500: "#f58220",
          600: "#e06b0a",
        },
        green: {
          500: "#138808",
          600: "#0f6d06",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
