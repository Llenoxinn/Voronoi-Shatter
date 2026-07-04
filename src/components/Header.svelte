<script>
  let { hasImage, onChangeImage } = $props();
</script>

<header class="flex items-center justify-between h-14 px-6 shrink-0 bg-black/40 backdrop-blur-xl border-b border-white/[0.04]">
  <h1 class="flex items-center gap-2.5 text-base font-semibold tracking-tight">
    <span class="text-accent text-lg leading-none">&#9670;</span>
    <span>Voronoi Shatter</span>
  </h1>
  {#if hasImage}
    <button
      onclick={onChangeImage}
      class="text-xs font-medium text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-md hover:bg-white/[0.04]"
    >
      Change Image
    </button>
  {/if}
</header>
