/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#0B0B0E',
        surface: '#15151B',
        surfaceAlt: '#1E1E26',
        accent: '#D4A857',
        text: '#F5F3EE',
        textMuted: '#9B9AA3',
        hotel: '#D4A857',
        restaurant: '#C77B5E',
        activity: '#6E9C8A',
      },
    },
  },
  plugins: [],
};
