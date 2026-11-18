<script>
  const id = $props.id();
  let { label, value = $bindable(), min = 0, max = 100, step = 1, unit = '', onchange } = $props();

  function handleInput(e) {
    const v = parseFloat(e.target.value);
    value = v;
    onchange?.(v);
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <label for={id} class="text-[11px] font-medium text-studio-muted">{label}</label>
    <span class="font-mono text-[11px] text-studio-ink tabular-nums">{value}{unit}</span>
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
  />
</div>
