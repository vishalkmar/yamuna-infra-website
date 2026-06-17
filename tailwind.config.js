/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Mirrors the mobile app palette so the portal feels on-brand.
        brand: {
          DEFAULT: '#2B3A8C',
          primary: '#2B3A8C',
          dark: '#1E293B',
          accent: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
};
