module.exports = {
  theme: {
    extend: {
      colors: {
        nexus: {
          DEFAULT: "#800000",
          800: "#5C0000",
          700: "#700000",
          600: "#991B1B",
          50: "#F8EEEE",
          charcoal: "#333333",
          muted: "#737373",
          soft: "#F2F2F2",
          white: "#FFFFFF",
          green: "#4F7F45",
          amber: "#E5AA19",
          teal: "#146B78",
          blue: "#315278",
        },
      },
      fontFamily: {
        sans: ["Inter", '"Segoe UI"', "Arial", "sans-serif"],
      },
      borderRadius: {
        nexus: "6px",
        "nexus-sm": "4px",
      },
      boxShadow: {
        "nexus-nav": "0 5px 30px rgb(0 0 0 / 0.1)",
        "nexus-popover": "0 0 10px rgb(0 0 0 / 0.2)",
        "nexus-float": "0 8px 28px rgb(0 0 0 / 0.14)",
      },
      maxWidth: {
        nexus: "1200px",
      },
    },
  },
};
