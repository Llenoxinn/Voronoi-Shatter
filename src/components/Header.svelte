<script>
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    hasImage = false,
    inspectorOpen = $bindable(true),
    onHome,
  } = $props();
</script>

<header class="sticky top-0 z-30 flex items-center justify-between h-14 px-5 sm:px-8 shrink-0 bg-studio-panel/90 backdrop-blur-md border-b border-studio-border">
  <button
    type="button"
    onclick={() => onHome?.()}
    title="Back to overview"
    class="flex items-center gap-2.5 text-studio-ink hover:text-studio-accent transition-colors duration-150 focus-visible:outline-none"
  >
    <svg class="w-4 h-4 text-studio-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
      <line x1="12" y1="22" x2="12" y2="12" />
      <line x1="22" y1="8.5" x2="12" y2="12" />
      <line x1="2" y1="8.5" x2="12" y2="12" />
    </svg>
    <span class="text-sm font-semibold tracking-tight">Voronoi Shatter</span>
  </button>

  <div class="flex items-center gap-2">
    <ThemeToggle />

    {#if hasImage}
      <button
        type="button"
        onclick={() => (inspectorOpen = !inspectorOpen)}
        aria-expanded={inspectorOpen}
        aria-label={inspectorOpen ? 'Hide controls' : 'Show controls'}
        class="inline-flex items-center gap-1.5 h-9 md:h-8 px-3 rounded-lg text-xs font-medium active:scale-[0.96] transition-[color,background-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {inspectorOpen
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-ink bg-studio-elevated hover:bg-studio-border'}"
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
