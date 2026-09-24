/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pine: {
          950: "#0D1712",
          900: "#14231C",
          800: "#1C2E24",
          700: "#25392C",
          600: "#324B3B",
        },
        oxblood: {
          400: "#B4534A",
          500: "#8B2E2E",
          600: "#6E2222",
        },
        oak: {
          400: "#D3A467",
          500: "#B98650",
          600: "#946A3D",
        },
        limewash: "#E8E4DA",
        sage: "#6B9080",
        rust: "#A83E32",
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
