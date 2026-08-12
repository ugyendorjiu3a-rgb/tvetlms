/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Role theme colors — ui-ux-flow.md §0.4. Applied to top bar / primary buttons / dashboard
        // header per role, never used to convey status (status stays semantic red/amber/green).
        trainee: { DEFAULT: '#0d7490', light: '#e0f2fe', dark: '#0b5a70' },
        trainer: { DEFAULT: '#15803d', light: '#dcfce7', dark: '#116530' },
        examctrl: { DEFAULT: '#c2620a', light: '#ffedd5', dark: '#9a4d08' },
        admin: { DEFAULT: '#5b21b6', light: '#ede9fe', dark: '#4c1d95' },
      },
    },
  },
  plugins: [],
};
