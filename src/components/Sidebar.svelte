<script>
  import { onDestroy } from 'svelte';
  import { getAppState } from '../context.svelte.js';
  import ControlSlider from './ControlSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let {
    presets = [],
    activePreset = null,
    comparing = $bindable(false),
    onPreset,
    onGeoChange,
    onBorderChange,
    onRegenerate,
    onDownload,
    onCopy,
    onClearImpact,
    onBlendFile,
    onBlendRemove,
    onBlendChange,
  } = $props();

  const appState = getAppState();

  let activeTab = $state(null); // 'geometry' | 'optics' | 'blend' | 'export' | null
  let blendFileInput = $state();
  let copied = $state(false);
  let copyTimer = null;

  onDestroy(() => {
    clearTimeout(copyTimer);
  });

  function toggleTab(tab) {
    activeTab = activeTab === tab ? null : tab;
  }

  function handleWindowKeydown(e) {
    if (e.key === 'Escape' && activeTab) {
      activeTab = null;
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

<svelte:window onkeydown={handleWindowKeydown} />

{#if appState.hasImage}
  <div class="fixed bottom-4 inset-x-0 z-30 flex flex-col items-center px-3 pointer-events-none">
    <!-- Tabbed Control Tray (opens cleanly above the dock) -->
    {#if activeTab}
      <div
        role="region"
        aria-label="{activeTab} controls"
        class="pointer-events-auto w-full max-w-xl mb-2.5 p-4 rounded-2xl bg-studio-panel/95 backdrop-blur-xl border border-studio-border-strong shadow-[0_20px_56px_rgba(17,17,19,0.14)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.65)] max-h-[45dvh] overflow-y-auto overscroll-contain"
      >
        <div class="flex items-center justify-between mb-3 pb-2 border-b border-studio-border">
          <span class="text-xs font-semibold text-studio-ink capitalize">{activeTab}</span>
          <button
            type="button"
            onclick={() => (activeTab = null)}
            aria-label="Close {activeTab} panel"
            class="text-xs text-studio-muted hover:text-studio-ink px-1.5 py-0.5 rounded-md transition-colors duration-150"
          >
            Done
          </button>
        </div>

        {#if activeTab === 'geometry'}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ControlSlider label="Cells" bind:value={appState.params.cellCount} min={5} max={500} step={1} onchange={onGeoChange} />
            <ControlSlider label="Jitter" bind:value={appState.params.jitter} min={0} max={100} step={1} unit="%" onchange={onGeoChange} />
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-4 pt-3 border-t border-studio-border">
            {#each presets as preset}
              {@const active = activePreset === preset.name}
              <button
                type="button"
                onclick={() => onPreset?.(preset)}
                class="min-h-[38px] md:min-h-0 px-2 py-1.5 rounded-lg text-xs font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                  ? 'bg-studio-accent text-studio-accent-ink border-studio-accent'
                  : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
              >
                {preset.name}
              </button>
            {/each}
          </div>

          {#if appState.params.impact}
            <div class="flex items-center justify-between mt-3 px-3 py-2 rounded-lg bg-studio-accent-soft border border-studio-accent/25">
              <span class="text-xs font-medium text-studio-accent">Radial impact active</span>
              <button
                type="button"
                onclick={onClearImpact}
                class="text-xs font-medium text-studio-ink hover:text-studio-accent transition-colors duration-150"
              >
                Reset to grid
              </button>
            </div>
          {/if}
        {:else if activeTab === 'optics'}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ControlSlider label="Refraction" bind:value={appState.params.refraction} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
            <ControlSlider label="Bevel" bind:value={appState.params.bevel} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
            <ControlSlider label="Dispersion" bind:value={appState.params.dispersion} min={0} max={100} step={1} unit="%" onchange={onBorderChange} />
            <ControlSlider label="Border Width" bind:value={appState.params.borderWidth} min={0} max={10} step={0.5} unit="px" onchange={onBorderChange} />
          </div>
          <div class="mt-4 pt-3 border-t border-studio-border">
            <ColorPicker bind:value={appState.params.borderColor} onchange={onBorderChange} />
          </div>
        {:else if activeTab === 'blend'}
          {#if appState.hasBlend}
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs text-studio-ink">Blend overlay active</span>
                <button
                  type="button"
                  onclick={onBlendRemove}
                  class="text-xs font-medium text-studio-accent hover:underline"
                >
                  Remove
                </button>
              </div>
              <div class="grid grid-cols-5 gap-1.5">
                {#each [
                  { id: 'normal', label: 'Normal' },
                  { id: 'multiply', label: 'Multiply' },
                  { id: 'screen', label: 'Screen' },
                  { id: 'overlay', label: 'Overlay' },
                  { id: 'soft-light', label: 'Soft' },
                ] as mode}
                  {@const active = appState.params.blendMode === mode.id}
                  <button
                    type="button"
                    onclick={() => {
                      appState.params.blendMode = mode.id;
                      onBlendChange();
                    }}
                    class="min-h-[40px] md:min-h-0 px-2 py-1.5 rounded-lg text-xs font-medium border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-150 {active
                      ? 'bg-studio-ink text-studio-bg border-studio-ink'
                      : 'bg-studio-elevated/60 text-studio-muted border-studio-border hover:text-studio-ink'}"
                  >
                    {mode.label}
                  </button>
                {/each}
              </div>
              <ControlSlider label="Opacity" bind:value={appState.params.blendOpacity} min={0} max={100} step={1} unit="%" onchange={onBlendChange} />
            </div>
          {:else}
            <button
              type="button"
              onclick={() => blendFileInput.click()}
              class="w-full h-11 rounded-xl text-xs font-medium text-studio-muted border border-dashed border-studio-border-strong hover:border-studio-accent/60 hover:text-studio-ink active:scale-[0.96] transition-[border-color,color,transform] duration-150"
            >
              + Add blend image
            </button>
            <input type="file" accept="image/*" bind:this={blendFileInput} onchange={handleBlendFileChange} aria-label="Upload blend image" />
          {/if}
        {:else if activeTab === 'export'}
          <div class="space-y-4">
            <div class="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-studio-elevated border border-studio-border" role="group" aria-label="Export format">
              {#each [
                { id: 'png', label: 'PNG' },
                { id: 'jpeg', label: 'JPEG' },
                { id: 'webp', label: 'WebP' },
              ] as fmt}
                {@const active = appState.params.exportFormat === fmt.id}
                <button
                  type="button"
                  onclick={() => (appState.params.exportFormat = fmt.id)}
                  class="h-10 md:h-8 rounded-lg text-xs font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
                    ? 'bg-studio-panel text-studio-ink shadow-sm'
                    : 'text-studio-muted hover:text-studio-ink'}"
                >
                  {fmt.label}
                </button>
              {/each}
            </div>
            {#if appState.params.exportFormat !== 'png'}
              <ControlSlider label="Quality" bind:value={appState.params.exportQuality} min={10} max={100} step={1} unit="%" />
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Bottom-Docked Studio Command Bar -->
    <div class="pointer-events-auto flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 p-1.5 rounded-2xl bg-studio-panel/95 backdrop-blur-xl border border-studio-border-strong shadow-[0_16px_44px_rgba(17,17,19,0.12)] dark:shadow-[0_20px_56px_rgba(0,0,0,0.65)] max-w-full">
      <!-- Mode Tabs -->
      <div class="flex items-center gap-1">
        {#each [
          { id: 'geometry', label: 'Geometry' },
          { id: 'optics', label: 'Optics' },
          { id: 'blend', label: 'Blend' },
          { id: 'export', label: 'Format' },
        ] as tab}
          {@const active = activeTab === tab.id}
          <button
            type="button"
            onclick={() => toggleTab(tab.id)}
            aria-expanded={active}
            class="h-10 md:h-9 px-2.5 sm:px-3 rounded-[10px] text-xs font-medium active:scale-[0.96] transition-[background-color,color,transform] duration-150 {active
              ? 'bg-studio-ink text-studio-bg'
              : 'text-studio-muted hover:text-studio-ink hover:bg-studio-elevated'}"
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <span class="hidden sm:inline-block w-px h-5 bg-studio-border-strong mx-1" aria-hidden="true"></span>

      <!-- Primary Actions -->
      <div class="flex items-center gap-1">
        <button
          type="button"
          onpointerdown={() => (comparing = true)}
          onpointerup={() => (comparing = false)}
          onpointerleave={() => (comparing = false)}
          onpointercancel={() => (comparing = false)}
          class="h-10 md:h-9 px-2.5 sm:px-3 rounded-[10px] text-xs font-medium border active:scale-[0.96] transition-[border-color,color,transform] duration-150 {comparing
            ? 'border-studio-accent text-studio-accent bg-studio-accent-soft'
            : 'border-studio-border bg-studio-elevated/60 text-studio-ink hover:border-studio-border-strong'}"
        >
          Compare
        </button>

        <button
          type="button"
          onclick={onRegenerate}
          disabled={appState.processing}
          class="h-10 md:h-9 px-3 sm:px-3.5 rounded-[10px] text-xs font-medium bg-studio-accent text-studio-accent-ink hover:opacity-90 enabled:active:scale-[0.96] disabled:opacity-30 transition-[opacity,transform] duration-150"
        >
          Reseed
        </button>

        <button
          type="button"
          onclick={handleCopyClick}
          class="h-10 md:h-9 px-2.5 sm:px-3 rounded-[10px] text-xs font-medium bg-studio-elevated text-studio-ink border border-studio-border hover:border-studio-border-strong active:scale-[0.96] transition-[border-color,transform] duration-150"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>

        <button
          type="button"
          onclick={onDownload}
          class="h-10 md:h-9 px-3 sm:px-3.5 rounded-[10px] text-xs font-medium bg-studio-ink text-studio-bg hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Export
        </button>
      </div>
    </div>
  </div>
{/if}
