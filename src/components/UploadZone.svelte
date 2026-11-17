<script>
  let { onFile, onSample } = $props();
  let isDragOver = $state(false);

  function handleDragOver(e) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer.files.length > 0) onFile(e.dataTransfer.files[0]);
  }

  function handleClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      if (input.files.length > 0) onFile(input.files[0]);
    };
    input.click();
  }
</script>

<div
  role="button"
  tabindex="0"
  aria-label="Upload an image by dropping or clicking to browse"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
  class="absolute inset-0 z-20 flex items-center justify-center p-6 cursor-pointer focus-visible:outline-none"
>
  <div
    class="flex flex-col items-center justify-center w-full max-w-md px-8 py-12 rounded-2xl border border-dashed shadow-sm transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out)] {isDragOver
      ? 'border-studio-accent bg-studio-accent-soft scale-[1.01]'
      : 'border-studio-border-strong bg-studio-panel/85 backdrop-blur-sm hover:border-studio-accent/50 hover:bg-studio-panel'}"
  >
    <div
      class="flex items-center justify-center w-12 h-12 mb-5 rounded-xl bg-studio-elevated border border-studio-border-strong text-studio-ink transition-transform duration-200 ease-[var(--ease-out)] {!isDragOver
        ? 'animate-float'
        : 'scale-105 text-studio-accent'}"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    </div>

    <h2 class="text-base font-display font-semibold tracking-tight text-studio-ink">
      {isDragOver ? 'Release to shatter image' : 'Drop an image to begin'}
    </h2>
    <p class="text-xs text-studio-muted mt-1.5">
      or click anywhere in this frame to browse
    </p>

    <div class="flex items-center gap-1.5 mt-5">
      {#each ['JPG', 'PNG', 'WebP'] as fmt}
        <span class="px-2 py-0.5 rounded-md bg-studio-elevated border border-studio-border text-[10px] font-mono text-studio-muted">
          {fmt}
        </span>
      {/each}
    </div>

    {#if onSample}
      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          onSample();
        }}
        class="mt-5 px-3.5 py-1.5 rounded-lg text-[11px] font-mono text-studio-ink bg-studio-elevated border border-studio-border-strong hover:border-studio-accent/60 hover:text-studio-accent active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
      >
        Load sample artwork
      </button>
    {/if}
  </div>
</div>
