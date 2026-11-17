<script>
  import { getAppState } from '../context.svelte.js';
  import ControlSlider from './ControlSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let {
    onGeoChange,
    onBorderChange,
    onRegenerate,
    onDownload,
    onCopy,
    onClearImpact,
    onFile,
    onBlendFile,
    onBlendRemove,
    onBlendChange,
  } = $props();

  const appState = getAppState();
  let copied = $state(false);
  let copyTimer = null;

  async function handleCopyClick() {
    if (!onCopy) return;
    const ok = await onCopy();
    if (ok) {
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1500);
    }
  }

  const PRESETS = [
    { name: 'Prism', desc: 'Refracted shards', cellCount: 80, jitter: 75, refraction: 65, bevel: 55, borderWidth: 1.5, borderColor: '#0b0c0f' },
    { name: 'Glass', desc: 'Stained bevels', cellCount: 120, jitter: 45, refraction: 35, bevel: 70, borderWidth: 3, borderColor: '#141418' },
    { name: 'Mosaic', desc: 'Flat tiles', cellCount: 90, jitter: 60, refraction: 0, bevel: 15, borderWidth: 1.5, borderColor: '#000000' },
    { name: 'Low Poly', desc: 'Clean facets', cellCount: 220, jitter: 90, refraction: 0, bevel: 35, borderWidth: 0, borderColor: '#000000' },
    { name: 'Cracked', desc: 'Fractured lens', cellCount: 55, jitter: 80, refraction: 85, bevel: 60, borderWidth: 2.5, borderColor: '#050507' },
    { name: 'Fine', desc: 'Micro crystal', cellCount: 400, jitter: 55, refraction: 40, bevel: 30, borderWidth: 0.5, borderColor: '#0b0c0f' },
  ];

  let fileInput = $state();
  let blendFileInput = $state();

  const activePreset = $derived(
    PRESETS.find(
      (p) =>
        p.cellCount === appState.params.cellCount &&
        p.jitter === appState.params.jitter &&
        p.refraction === appState.params.refraction &&
        p.bevel === appState.params.bevel &&
        p.borderWidth === appState.params.borderWidth &&
        p.borderColor.toLowerCase() === appState.params.borderColor.toLowerCase()
    )?.name ?? null
  );

  function applyPreset(preset) {
    appState.params.cellCount = preset.cellCount;
    appState.params.jitter = preset.jitter;
    appState.params.refraction = preset.refraction;
    appState.params.bevel = preset.bevel;
    appState.params.borderWidth = preset.borderWidth;
    appState.params.borderColor = preset.borderColor;
    onGeoChange();
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  function handleBlendFileChange(e) {
    if (e.target.files.length > 0) {
      onBlendFile(e.target.files[0]);
      e.target.value = '';
    }
  }
</script>

<aside class="order-2 md:order-1 w-full md:w-[300px] h-[44dvh] md:h-auto shrink-0 flex flex-col bg-studio-panel border-t md:border-t-0 md:border-r border-studio-border">
  <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

    <!-- Source Image -->
    <button
      type="button"
      onclick={() => fileInput.click()}
      class="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-studio-border-strong bg-studio-elevated/50 hover:bg-studio-elevated hover:border-studio-accent/50 active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
    >
      <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-studio-panel border border-studio-border text-studio-ink shrink-0">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
      <div class="min-w-0">
        <div class="text-xs font-medium text-studio-ink">
          {appState.hasImage ? 'Replace image' : 'Upload image'}
        </div>
        <div class="text-[11px] text-studio-muted truncate">
          {appState.hasImage ? 'Click to load another file' : 'JPG, PNG, or WebP'}
        </div>
      </div>
    </button>
    <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Upload source image" />

    <!-- Presets -->
    <section class="space-y-2.5">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Presets</span>
        <hr class="flex-1 border-t border-studio-border" />
      </div>

      <div class="grid grid-cols-2 gap-1.5">
        {#each PRESETS as preset}
          {@const isActive = activePreset === preset.name}
          <button
            type="button"
            onclick={() => applyPreset(preset)}
            class="flex flex-col items-start p-2.5 rounded-lg border text-left active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {isActive
              ? 'border-studio-accent/60 bg-studio-accent-soft'
              : 'border-studio-border bg-studio-elevated/40 hover:bg-studio-elevated hover:border-studio-border-strong'}"
          >
            <span class="text-[11px] font-display font-semibold {isActive ? 'text-studio-accent' : 'text-studio-ink'}">
              {preset.name}
            </span>
            <span class="text-[10px] text-studio-muted mt-0.5">{preset.desc}</span>
          </button>
        {/each}
      </div>
    </section>

    <!-- Geometry & Shatter -->
    <section class="space-y-3.5">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Geometry</span>
        <hr class="flex-1 border-t border-studio-border" />
      </div>

      <ControlSlider label="Cells" bind:value={appState.params.cellCount} min={5} max={500} step={1} onchange={onGeoChange} />
      <ControlSlider label="Jitter" bind:value={appState.params.jitter} min={0} max={100} step={1} unit="%" onchange={onGeoChange} />
      {#if appState.params.impact}
        <div class="flex items-center justify-between px-2.5 py-2 rounded-lg bg-studio-accent-soft border border-studio-accent/30">
          <span class="text-[11px] font-mono text-studio-accent">Radial impact active</span>
          <button
            type="button"
            onclick={onClearImpact}
            class="text-[11px] font-mono text-studio-ink hover:text-studio-accent transition-colors duration-150"
          >
            Reset to grid
          </button>
        </div>
      {/if}
    </section>

    <section class="space-y-3.5">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Shatter &amp; Edge</span>
        <hr class="flex-1 border-t border-studio-border" />
      </div>

      <ControlSlider label="Refraction" bind:value={appState.params.refraction} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
      <ControlSlider label="Bevel" bind:value={appState.params.bevel} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
      <ControlSlider label="Dispersion" bind:value={appState.params.dispersion} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
      <ControlSlider label="Border Width" bind:value={appState.params.borderWidth} min={0} max={10} step={0.5} unit="px" onchange={onBorderChange} />
      <ColorPicker bind:value={appState.params.borderColor} onchange={onBorderChange} />
    </section>

    <!-- Blend -->
    <section class="space-y-3">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Blend</span>
        <hr class="flex-1 border-t border-studio-border" />
      </div>

      {#if appState.hasBlend}
        <div class="flex items-center justify-between px-2.5 py-2 rounded-lg bg-studio-elevated border border-studio-border">
          <span class="text-[11px] font-mono text-studio-ink truncate">Blend active</span>
          <button
            type="button"
            onclick={onBlendRemove}
            class="text-[11px] font-mono text-studio-muted hover:text-red-400 transition-colors duration-150"
          >
            Remove
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="blend-mode-select" class="text-[11px] font-medium text-studio-muted">Mode</label>
          <select id="blend-mode-select" bind:value={appState.params.blendMode} onchange={onBlendChange}>
            <option value="normal">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="soft-light">Soft Light</option>
          </select>
        </div>

        <ControlSlider label="Opacity" bind:value={appState.params.blendOpacity} min={0} max={100} step={1} unit="%" onchange={onBlendChange} />
      {:else}
        <button
          type="button"
          onclick={() => blendFileInput.click()}
          disabled={!appState.hasImage}
          class="w-full h-11 md:h-9 rounded-lg text-[11px] font-mono text-studio-muted border border-dashed border-studio-border-strong hover:border-studio-accent/50 hover:text-studio-ink disabled:opacity-35 disabled:cursor-not-allowed enabled:active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
        >
          + Add blend image
        </button>
        <input type="file" accept="image/*" bind:this={blendFileInput} onchange={handleBlendFileChange} aria-label="Upload blend image" />
      {/if}
    </section>

    <!-- Export -->
    <section class="space-y-3">
      <div class="flex items-center gap-2.5">
        <span class="text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Export</span>
        <hr class="flex-1 border-t border-studio-border" />
      </div>

      <div class="flex items-center gap-2">
        <select bind:value={appState.params.exportFormat} aria-label="Export format" class="flex-1">
          <option value="png">PNG</option>
          <option value="jpeg">JPEG</option>
          <option value="webp">WebP</option>
        </select>
        {#if appState.params.exportFormat !== 'png'}
          <span class="px-2 py-1 rounded-md bg-studio-elevated border border-studio-border text-[11px] font-mono text-studio-ink tabular-nums">
            {appState.params.exportQuality}%
          </span>
        {/if}
      </div>

      {#if appState.params.exportFormat !== 'png'}
        <ControlSlider label="Quality" bind:value={appState.params.exportQuality} min={10} max={100} step={1} unit="%" />
      {/if}

      <div class="flex items-center gap-2 pt-1">
        <button
          type="button"
          onclick={onRegenerate}
          disabled={!appState.hasImage || appState.processing}
          class="flex-1 inline-flex items-center justify-center gap-1.5 h-11 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.08em] bg-studio-accent text-studio-accent-ink font-medium hover:opacity-90 enabled:active:scale-[0.96] disabled:opacity-25 disabled:cursor-not-allowed transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Reseed
        </button>
        <button
          type="button"
          onclick={handleCopyClick}
          disabled={!appState.hasImage}
          title="Copy PNG to clipboard"
          class="inline-flex items-center justify-center gap-1.5 px-3 h-11 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.08em] bg-studio-elevated text-studio-ink border border-studio-border-strong hover:border-studio-accent/50 enabled:active:scale-[0.96] disabled:opacity-25 disabled:cursor-not-allowed transition-[border-color,transform,opacity] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onclick={onDownload}
          disabled={!appState.hasImage}
          class="flex-1 inline-flex items-center justify-center gap-1.5 h-11 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.08em] bg-studio-elevated text-studio-ink border border-studio-border-strong hover:border-studio-accent/50 enabled:active:scale-[0.96] disabled:opacity-25 disabled:cursor-not-allowed transition-[border-color,transform,opacity] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>
    </section>

  </div>

  <!-- Status Footer -->
  <div class="px-4 py-2.5 border-t border-studio-border bg-studio-bg/40">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-mono text-studio-muted tabular-nums">
      {#if appState.hasImage}
        <span class="text-studio-ink">{appState.srcWidth}&times;{appState.srcHeight}</span>
        <span>{appState.seeds.length || '\u2014'} cells</span>
        <span>j{appState.params.jitter}</span>
        <span>bw{appState.params.borderWidth}</span>
      {:else}
        <span class="text-studio-subtle">Awaiting input&hellip;</span>
      {/if}
    </div>
  </div>
</aside>
