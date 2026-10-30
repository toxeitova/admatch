import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: { xs: "400px", sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
    extend: {
      colors: {
        // DEFAULT — фирменный коралл для декора; strong/ink — для кнопок и текста (контраст AA)
        accent: { DEFAULT: "#FF5A4E", strong: "#D6342A", hover: "#BF2A21", ink: "#B9281F", soft: "#FFF0EE" },
        ink: { DEFAULT: "#1B1B23", muted: "#5B5B6B", faint: "#6E6E7E" },
        line: "#ECEAF0",
        page: "#FAF8F6",
      },
      borderRadius: { card: "16px" },
      boxShadow: {
        soft: "0 1px 2px rgba(27,27,35,0.04), 0 8px 24px rgba(27,27,35,0.06)",
        lift: "0 2px 4px rgba(27,27,35,0.06), 0 16px 40px rgba(27,27,35,0.10)",
      },
      fontFamily: { sans: ["var(--font-manrope)", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};

export default config;
