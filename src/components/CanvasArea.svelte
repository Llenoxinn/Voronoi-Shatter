<script>
  import { onMount } from 'svelte';
  import UploadZone from './UploadZone.svelte';
  import LoadingOverlay from './LoadingOverlay.svelte';

  let {
    canvasEl = $bindable(),
    hasImage = false,
    processing = false,
    srcWidth = 0,
    srcHeight = 0,
    onFile,
  } = $props();

  let canvas;

  onMount(() => {
    canvasEl = canvas;
  });
</script>

<section
  class="flex-1 flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#0a0a12] via-[#0f0f1e] to-[#140a24]"
  style="background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 24px 24px;"
>
  {#if !hasImage}
    <UploadZone {onFile} />
  {/if}

  <canvas
    bind:this={canvas}
    class="relative z-10 max-w-full max-h-full rounded-lg shadow-2xl ring-1 ring-white/[0.06]"
    class:invisible={!hasImage}
  ></canvas>

  <LoadingOverlay visible={processing && hasImage} />
</section>
