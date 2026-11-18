<script>
  import UploadZone from './UploadZone.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';

  let {
    canvasEl = $bindable(),
    hasImage = false,
    processing = false,
    srcData = null,
    impact = null,
    presets = [],
    activePreset = null,
    inspectorOpen = true,
    comparing = $bindable(false),
    onFile,
    onSample,
    onImpact,
    onPreset,
  } = $props();

  let compareCanvas = $state();
  let isDragOver = $state(false);

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
  class="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-studio-bg"
  style="background-image: radial-gradient(var(--studio-grid-dot) 1px, transparent 1px); background-size: 24px 24px;"
>
  {#if !hasImage}
    <UploadZone {onFile} {onSample} />
  {/if}

  <div
    class="relative flex items-center justify-center w-full h-full pt-16 pb-20 px-4 sm:px-8 transition-[padding] duration-200 ease-[var(--ease-out)] {hasImage && inspectorOpen
      ? 'md:pr-[336px]'
      : ''}"
  >
    <div class="relative flex items-center justify-center max-w-full max-h-full">
      <canvas
        bind:this={canvasEl}
        onclick={handleCanvasClick}
        title={hasImage ? 'Click anywhere to set shatter epicenter' : undefined}
        class="block max-w-full max-h-full rounded-xl ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_60px_rgba(17,17,19,0.14)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.65)] transition-opacity duration-200 ease-[var(--ease-out)] {hasImage ? 'cursor-crosshair' : 'pointer-events-none'}"
        class:opacity-0={!hasImage || comparing}
      ></canvas>

      {#if hasImage && impact && !comparing}
        <div
          aria-hidden="true"
          class="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/70 shadow-sm pointer-events-none"
          style="left: {impact.x * 100}%; top: {impact.y * 100}%;"
        ></div>
      {/if}
    </div>

    {#if hasImage && comparing}
      <canvas
        bind:this={compareCanvas}
        class="absolute max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-4rem)] max-h-[calc(100%-9rem)] rounded-xl ring-1 ring-studio-accent/60 shadow-[0_24px_60px_rgba(17,17,19,0.14)] pointer-events-none"
      ></canvas>
      <span class="absolute top-16 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-studio-panel backdrop-blur-md border border-studio-accent/40 text-[10px] font-mono uppercase tracking-[0.14em] text-studio-accent">
        Original
      </span>
    {/if}
  </div>

  {#if hasImage && isDragOver}
    <div class="absolute inset-4 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-studio-accent bg-studio-bg/85 backdrop-blur-sm pointer-events-none">
      <span class="px-4 py-2 rounded-full bg-studio-panel border border-studio-accent/40 text-xs font-mono text-studio-accent">
        Drop to replace image
      </span>
    </div>
  {/if}

  <LoadingOverlay visible={processing && hasImage} />

  {#if hasImage}
    <!-- Bottom-Left Floating Preset Dock -->
    <div class="hidden md:flex items-center gap-1 fixed bottom-4 left-6 z-20 p-1.5 rounded-2xl bg-studio-panel backdrop-blur-xl border border-studio-border shadow-[0_8px_24px_rgba(17,17,19,0.06),inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]">
      {#each presets as preset}
        {@const active = activePreset === preset.name}
        <button
          type="button"
          onclick={() => onPreset?.(preset)}
          class="px-3 py-1.5 rounded-lg text-[11px] font-mono transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {active
            ? 'bg-studio-accent text-studio-accent-ink font-medium'
            : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
        >
          {preset.name}
        </button>
      {/each}
    </div>

    <!-- Bottom-Right Compare & Shortcut Pill -->
    <div
      class="flex items-center gap-2 fixed bottom-4 right-4 sm:right-6 z-20 transition-[right] duration-200 ease-[var(--ease-out)] {inspectorOpen
        ? 'md:right-[336px]'
        : ''}"
    >
      <button
        type="button"
        onpointerdown={() => (comparing = true)}
        onpointerup={() => (comparing = false)}
        onpointerleave={() => (comparing = false)}
        onpointercancel={() => (comparing = false)}
        class="px-3.5 py-2 md:py-1.5 rounded-xl bg-studio-panel backdrop-blur-xl border text-[10px] font-mono uppercase tracking-[0.1em] shadow-[0_8px_24px_rgba(17,17,19,0.06)] active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] {comparing
          ? 'border-studio-accent text-studio-accent'
          : 'border-studio-border text-studio-ink hover:border-studio-border-strong'}"
      >
        Hold to compare
      </button>

      <div class="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-studio-panel backdrop-blur-xl border border-studio-border text-[10px] font-mono text-studio-muted">
        <span><kbd class="text-studio-ink">Click</kbd> impact</span>
        <span class="text-studio-border-strong">&middot;</span>
        <span><kbd class="text-studio-ink">Space</kbd> reseed</span>
        <span class="text-studio-border-strong">&middot;</span>
        <span><kbd class="text-studio-ink">C</kbd> compare</span>
      </div>
    </div>
  {/if}
</section>
