<script>
  import UploadZone from './UploadZone.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';

  let {
    canvasEl = $bindable(),
    hasImage = false,
    processing = false,
    srcData = null,
    impact = null,
    showAlpha = false,
    comparing = $bindable(false),
    onFile,
    onSample,
    onImpact,
  } = $props();

  let compareCanvas = $state();
  let isDragOver = $state(false);
  let zoom100 = $state(false);
  let alphaOverride = $state(null);

  $effect(() => {
    void showAlpha;
    alphaOverride = null;
  });

  const alphaVisible = $derived(alphaOverride ?? showAlpha);

  $effect(() => {
    if (comparing && compareCanvas && srcData) {
      compareCanvas.width = srcData.width;
      compareCanvas.height = srcData.height;
      compareCanvas.getContext('2d').putImageData(srcData, 0, 0);
    }
  });

  function handleCanvasClick(e) {
    if (!hasImage || !canvasEl || !onImpact) return;
    const rect = canvasEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onImpact(x, y);
  }

  function handleDragOver(e) {
    if (!hasImage) return;
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e) {
    if (!hasImage) return;
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<section
  aria-label="Canvas workspace"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  class="order-1 md:order-2 relative flex-1 min-h-[240px] flex items-center justify-center overflow-hidden bg-studio-elevated/55 dark:bg-[#0a0a0c]"
>
  {#if !hasImage}
    <UploadZone {onFile} {onSample} />
  {/if}

  <div class="relative w-full h-full {hasImage && zoom100 ? 'overflow-auto' : 'overflow-hidden'}">
    <div class="flex items-center justify-center {hasImage && zoom100 ? 'min-w-full min-h-full w-max h-max' : 'w-full h-full'} p-4 sm:p-8">
      <div class="relative flex items-center justify-center {hasImage && zoom100 ? 'max-w-none max-h-none shrink-0' : 'max-w-full max-h-full'}">
        {#if hasImage && alphaVisible}
          <div
            aria-hidden="true"
            class="absolute inset-0 rounded-lg pointer-events-none"
            style="background-color: var(--studio-elevated); background-image: conic-gradient(var(--studio-border) 90deg, transparent 90deg 180deg, var(--studio-border) 180deg 270deg, transparent 270deg); background-size: 16px 16px;"
          ></div>
        {/if}

        <canvas
          bind:this={canvasEl}
          onclick={handleCanvasClick}
          title={hasImage ? 'Click anywhere to set shatter impact point' : undefined}
          class="relative block {hasImage && zoom100 ? 'max-w-none max-h-none' : 'max-w-full max-h-full'} rounded-lg ring-1 ring-black/10 dark:ring-white/10 shadow-[0_20px_56px_rgba(17,17,19,0.16)] dark:shadow-[0_24px_68px_rgba(0,0,0,0.7)] {hasImage ? 'cursor-crosshair' : 'pointer-events-none'}"
          class:opacity-0={!hasImage || comparing}
        ></canvas>

        {#if hasImage && impact && !comparing}
          <div
            aria-hidden="true"
            class="absolute z-10 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/75 shadow-sm pointer-events-none"
            style="left: {impact.x * 100}%; top: {impact.y * 100}%;"
          ></div>
        {/if}

        {#if hasImage && comparing}
          <canvas
            bind:this={compareCanvas}
            class="absolute inset-0 z-10 w-full h-full rounded-lg ring-1 ring-studio-accent/60 shadow-[0_20px_56px_rgba(17,17,19,0.16)] pointer-events-none"
          ></canvas>
        {/if}
      </div>
    </div>
  </div>

  {#if hasImage}
    <!-- Top-Right Canvas Viewport Controls -->
    <div class="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-lg bg-studio-panel/95 backdrop-blur-md border border-studio-border shadow-sm">
      <button
        type="button"
        onclick={() => (alphaOverride = !alphaVisible)}
        aria-pressed={alphaVisible}
        aria-label="Toggle transparency grid"
        title="Transparency grid"
        class="inline-flex items-center justify-center w-8 h-8 md:w-7 md:h-7 rounded-md enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {alphaVisible
          ? 'bg-studio-ink text-studio-bg'
          : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated/70'}"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="6" height="6" rx="0.5" opacity="0.9" />
          <rect x="8" y="8" width="6" height="6" rx="0.5" opacity="0.9" />
          <rect x="8" y="2" width="6" height="6" rx="0.5" opacity="0.25" />
          <rect x="2" y="8" width="6" height="6" rx="0.5" opacity="0.25" />
        </svg>
      </button>

      <span class="w-px h-3.5 bg-studio-border-strong" aria-hidden="true"></span>

      <div class="flex items-center gap-0.5" role="group" aria-label="Canvas zoom">
        <button
          type="button"
          onclick={() => (zoom100 = false)}
          aria-pressed={!zoom100}
          class="h-8 md:h-7 px-2.5 rounded-md text-[11px] font-medium tabular-nums enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {!zoom100
            ? 'bg-studio-ink text-studio-bg'
            : 'text-studio-muted hover:text-studio-ink'}"
        >
          Fit
        </button>
        <button
          type="button"
          onclick={() => (zoom100 = true)}
          aria-pressed={zoom100}
          class="h-8 md:h-7 px-2.5 rounded-md text-[11px] font-medium tabular-nums enabled:active:scale-[0.96] transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {zoom100
            ? 'bg-studio-ink text-studio-bg'
            : 'text-studio-muted hover:text-studio-ink'}"
        >
          100%
        </button>
      </div>
    </div>

    <!-- Bottom-Left Workstation Shortcut Bar -->
    <div class="hidden sm:flex items-center gap-2.5 absolute bottom-3 left-3 z-20 px-3 py-1 rounded-md bg-studio-panel/90 backdrop-blur-md border border-studio-border text-[11px] text-studio-muted">
      <span>Click canvas to shatter</span>
      <span class="text-studio-border-strong">&middot;</span>
      <span><kbd class="font-mono text-studio-ink">Space</kbd> reseed</span>
      <span class="text-studio-border-strong">&middot;</span>
      <span><kbd class="font-mono text-studio-ink">C</kbd> compare</span>
    </div>
  {/if}

  {#if hasImage && comparing}
    <span class="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-md bg-studio-panel border border-studio-accent/40 text-xs font-medium text-studio-accent pointer-events-none">
      Original
    </span>
  {/if}

  {#if hasImage && isDragOver}
    <div class="absolute inset-4 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-studio-accent bg-studio-bg/85 backdrop-blur-sm pointer-events-none">
      <span class="px-4 py-2 rounded-lg bg-studio-panel border border-studio-accent/40 text-xs font-medium text-studio-accent">
        Drop to replace image
      </span>
    </div>
  {/if}

  <LoadingOverlay visible={processing && hasImage} />
</section>
