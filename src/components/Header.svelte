<script>
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    hasImage = false,
    onHome,
    onFile,
  } = $props();

  let fileInput = $state();

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile?.(e.target.files[0]);
      e.target.value = '';
    }
  }
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
    {#if hasImage}
      <button
        type="button"
        onclick={() => fileInput.click()}
        class="inline-flex items-center justify-center h-9 md:h-8 px-3.5 rounded-lg border border-studio-border-strong bg-studio-elevated/70 hover:bg-studio-elevated text-xs font-medium text-studio-ink active:scale-[0.96] transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
      >
        Replace image
      </button>
      <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Replace source image" />
    {/if}

    <ThemeToggle />
  </div>
</header>
