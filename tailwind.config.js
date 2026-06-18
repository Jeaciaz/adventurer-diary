/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        frontier: {
          'color-scheme': 'dark',
          primary: '#b86f2d',
          'primary-content': '#1c1008',
          secondary: '#8f3f20',
          'secondary-content': '#ffe8d6',
          accent: '#d4a017',
          'accent-content': '#221704',
          neutral: '#2d2118',
          'neutral-content': '#f4ead8',
          'base-100': '#18110d',
          'base-200': '#211811',
          'base-300': '#322418',
          'base-content': '#f4ead8',
          info: '#6f8f72',
          'info-content': '#081308',
          success: '#7a8f3a',
          'success-content': '#101506',
          warning: '#d99a32',
          'warning-content': '#201304',
          error: '#b84a35',
          'error-content': '#fff0e8',
        },
      },
    ],
    darkTheme: 'frontier',
    base: true,
    styled: true,
    utils: true,
  },
};
