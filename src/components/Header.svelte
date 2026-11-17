<script>
  let { hasImage = false, processing = false } = $props();
  let isDark = $state(false);

  function toggleTheme() {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    isDark = !isDark;
    root.classList.toggle('dark', isDark);
    void root.offsetHeight;
    requestAnimationFrame(() => {
      root.classList.remove('theme-switching');
    });
  }
</script>

<header class="flex items-center justify-between h-12 px-5 shrink-0 bg-studio-panel border-b border-studio-border">
  <div class="flex items-center gap-2.5">
    <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-studio-accent-soft border border-studio-accent/25 text-studio-accent">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <line x1="22" y1="8.5" x2="12" y2="12" />
        <line x1="2" y1="8.5" x2="12" y2="12" />
      </svg>
    </div>
    <span class="text-sm font-display font-semibold tracking-tight text-studio-ink">Voronoi Shatter</span>
  </div>

  <div class="flex items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-[0.1em] border border-studio-border bg-studio-elevated text-studio-muted"
    >
      <span
        class="w-1.5 h-1.5 rounded-full {processing ? 'bg-studio-accent animate-pulse' : hasImage ? 'bg-emerald-500' : 'bg-studio-subtle'}"
      ></span>
      {processing ? 'Rendering' : hasImage ? 'Ready' : 'Idle'}
    </span>

    <button
      type="button"
      onclick={toggleTheme}
      aria-label={isDark ? 'Switch to light studio theme' : 'Switch to darkroom theme'}
      title={isDark ? 'Light Studio' : 'Darkroom'}
      class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-studio-border bg-studio-elevated text-studio-muted hover:text-studio-ink hover:border-studio-border-strong active:scale-[0.96] transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
    >
      {#if isDark}
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      {:else}
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      {/if}
    </button>
  </div>
</header>
