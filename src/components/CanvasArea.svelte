<script>
  import UploadZone from './UploadZone.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';

  let {
    canvasEl = $bindable(),
    hasImage = false,
    processing = false,
    srcData = null,
    impact = null,
    comparing = $bindable(false),
    onFile,
    onSample,
    onImpact,
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
>
  {#if !hasImage}
    <UploadZone {onFile} {onSample} />
  {/if}

  <div class="relative flex items-center justify-center w-full h-full pt-6 pb-24 px-4 sm:px-10">
    <div class="relative flex items-center justify-center max-w-full max-h-full">
      <canvas
        bind:this={canvasEl}
        onclick={handleCanvasClick}
        title={hasImage ? 'Click anywhere to set shatter impact point' : undefined}
        class="block max-w-full max-h-full rounded-xl ring-1 ring-black/10 dark:ring-white/10 shadow-[0_24px_60px_rgba(17,17,19,0.12)] dark:shadow-[0_28px_72px_rgba(0,0,0,0.6)] {hasImage ? 'cursor-crosshair' : 'pointer-events-none'}"
        class:opacity-0={!hasImage || comparing}
      ></canvas>

      {#if hasImage && impact && !comparing}
        <div
          aria-hidden="true"
          class="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/75 shadow-sm pointer-events-none"
          style="left: {impact.x * 100}%; top: {impact.y * 100}%;"
        ></div>
      {/if}
    </div>

    {#if hasImage && comparing}
      <canvas
        bind:this={compareCanvas}
        class="absolute max-w-[calc(100%-2rem)] sm:max-w-[calc(100%-5rem)] max-h-[calc(100%-7.5rem)] rounded-xl ring-1 ring-studio-accent/60 shadow-[0_24px_60px_rgba(17,17,19,0.12)] pointer-events-none"
      ></canvas>
      <span class="absolute top-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-studio-panel border border-studio-accent/40 text-xs font-medium text-studio-accent">
        Original
      </span>
    {/if}
  </div>

  {#if hasImage && isDragOver}
    <div class="absolute inset-4 z-40 flex items-center justify-center rounded-2xl border-2 border-dashed border-studio-accent bg-studio-bg/85 backdrop-blur-sm pointer-events-none">
      <span class="px-4 py-2 rounded-full bg-studio-panel border border-studio-accent/40 text-xs font-medium text-studio-accent">
        Drop to replace image
      </span>
    </div>
  {/if}

  <LoadingOverlay visible={processing && hasImage} />
</section>
