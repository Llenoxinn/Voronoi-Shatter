<script>
  const id = $props.id();
  let { label, value = $bindable(), min = 0, max = 100, step = 1, unit = '', onchange } = $props();

  const pct = $derived(
    max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0
  );

  function handleInput(e) {
    const v = parseFloat(e.target.value);
    value = v;
    onchange?.(v);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between gap-2">
    <label for={id} class="text-xs font-medium text-studio-muted">{label}</label>
    <span class="inline-flex items-baseline gap-0.5 px-2 py-0.5 rounded-md bg-studio-elevated font-mono text-xs font-semibold text-studio-ink tabular-nums">
      {value}{#if unit}<span class="text-[0.625rem] font-normal text-studio-muted">{unit}</span>{/if}
    </span>
  </div>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    value={value}
    oninput={handleInput}
    aria-label={label}
    class="w-full"
    style="background-image: linear-gradient(to right, var(--studio-ink) 0%, var(--studio-ink) {pct}%, var(--studio-track) {pct}%, var(--studio-track) 100%);"
  />
</div>
