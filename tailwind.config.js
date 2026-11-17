export default {
  content: ['./index.html', './src/**/*.{svelte,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: 'var(--studio-bg)',
          panel: 'var(--studio-panel)',
          elevated: 'var(--studio-elevated)',
          border: 'var(--studio-border)',
          'border-strong': 'var(--studio-border-strong)',
          ink: 'var(--studio-ink)',
          muted: 'var(--studio-muted)',
          subtle: 'var(--studio-subtle)',
          accent: 'var(--studio-accent)',
          'accent-soft': 'var(--studio-accent-soft)',
          'accent-ink': 'var(--studio-accent-ink)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};
