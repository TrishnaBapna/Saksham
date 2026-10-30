/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Saksham brand palette
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#387D82',  // Primary teal
          600: '#1B4225',  // Deep forest green
          700: '#14532d',
          800: '#166534',
          900: '#15803d',
        },
        teal: {
          50:  '#f0fdfa',
          500: '#387D82',
          600: '#2a6b70',
          700: '#1d5a5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Larger base for accessibility
        base: ['1rem', { lineHeight: '1.6' }],
        lg:   ['1.125rem', { lineHeight: '1.6' }],
      },
      spacing: {
        // Minimum 44px touch targets (WCAG 2.5.5)
        'touch': '2.75rem',
      },
      minHeight: {
        'touch': '2.75rem',
      },
      minWidth: {
        'touch': '2.75rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
