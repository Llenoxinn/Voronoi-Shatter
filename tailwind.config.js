export default {
  content: ['./index.html', './src/**/*.{svelte,js}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#6c5ce7',
          light: '#8b7cf0',
          dark: '#5a4bd4',
          glow: 'rgba(108,92,231,0.3)',
        },
        surface: {
          DEFAULT: '#12121e',
          light: '#1a1a2e',
          lighter: '#242442',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [],
};
