<script>
  let id = `clr-${Math.random().toString(36).slice(2, 9)}`;
  let { value = $bindable(), onchange } = $props();

  function handleInput(e) {
    value = e.target.value;
    onchange?.(value);
  }
</script>

<div class="flex flex-col gap-1.5">
  <label for={id} class="text-xs font-medium text-white/40 tracking-wide">Border Color</label>
  <div class="flex items-center gap-3">
    <input {id} type="color" value={value} oninput={handleInput} class="shrink-0" />
    <span class="font-mono text-xs text-white/30">{value}</span>
  </div>
</div>
