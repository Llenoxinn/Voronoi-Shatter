<script>
  let {
    hasImage = false,
    processing = false,
    width = 0,
    height = 0,
    cellCount = 0,
    inspectorOpen = $bindable(true),
    onHome,
  } = $props();

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

<header class="fixed top-0 inset-x-0 z-30 flex items-center justify-between gap-3 px-4 pt-3 sm:px-6 sm:pt-4 pointer-events-none">
  <!-- Floating Editorial Masthead -->
  <div class="pointer-events-auto flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-studio-panel backdrop-blur-xl border border-studio-border shadow-[0_8px_24px_rgba(17,17,19,0.06),inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
    <button
      type="button"
      onclick={() => onHome?.()}
      title="Back to overview"
      class="flex items-center gap-2 text-studio-ink hover:text-studio-accent transition-colors duration-150 focus-visible:outline-none"
    >
      <svg class="w-4 h-4 text-studio-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <line x1="22" y1="8.5" x2="12" y2="12" />
        <line x1="2" y1="8.5" x2="12" y2="12" />
      </svg>
      <span class="text-sm font-display font-bold tracking-[-0.03em]">Voronoi Shatter</span>
    </button>

    <span class="hidden sm:inline-block w-px h-3.5 bg-studio-border-strong" aria-hidden="true"></span>

    <span class="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-studio-muted tabular-nums">
      <span
        class="w-1.5 h-1.5 rounded-full {processing ? 'bg-studio-accent animate-pulse' : hasImage ? 'bg-emerald-500' : 'bg-studio-subtle'}"
      ></span>
      {#if processing}
        Rendering
      {:else if hasImage}
        <span class="hidden sm:inline">{width}&times;{height} &middot; {cellCount || '—'} cells</span>
        <span class="sm:hidden">Ready</span>
      {:else}
        Idle
      {/if}
    </span>
  </div>

  <!-- Floating Instrument Controls -->
  <div class="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-studio-panel backdrop-blur-xl border border-studio-border shadow-[0_8px_24px_rgba(17,17,19,0.06),inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
    <button
      type="button"
      onclick={toggleTheme}
      aria-label={isDark ? 'Switch to light studio theme' : 'Switch to darkroom theme'}
      title={isDark ? 'Gallery Stone' : 'Darkroom'}
      class="inline-flex items-center justify-center w-9 h-9 md:w-8 md:h-8 rounded-lg text-studio-muted hover:text-studio-ink hover:bg-studio-elevated active:scale-[0.96] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
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

    {#if hasImage}
      <button
        type="button"
        onclick={() => (inspectorOpen = !inspectorOpen)}
        aria-expanded={inspectorOpen}
        aria-label={inspectorOpen ? 'Hide inspector panel' : 'Show inspector panel'}
        class="inline-flex items-center gap-1.5 h-9 md:h-8 px-3 rounded-lg text-[11px] font-mono uppercase tracking-[0.08em] active:scale-[0.96] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {inspectorOpen
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-ink hover:bg-studio-elevated'}"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
        <span class="hidden sm:inline">Controls</span>
      </button>
    {/if}
  </div>
</header>
