<script>
  import { onMount } from 'svelte';
  import UploadZone from './UploadZone.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';

  let {
    canvasEl = $bindable(),
    hasImage = false,
    processing = false,
    srcData = null,
    comparing = $bindable(false),
    onFile,
    onSample,
  } = $props();

  let canvas;
  let compareCanvas = $state();

  onMount(() => {
    canvasEl = canvas;
  });

  $effect(() => {
    if (comparing && compareCanvas && srcData) {
      compareCanvas.width = srcData.width;
      compareCanvas.height = srcData.height;
      compareCanvas.getContext('2d').putImageData(srcData, 0, 0);
    }
  });
</script>

<section
  aria-label="Canvas workspace"
  class="flex-1 flex items-center justify-center relative overflow-hidden bg-studio-bg"
  style="background-image: radial-gradient(circle at 50% 45%, var(--studio-glow), transparent 55%), radial-gradient(var(--studio-grid-dot) 1px, transparent 1px); background-size: 100% 100%, 24px 24px;"
>
  {#if !hasImage}
    <UploadZone {onFile} {onSample} />
  {/if}

  <div class="relative flex items-center justify-center w-full h-full p-6 md:p-10">
    <canvas
      bind:this={canvas}
      class="block max-w-full max-h-full rounded-xl ring-1 ring-black/10 dark:ring-white/10 shadow-[0_20px_50px_rgba(20,20,24,0.12)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] transition-opacity duration-200 ease-[var(--ease-out)]"
      class:opacity-0={!hasImage || comparing}
      class:pointer-events-none={!hasImage}
    ></canvas>

    {#if hasImage && comparing}
      <canvas
        bind:this={compareCanvas}
        class="absolute max-w-[calc(100%-3rem)] md:max-w-[calc(100%-5rem)] max-h-[calc(100%-3rem)] md:max-h-[calc(100%-5rem)] rounded-xl ring-1 ring-studio-accent/50 shadow-[0_24px_64px_rgba(0,0,0,0.65)] pointer-events-none"
      ></canvas>
      <span class="absolute top-6 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-studio-panel/90 border border-studio-accent/40 text-[10px] font-mono uppercase tracking-[0.14em] text-studio-accent">
        Original
      </span>
    {/if}
  </div>

  <LoadingOverlay visible={processing && hasImage} />

  {#if hasImage}
    <div class="flex items-center gap-2.5 absolute bottom-4 right-5">
      <button
        type="button"
        onpointerdown={() => (comparing = true)}
        onpointerup={() => (comparing = false)}
        onpointerleave={() => (comparing = false)}
        onpointercancel={() => (comparing = false)}
        class="px-3 py-1.5 rounded-full bg-studio-panel/90 backdrop-blur-md border text-[10px] font-mono uppercase tracking-[0.1em] active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] {comparing
          ? 'border-studio-accent text-studio-accent'
          : 'border-studio-border text-studio-ink hover:border-studio-border-strong'}"
      >
        Hold to compare
      </button>

      <div class="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full bg-studio-panel/85 backdrop-blur-md border border-studio-border text-[10px] font-mono text-studio-muted">
        <span><kbd class="text-studio-ink">Space</kbd> reseed</span>
        <span class="text-studio-border-strong">&middot;</span>
        <span><kbd class="text-studio-ink">C</kbd> compare</span>
        <span class="text-studio-border-strong">&middot;</span>
        <span><kbd class="text-studio-ink">Ctrl+S</kbd> export</span>
        <span class="text-studio-border-strong">&middot;</span>
        <span><kbd class="text-studio-ink">Ctrl+Z</kbd> reset</span>
      </div>
    </div>
  {/if}
</section>
