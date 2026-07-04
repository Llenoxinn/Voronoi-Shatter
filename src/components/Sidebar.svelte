<script>
  import { getAppState } from '../context.svelte.js';
  import ControlSlider from './ControlSlider.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let { onGeoChange, onBorderChange, onRegenerate, onDownload, onFile } = $props();

  const state = getAppState();

  let fileInput;

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile(e.target.files[0]);
      e.target.value = '';
    }
  }
</script>

<aside class="w-[280px] shrink-0 flex flex-col gap-5 p-5 overflow-y-auto bg-[#12121e]/80 backdrop-blur-xl border-r border-white/[0.04]">
  <div
    onclick={() => fileInput.click()}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); }}
    class="group flex flex-col items-center gap-2 py-5 px-4 rounded-xl border-2 border-dashed border-white/[0.06] hover:border-accent/50 hover:bg-accent/[0.03] cursor-pointer transition-all duration-300"
    class:opacity-50={state.hasImage}
  >
    <span class="text-2xl opacity-40 group-hover:opacity-60 group-hover:scale-110 transition-all duration-300">&#128247;</span>
    <span class="text-xs font-medium text-white/30 group-hover:text-white/50 transition-colors">
      {state.hasImage ? 'Drop new image' : 'Choose or drop an image'}
    </span>
  </div>
  <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} />

  <hr class="border-white/[0.04]" />

  <ControlSlider label="Cell Count" bind:value={state.params.cellCount} min={5} max={500} step={1} onchange={onGeoChange} />
  <ControlSlider label="Jitter" bind:value={state.params.jitter} min={0} max={100} step={1} onchange={onGeoChange} />
  <ControlSlider label="Border Width" bind:value={state.params.borderWidth} min={0} max={10} step={0.5} onchange={onBorderChange} />

  <ColorPicker bind:value={state.params.borderColor} onchange={onBorderChange} />

  <hr class="border-white/[0.04]" />

  <div class="flex gap-2.5">
    <button
      onclick={onRegenerate}
      disabled={!state.hasImage || state.processing}
      class="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-accent hover:bg-accent-light active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-accent/20 hover:shadow-accent/30"
    >
      &#8635; Regenerate
    </button>
    <button
      onclick={onDownload}
      disabled={!state.hasImage}
      class="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 transition-all"
    >
      &#8681; Download
    </button>
  </div>

  <hr class="border-white/[0.04] mt-auto" />

  <div class="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-white/25 leading-relaxed">
    {#if state.hasImage}
      <span>{state.srcWidth}&times;{state.srcHeight}px</span>
      <span>{state.seeds.length} cells</span>
      <span>{state.params.jitter}% jitter</span>
      <span>bw {state.params.borderWidth}</span>
    {:else}
      <span>Drop an image to begin</span>
    {/if}
  </div>
</aside>
