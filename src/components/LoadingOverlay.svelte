<script>
  let { visible = false } = $props();
</script>

{#if visible}
  <div
    role="status"
    aria-live="polite"
    class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-studio-bg/65 backdrop-blur-sm transition-opacity duration-200 ease-[var(--ease-out)]"
  >
    <div class="flex flex-col items-center gap-3 px-5 py-4 rounded-xl bg-studio-panel border border-studio-border-strong shadow-xl">
      <div class="relative w-6 h-6">
        <div class="absolute inset-0 rounded-full border-2 border-studio-border-strong"></div>
        <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-studio-accent animate-[spin_650ms_linear_infinite]"></div>
      </div>
      <span class="text-xs font-medium text-studio-muted">Processing&hellip;</span>
    </div>
  </div>
{/if}
