<script>
  let id = `sld-${Math.random().toString(36).slice(2, 9)}`;
  let { label, value = $bindable(), min = 0, max = 100, step = 1, onchange } = $props();

  function handleInput(e) {
    const v = parseFloat(e.target.value);
    value = v;
    onchange?.(v);
  }
</script>

<div class="flex flex-col gap-1.5">
  <div class="flex items-center justify-between">
    <label for={id} class="text-xs font-medium text-white/40 tracking-wide">{label}</label>
    <span class="font-mono text-[11px] font-semibold text-white/70 bg-white/[0.04] px-2 py-0.5 rounded min-w-[32px] text-center tabular-nums">
      {value}
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
    class="w-full"
  />
</div>
