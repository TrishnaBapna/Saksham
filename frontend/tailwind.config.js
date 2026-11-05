/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
        saksham: {
          purple: '#7C3AED',
          deep: '#4C1D95',
          soft: '#F5F3FF',
          lilac: '#EDE9FE',
          rose: '#FFE4E6',
          peach: '#FFEDD5',
          cream: '#FEFCE8',
          darkText: '#1E1B4B',
          mutedText: '#475569',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft-purple': '0 10px 25px -5px rgba(124, 58, 237, 0.1), 0 8px 10px -6px rgba(124, 58, 237, 0.05)',
        'elevated': '0 20px 30px -10px rgba(124, 58, 237, 0.15)',
      },
    },
  },
  plugins: [],
};
