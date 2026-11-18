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
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
        display: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
