<script>
  let { onFile } = $props();
  let isDragOver = $state(false);

  function handleDragOver(e) {
    e.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave() {
    isDragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    isDragOver = false;
    if (e.dataTransfer.files.length > 0) {
      onFile(e.dataTransfer.files[0]);
    }
  }

  function handleClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      if (input.files.length > 0) onFile(input.files[0]);
    };
    input.click();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
  class="absolute inset-0 z-20 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 {isDragOver ? 'bg-accent/5' : ''}"
>
  <div
    class="flex flex-col items-center gap-4 p-12 rounded-2xl transition-all duration-500 {isDragOver ? 'border-2 border-dashed border-accent/40 scale-[1.02]' : ''}"
  >
    <span
      class="text-5xl opacity-30 transition-all duration-500 {!isDragOver ? 'animate-float' : ''} {isDragOver ? 'scale-110' : ''}"
    >
      &#127912;
    </span>
    <h2 class="text-lg font-semibold tracking-tight text-white/40">Drop your image here</h2>
    <p class="text-sm text-white/20">or click to browse &bull; JPG, PNG, WebP</p>
  </div>
</div>
