<script>
  let id = `clr-${Math.random().toString(36).slice(2, 9)}`;
  let { value = $bindable(), onchange } = $props();

  function handleInput(e) {
    value = e.target.value;
    onchange?.(value);
  }
</script>

<div class="flex items-center justify-between p-2 rounded-lg bg-studio-elevated border border-studio-border">
  <div class="flex items-center gap-2.5">
    <input {id} type="color" value={value} oninput={handleInput} aria-label="Border color" class="shrink-0" />
    <div class="flex flex-col">
      <label for={id} class="text-[11px] font-medium text-studio-muted cursor-pointer">Border Color</label>
      <span class="font-mono text-[11px] text-studio-ink uppercase tabular-nums">{value}</span>
    </div>
  </div>
</div>
