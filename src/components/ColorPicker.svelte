<script>
  const id = $props.id();
  let { value = $bindable(), onchange } = $props();

  const SWATCHES = ['#111113', '#f4f3ef', '#d94826', '#0d9488'];

  function handleInput(e) {
    value = e.target.value;
    onchange?.(value);
  }

  function pickSwatch(hex) {
    value = hex;
    onchange?.(hex);
  }
</script>

<div class="flex items-center justify-between gap-1.5 pt-1">
  <div class="flex items-center gap-1.5 md:gap-2.5 min-w-0">
    <input
      {id}
      type="color"
      value={value}
      oninput={handleInput}
      aria-label="Border color"
      class="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
    />
    <div class="flex flex-col min-w-0">
      <label for={id} class="text-[0.6875rem] font-medium text-studio-muted cursor-pointer">Border</label>
      <span class="font-mono text-[0.6875rem] text-studio-ink uppercase tabular-nums">{value}</span>
    </div>
  </div>

  <div class="flex items-center gap-0 md:gap-1.5 shrink-0" role="group" aria-label="Quick border colors">
    {#each SWATCHES as hex}
      {@const active = value.toLowerCase() === hex}
      <button
        type="button"
        onclick={() => pickSwatch(hex)}
        aria-label="Set border color to {hex}"
        aria-pressed={active}
        title={hex}
        class="inline-flex items-center justify-center w-11 h-11 md:w-5 md:h-5 rounded-lg md:rounded-md motion-safe:enabled:active:scale-[0.96] transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/60"
      >
        <span
          class="block w-7 h-7 md:w-5 md:h-5 rounded-md border transition-transform duration-150 ease-[var(--ease-out)] {active
            ? 'border-studio-accent ring-1 ring-studio-accent motion-safe:scale-110'
            : 'border-studio-border-strong motion-safe:hover:scale-105'}"
          style="background-color: {hex};"
        ></span>
      </button>
    {/each}
  </div>
</div>
