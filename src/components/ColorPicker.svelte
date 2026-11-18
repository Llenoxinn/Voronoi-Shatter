<script>
  const id = $props.id();
  let { value = $bindable(), onchange } = $props();

  const SWATCHES = ['#0b0c0f', '#ffffff', '#6d4aff', '#f59e0b'];

  function handleInput(e) {
    value = e.target.value;
    onchange?.(value);
  }

  function pickSwatch(hex) {
    value = hex;
    onchange?.(hex);
  }
</script>

<div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-studio-elevated border border-studio-border">
  <div class="flex items-center gap-2.5 min-w-0">
    <input {id} type="color" value={value} oninput={handleInput} aria-label="Border color" class="shrink-0" />
    <div class="flex flex-col min-w-0">
      <label for={id} class="text-[11px] font-medium text-studio-muted cursor-pointer">Border</label>
      <span class="font-mono text-[11px] text-studio-ink uppercase tabular-nums">{value}</span>
    </div>
  </div>

  <div class="flex items-center gap-1.5 shrink-0" role="group" aria-label="Quick border colors">
    {#each SWATCHES as hex}
      {@const active = value.toLowerCase() === hex}
      <button
        type="button"
        onclick={() => pickSwatch(hex)}
        aria-label="Set border color to {hex}"
        title={hex}
        class="w-5 h-5 rounded-md border transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/50 {active
          ? 'border-studio-accent scale-110'
          : 'border-studio-border-strong hover:scale-105'}"
        style="background-color: {hex};"
      ></button>
    {/each}
  </div>
</div>
