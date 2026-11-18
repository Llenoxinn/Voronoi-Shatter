<script>
  import { onDestroy } from 'svelte';
  import { getAppState } from '../context.svelte.js';
  import ControlSlider from './ControlSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let {
    open = true,
    presets = [],
    activePreset = null,
    onPreset,
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

  let fileInput = $state();
  let blendFileInput = $state();
  let copied = $state(false);
  let copyTimer = null;

  onDestroy(() => {
    clearTimeout(copyTimer);
  });

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

  async function handleCopyClick() {
    if (!onCopy) return;
    const ok = await onCopy();
    if (ok) {
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = false), 1500);
    }
  }
</script>

{#if open && appState.hasImage}
  <aside
    aria-label="Inspector controls"
    class="fixed z-30 inset-x-3 bottom-3 max-h-[46dvh] md:inset-x-auto md:top-16 md:right-6 md:bottom-4 md:max-h-none md:w-[296px] flex flex-col rounded-2xl bg-studio-panel backdrop-blur-xl border border-studio-border shadow-[0_16px_48px_rgba(17,17,19,0.1),inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
  >
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-3 divide-y divide-studio-border">

      <!-- Source -->
      <div class="pb-3.5">
        <button
          type="button"
          onclick={() => fileInput.click()}
          class="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-studio-elevated/70 hover:bg-studio-elevated border border-studio-border hover:border-studio-border-strong active:scale-[0.96] transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
        >
          <span class="text-xs font-medium text-studio-ink">Replace image</span>
          <span class="text-[10px] font-mono uppercase tracking-[0.08em] text-studio-muted">Browse</span>
        </button>
        <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Replace source image" />

        <!-- Mobile-only presets inside drawer -->
        <div class="grid grid-cols-3 gap-1.5 mt-3 md:hidden">
          {#each presets as preset}
            {@const active = activePreset === preset.name}
            <button
              type="button"
              onclick={() => onPreset?.(preset)}
              class="px-2 py-1.5 rounded-lg text-[10px] font-mono border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                ? 'bg-studio-accent text-studio-accent-ink border-studio-accent font-medium'
                : 'bg-studio-elevated/50 text-studio-muted border-studio-border'}"
            >
              {preset.name}
            </button>
          {/each}
        </div>
      </div>

      <!-- Geometry -->
      <section class="py-3.5 space-y-3">
        <span class="block text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Geometry</span>
        <ControlSlider label="Cells" bind:value={appState.params.cellCount} min={5} max={500} step={1} onchange={onGeoChange} />
        <ControlSlider label="Jitter" bind:value={appState.params.jitter} min={0} max={100} step={1} unit="%" onchange={onGeoChange} />
        {#if appState.params.impact}
          <div class="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-studio-accent-soft border border-studio-accent/25">
            <span class="text-[11px] font-mono text-studio-accent">Radial impact</span>
            <button
              type="button"
              onclick={onClearImpact}
              class="text-[11px] font-mono text-studio-ink hover:text-studio-accent transition-colors duration-150"
            >
              Reset grid
            </button>
          </div>
        {/if}
      </section>

      <!-- Shatter & Edge -->
      <section class="py-3.5 space-y-3">
        <span class="block text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Optics &amp; Edge</span>
        <ControlSlider label="Refraction" bind:value={appState.params.refraction} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Bevel" bind:value={appState.params.bevel} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Dispersion" bind:value={appState.params.dispersion} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Border Width" bind:value={appState.params.borderWidth} min={0} max={10} step={0.5} unit="px" onchange={onBorderChange} />
        <ColorPicker bind:value={appState.params.borderColor} onchange={onBorderChange} />
      </section>

      <!-- Blend -->
      <section class="py-3.5 space-y-3">
        <span class="block text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Blend Layer</span>
        {#if appState.hasBlend}
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-mono text-studio-ink">Overlay active</span>
            <button
              type="button"
              onclick={onBlendRemove}
              class="text-[11px] font-mono text-studio-muted hover:text-studio-accent transition-colors duration-150"
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
            class="w-full h-10 md:h-9 rounded-lg text-[11px] font-mono text-studio-muted border border-dashed border-studio-border-strong hover:border-studio-accent/60 hover:text-studio-ink active:scale-[0.96] transition-[border-color,color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
          >
            + Add blend image
          </button>
          <input type="file" accept="image/*" bind:this={blendFileInput} onchange={handleBlendFileChange} aria-label="Upload blend image" />
        {/if}
      </section>

      <!-- Export -->
      <section class="pt-3.5 pb-1 space-y-3">
        <span class="block text-[10px] font-mono uppercase tracking-[0.14em] text-studio-subtle">Export</span>
        <div class="flex items-center gap-2">
          <select bind:value={appState.params.exportFormat} aria-label="Export format" class="flex-1">
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
          {#if appState.params.exportFormat !== 'png'}
            <span class="px-2 py-1 rounded-md bg-studio-elevated text-[11px] font-mono text-studio-ink tabular-nums">
              {appState.params.exportQuality}%
            </span>
          {/if}
        </div>

        {#if appState.params.exportFormat !== 'png'}
          <ControlSlider label="Quality" bind:value={appState.params.exportQuality} min={10} max={100} step={1} unit="%" />
        {/if}

        <div class="flex items-center gap-1.5 pt-1">
          <button
            type="button"
            onclick={onRegenerate}
            disabled={appState.processing}
            class="flex-1 inline-flex items-center justify-center gap-1.5 h-10 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.06em] bg-studio-accent text-studio-accent-ink font-medium hover:opacity-90 enabled:active:scale-[0.96] disabled:opacity-30 disabled:cursor-not-allowed transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
          >
            Reseed
          </button>
          <button
            type="button"
            onclick={handleCopyClick}
            class="px-3 h-10 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.06em] bg-studio-elevated text-studio-ink border border-studio-border hover:border-studio-border-strong active:scale-[0.96] transition-[border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onclick={onDownload}
            class="flex-1 inline-flex items-center justify-center h-10 md:h-9 rounded-lg text-[11px] font-mono uppercase tracking-[0.06em] bg-studio-ink text-studio-bg font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50"
          >
            Export
          </button>
        </div>
      </section>

    </div>
  </aside>
{/if}
