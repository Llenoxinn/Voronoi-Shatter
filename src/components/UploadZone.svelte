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

<div class="absolute inset-0 z-20 flex items-center justify-center px-5 py-8 sm:px-10 overflow-y-auto overscroll-contain">
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center w-full max-w-4xl">
    <div class="md:col-span-7 flex flex-col items-start text-left">
      <h1 class="font-display font-[579] text-4xl sm:text-5xl leading-[1.08] tracking-[-0.025em] text-studio-ink text-balance">
        Shatter imagery into crystal geometry.
      </h1>

      <p class="mt-4 text-sm sm:text-base text-studio-muted leading-relaxed max-w-[44ch] text-pretty">
        Voronoi tessellation with per-shard optical refraction, directional bevels, chromatic dispersion, and radial impact points.
      </p>

      <div class="flex flex-wrap items-center gap-3 mt-7">
        <button
          type="button"
          onclick={handleClick}
          class="inline-flex items-center justify-center gap-2 min-h-[44px] h-11 px-5 rounded-xl bg-studio-ink text-studio-bg text-sm font-medium hover:opacity-90 motion-safe:enabled:active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Browse image
        </button>

        {#if onSample}
          <button
            type="button"
            onclick={onSample}
            class="inline-flex items-center justify-center min-h-[44px] h-11 px-5 rounded-xl bg-studio-panel border border-studio-border-strong text-studio-ink text-sm font-medium hover:border-studio-accent hover:text-studio-accent motion-safe:enabled:active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
          >
            Load sample
          </button>
        {/if}
      </div>
    </div>

    <div class="md:col-span-5">
      <div
        role="button"
        tabindex="0"
        aria-label="Drop an image here or click to browse"
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
        class="group relative flex flex-col items-center justify-center aspect-[4/3] md:aspect-[4/5] w-full p-6 rounded-2xl border border-dashed cursor-pointer transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60 {isDragOver
          ? 'border-studio-accent bg-studio-accent-soft motion-safe:scale-[1.01]'
          : 'border-studio-border-strong bg-studio-panel hover:border-studio-ink/40'}"
      >
        <div class="flex items-center justify-center w-11 h-11 rounded-xl bg-studio-elevated border border-studio-border text-studio-ink group-hover:text-studio-accent transition-colors duration-150 ease-[var(--ease-out)]">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
        </div>

        <span class="mt-4 text-sm font-medium text-studio-ink">
          {isDragOver ? 'Release to shatter' : 'Drop artwork here'}
        </span>
        <span class="mt-1 text-xs text-studio-muted">
          JPG, PNG, or WebP &middot; or paste
        </span>
      </div>
    </div>
  </div>
</div>
