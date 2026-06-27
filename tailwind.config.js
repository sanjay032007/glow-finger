/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        neonCyan: '#00f3ff',
        neonPurple: '#b026ff',
        neonPink: '#ff007f',
        neonGreen: '#39ff14',
        neonOrange: '#ff8c00',
        neonWhite: '#ffffff',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
