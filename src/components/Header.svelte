<script>
  import { onDestroy } from 'svelte';
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    hasImage = false,
    width = 0,
    height = 0,
    cellCount = 0,
    metric = 'euclidean',
    exportFormat = 'png',
    isEmbed = false,
    onHome,
    onFile,
    onSample,
    onReset,
    onCopy,
    onDownload,
    onSendToHost,
  } = $props();

  let fileInput = $state();
  let copied = $state(false);
  let copyTimer = null;

  const METRIC_LABELS = {
    euclidean: 'Crystal',
    manhattan: 'Diamond',
    chebyshev: 'Grid',
  };

  onDestroy(() => {
    clearTimeout(copyTimer);
  });

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile?.(e.target.files[0]);
      e.target.value = '';
    }
  }

  async function handleCopyClick() {
    if (!onCopy) return;
    const ok = await onCopy();
    if (ok) {
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1500);
    }
  }
</script>

<header class="sticky top-0 z-30 flex items-center justify-between gap-2 h-12 px-3 sm:px-4 shrink-0 bg-studio-panel border-b border-studio-border">
  <!-- Left: Brand + File Menu Actions -->
  <div class="flex items-center gap-1.5 sm:gap-2 min-w-0">
    <button
      type="button"
      onclick={() => onHome?.()}
      title="Back to landing"
      class="flex items-center gap-2 px-2 py-1.5 rounded-lg text-studio-ink hover:bg-studio-elevated transition-colors duration-150 focus-visible:outline-none shrink-0"
    >
      <svg class="w-4 h-4 text-studio-accent shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
        <line x1="12" y1="22" x2="12" y2="12" />
        <line x1="22" y1="8.5" x2="12" y2="12" />
        <line x1="2" y1="8.5" x2="12" y2="12" />
      </svg>
      <span class="text-xs sm:text-sm font-semibold tracking-tight">Voronoi Shatter</span>
    </button>

    <span class="hidden sm:inline-block w-px h-4 bg-studio-border-strong" aria-hidden="true"></span>

    <div class="flex items-center gap-1">
      <button
        type="button"
        onclick={() => fileInput.click()}
        class="h-8 px-2.5 rounded-md text-xs font-medium text-studio-muted hover:text-studio-ink hover:bg-studio-elevated active:scale-[0.96] transition-[background-color,color,transform] duration-150"
      >
        {hasImage ? 'Open' : 'Open image'}
      </button>
      <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Open image" />

      {#if !hasImage && onSample}
        <button
          type="button"
          onclick={() => onSample?.()}
          class="hidden sm:inline-flex items-center h-8 px-2.5 rounded-md text-xs font-medium text-studio-muted hover:text-studio-ink hover:bg-studio-elevated active:scale-[0.96] transition-[background-color,color,transform] duration-150"
        >
          Sample
        </button>
      {/if}

      {#if hasImage && onReset}
        <button
          type="button"
          onclick={() => onReset?.()}
          title="Reset parameters (Ctrl+Z)"
          class="hidden sm:inline-flex items-center h-8 px-2.5 rounded-md text-xs font-medium text-studio-muted hover:text-studio-ink hover:bg-studio-elevated active:scale-[0.96] transition-[background-color,color,transform] duration-150"
        >
          Reset
        </button>
      {/if}
    </div>
  </div>

  <!-- Center: Live Document Spec (Desktop) -->
  {#if hasImage}
    <div class="hidden lg:flex items-center gap-2 px-3 py-1 rounded-md bg-studio-elevated/70 border border-studio-border text-[11px] font-mono text-studio-muted tabular-nums">
      <span class="text-studio-ink font-medium">{width}&times;{height}</span>
      <span class="text-studio-border-strong">&middot;</span>
      <span>{cellCount || '—'} shards</span>
      <span class="text-studio-border-strong">&middot;</span>
      <span>{METRIC_LABELS[metric] || 'Crystal'}</span>
    </div>
  {/if}

  <!-- Right: Copy, Export, Insert, Theme -->
  <div class="flex items-center gap-1.5 shrink-0">
    {#if hasImage}
      <button
        type="button"
        onclick={handleCopyClick}
        title="Copy PNG to clipboard"
        class="hidden sm:inline-flex items-center justify-center h-8 px-3 rounded-lg bg-studio-elevated text-studio-ink border border-studio-border hover:border-studio-border-strong text-xs font-medium active:scale-[0.96] transition-[border-color,transform] duration-150"
      >
        {copied ? 'Copied' : 'Copy PNG'}
      </button>

      {#if isEmbed}
        <button
          type="button"
          onclick={() => onSendToHost?.()}
          class="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-studio-accent text-studio-accent-ink text-xs font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Insert
        </button>
      {:else}
        <button
          type="button"
          onclick={() => onDownload?.()}
          title="Export (Ctrl+S)"
          class="inline-flex items-center justify-center h-8 px-3.5 rounded-lg bg-studio-ink text-studio-bg text-xs font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Export {exportFormat.toUpperCase()}
        </button>
      {/if}
    {/if}

    <ThemeToggle />
  </div>
</header>
