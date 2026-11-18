<script>
  import { getAppState } from '../context.svelte.js';
  import ControlSlider from './ControlSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';

  const seedId = $props.id();

  let {
    presets = [],
    activePreset = null,
    comparing = $bindable(false),
    onPreset,
    onGeoChange,
    onBorderChange,
    onRegenerate,
    onClearImpact,
    onBlendFile,
    onBlendRemove,
    onBlendChange,
  } = $props();

  const appState = getAppState();
  let blendFileInput = $state();

  function handleBlendFileChange(e) {
    if (e.target.files.length > 0) {
      onBlendFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  function handleSeedChange(e) {
    const parsed = parseInt(e.target.value, 10);
    const next = Number.isFinite(parsed) && parsed >= 1 ? Math.min(1e9, parsed) : 1;
    appState.params.seed = next;
    e.target.value = String(next);
    onGeoChange?.();
  }
</script>

{#if appState.hasImage}
  <aside
    aria-label="Studio properties inspector"
    class="order-3 w-full md:w-[300px] h-[42dvh] md:h-auto shrink-0 flex flex-col bg-studio-panel border-t md:border-t-0 md:border-l border-studio-border overflow-hidden"
  >
    <!-- Mobile Quick Action Strip -->
    <div class="flex md:hidden items-center justify-between gap-2 px-3 py-2 border-b border-studio-border bg-studio-elevated/40">
      <button
        type="button"
        onpointerdown={() => (comparing = true)}
        onpointerup={() => (comparing = false)}
        onpointerleave={() => (comparing = false)}
        onpointercancel={() => (comparing = false)}
        class="h-9 px-3 rounded-lg text-xs font-medium border border-studio-border bg-studio-panel text-studio-ink active:scale-[0.96]"
      >
        Compare
      </button>
      <button
        type="button"
        onclick={onRegenerate}
        disabled={appState.processing}
        class="h-9 px-3.5 rounded-lg text-xs font-medium bg-studio-accent text-studio-accent-ink active:scale-[0.96] disabled:opacity-35"
      >
        Reseed
      </button>
    </div>

    <div class="flex-1 overflow-y-auto overscroll-contain divide-y divide-studio-border">
      <!-- Presets Panel -->
      <section class="px-4 py-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-semibold text-studio-ink">Presets</h2>
          <button
            type="button"
            onclick={onRegenerate}
            disabled={appState.processing}
            class="hidden md:inline-flex items-center text-[11px] font-medium text-studio-accent hover:opacity-80 disabled:opacity-35"
          >
            Reseed
          </button>
        </div>

        <div class="grid grid-cols-3 gap-1.5">
          {#each presets as preset}
            {@const active = activePreset === preset.name}
            <button
              type="button"
              onclick={() => onPreset?.(preset)}
              class="min-h-[36px] md:min-h-0 px-2 py-1.5 rounded-lg text-xs font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                ? 'bg-studio-accent text-studio-accent-ink border-studio-accent'
                : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink hover:border-studio-border-strong'}"
            >
              {preset.name}
            </button>
          {/each}
        </div>
      </section>

      <!-- Geometry & Metric Panel -->
      <section class="px-4 py-3.5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-semibold text-studio-ink">Geometry</h2>
          {#if appState.params.impact}
            <button
              type="button"
              onclick={onClearImpact}
              class="text-[11px] font-medium text-studio-accent hover:underline"
            >
              Reset grid
            </button>
          {/if}
        </div>

        <ControlSlider label="Cells" bind:value={appState.params.cellCount} min={5} max={500} step={1} onchange={onGeoChange} />
        <ControlSlider label="Jitter" bind:value={appState.params.jitter} min={0} max={100} step={1} unit="%" onchange={onGeoChange} />

        <div class="grid grid-cols-[1fr_auto] gap-2 items-end pt-1">
          <div>
            <span class="block text-xs font-medium text-studio-muted mb-1.5">Metric</span>
            <div class="grid grid-cols-3 gap-1 p-1 rounded-lg bg-studio-elevated border border-studio-border" role="group" aria-label="Distance metric">
              {#each [
                { id: 'euclidean', label: 'Crystal' },
                { id: 'manhattan', label: 'Diamond' },
                { id: 'chebyshev', label: 'Grid' },
              ] as m}
                {@const active = appState.params.metric === m.id}
                <button
                  type="button"
                  onclick={() => {
                    appState.params.metric = m.id;
                    onGeoChange();
                  }}
                  class="h-8 md:h-7 rounded-md text-[11px] font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
                    ? 'bg-studio-panel text-studio-ink shadow-sm'
                    : 'text-studio-muted hover:text-studio-ink'}"
                >
                  {m.label}
                </button>
              {/each}
            </div>
          </div>

          <div class="flex flex-col w-24">
            <label for={seedId} class="block text-xs font-medium text-studio-muted mb-1.5">Seed</label>
            <input
              id={seedId}
              type="number"
              min={1}
              max={1000000000}
              step={1}
              inputmode="numeric"
              value={appState.params.seed}
              onchange={handleSeedChange}
              class="w-full h-10 md:h-[38px] px-2 rounded-lg bg-studio-elevated border border-studio-border focus:border-studio-accent focus:outline-none font-mono text-xs font-medium text-studio-ink tabular-nums dark:[color-scheme:dark] transition-colors duration-150"
            />
          </div>
        </div>
      </section>

      <!-- Optics & Edge Panel -->
      <section class="px-4 py-3.5 space-y-3">
        <h2 class="text-xs font-semibold text-studio-ink">Optics &amp; Edge</h2>

        <ControlSlider label="Refraction" bind:value={appState.params.refraction} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Bevel" bind:value={appState.params.bevel} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Dispersion" bind:value={appState.params.dispersion} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
        <ControlSlider label="Border Width" bind:value={appState.params.borderWidth} min={0} max={10} step={0.5} unit="px" onchange={onBorderChange} />

        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onclick={() => {
              appState.params.transparentBorder = !appState.params.transparentBorder;
              onBorderChange();
            }}
            aria-pressed={appState.params.transparentBorder}
            class="h-9 md:h-8 px-2.5 rounded-lg text-xs font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {appState.params.transparentBorder
              ? 'bg-studio-ink text-studio-bg border-studio-ink'
              : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
          >
            Cutout Gaps
          </button>
          <button
            type="button"
            onclick={() => {
              appState.params.wireframe = !appState.params.wireframe;
              onBorderChange();
            }}
            aria-pressed={appState.params.wireframe}
            class="h-9 md:h-8 px-2.5 rounded-lg text-xs font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {appState.params.wireframe
              ? 'bg-studio-ink text-studio-bg border-studio-ink'
              : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
          >
            Wireframe
          </button>
        </div>

        <ColorPicker bind:value={appState.params.borderColor} onchange={onBorderChange} />
      </section>

      <!-- Blend Layer Panel -->
      <section class="px-4 py-3.5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-semibold text-studio-ink">Blend Layer</h2>
          {#if appState.hasBlend}
            <button
              type="button"
              onclick={onBlendRemove}
              class="text-xs font-medium text-studio-accent hover:underline"
            >
              Remove
            </button>
          {/if}
        </div>

        {#if appState.hasBlend}
          <div class="grid grid-cols-5 gap-1">
            {#each [
              { id: 'normal', label: 'Norm' },
              { id: 'multiply', label: 'Mult' },
              { id: 'screen', label: 'Scrn' },
              { id: 'overlay', label: 'Ovly' },
              { id: 'soft-light', label: 'Soft' },
            ] as mode}
              {@const active = appState.params.blendMode === mode.id}
              <button
                type="button"
                onclick={() => {
                  appState.params.blendMode = mode.id;
                  onBlendChange();
                }}
                class="h-8 md:h-7 rounded-md text-[11px] font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                  ? 'bg-studio-ink text-studio-bg border-studio-ink'
                  : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
              >
                {mode.label}
              </button>
            {/each}
          </div>
          <ControlSlider label="Opacity" bind:value={appState.params.blendOpacity} min={0} max={100} step={1} unit="%" onchange={onBlendChange} />
        {:else}
          <button
            type="button"
            onclick={() => blendFileInput.click()}
            class="w-full h-10 md:h-9 rounded-lg text-xs font-medium text-studio-muted border border-dashed border-studio-border-strong hover:border-studio-accent/60 hover:text-studio-ink active:scale-[0.96] transition-[border-color,color,transform] duration-150"
          >
            + Add blend image
          </button>
          <input type="file" accept="image/*" bind:this={blendFileInput} onchange={handleBlendFileChange} aria-label="Upload blend image" />
        {/if}
      </section>

      <!-- Export Format Panel -->
      <section class="px-4 py-3.5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-xs font-semibold text-studio-ink">Export Format</h2>
          {#if appState.params.exportFormat !== 'png' && appState.params.exportFormat !== 'svg'}
            <span class="font-mono text-xs font-semibold text-studio-ink tabular-nums">
              {appState.params.exportQuality}%
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-4 gap-1 p-1 rounded-lg bg-studio-elevated border border-studio-border" role="group" aria-label="Export format">
          {#each [
            { id: 'png', label: 'PNG' },
            { id: 'jpeg', label: 'JPEG' },
            { id: 'webp', label: 'WebP' },
            { id: 'svg', label: 'SVG' },
          ] as fmt}
            {@const active = appState.params.exportFormat === fmt.id}
            <button
              type="button"
              onclick={() => (appState.params.exportFormat = fmt.id)}
              class="h-9 md:h-7 rounded-md text-xs font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
                ? 'bg-studio-panel text-studio-ink shadow-sm'
                : 'text-studio-muted hover:text-studio-ink'}"
            >
              {fmt.label}
            </button>
          {/each}
        </div>

        {#if appState.params.exportFormat !== 'png' && appState.params.exportFormat !== 'svg'}
          <ControlSlider label="Quality" bind:value={appState.params.exportQuality} min={10} max={100} step={1} unit="%" />
        {/if}
      </section>
    </div>
  </aside>
{/if}
