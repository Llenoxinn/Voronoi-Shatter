<script>
  let { visible = false } = $props();
</script>

{#if visible}
  <div class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300">
    <div class="relative w-10 h-10 mb-4">
      <div class="absolute inset-0 rounded-full border-2 border-white/[0.06]"></div>
      <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
      <div class="absolute inset-[3px] rounded-full border-2 border-transparent border-r-accent-light animate-spin-slow" style="animation-direction: reverse;"></div>
    </div>
    <p class="text-sm text-white/40 font-medium tracking-wide">Shattering&hellip;</p>
  </div>
{/if}
