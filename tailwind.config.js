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
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
