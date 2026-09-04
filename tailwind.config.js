/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: 'tw-',
  important: true,
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        'jayluxe-gold': '#C8A24B',
        'jayluxe-black': '#111111',
        'jayluxe-cream': '#F8F6F2',
      },
      fontFamily: {
        sans: ['var(--font-jayluxe-sans)', 'sans-serif'],
        serif: ['var(--font-jayluxe-serif)', 'serif'],
      },
    },
  },
  plugins: [],
};
