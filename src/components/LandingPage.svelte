<script>
  import { onMount } from 'svelte';
  import { generateSeeds, computeVoronoi, renderVoronoi } from '../lib/voronoi.js';
  import ThemeToggle from './ThemeToggle.svelte';

  let {
    presets = [],
    onOpenStudio,
    onOpenSample,
    onOpenPreset,
    onFile,
  } = $props();

  let heroCanvas = $state();
  let heroImpact = $state({ x: 0.38, y: 0.44 });
  let heroSeed = $state(42071);
  let activeHeroPreset = $state('Prism');
  let fileInput = $state();

  let srcPixels = null;
  const W = 840;
  const H = 480;

  const PRESET_COLORS = [
    'bg-[#d94826] text-white',
    'bg-[#111113] text-[#f4f3ef]',
    'bg-[#0d9488] text-white',
    'bg-[#1d4ed8] text-white',
    'bg-[#b45309] text-white',
    'bg-[#334155] text-white',
  ];

  function buildHeroSource() {
    const oc = document.createElement('canvas');
    oc.width = W;
    oc.height = H;
    const ctx = oc.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#141418');
    grad.addColorStop(0.45, '#2b2240');
    grad.addColorStop(1, '#d94826');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const sun = ctx.createRadialGradient(W * 0.36, H * 0.42, 16, W * 0.36, H * 0.42, 210);
    sun.addColorStop(0, '#fde68a');
    sun.addColorStop(0.5, '#f97316');
    sun.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(W * 0.36, H * 0.42, 210, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(13, 148, 136, 0.85)';
    ctx.beginPath();
    ctx.moveTo(W * 0.54, H * 0.14);
    ctx.lineTo(W * 0.88, H * 0.78);
    ctx.lineTo(W * 0.42, H * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(244, 243, 239, 0.16)';
    ctx.fillRect(W * 0.1, H * 0.62, 240, 100);

    srcPixels = ctx.getImageData(0, 0, W, H).data;
  }

  function renderHero(presetOverride = null) {
    if (!heroCanvas || !srcPixels) return;
    const p =
      presetOverride ||
      presets.find((item) => item.name === activeHeroPreset) || {
        cellCount: 80,
        jitter: 75,
        refraction: 65,
        bevel: 55,
        borderWidth: 1.5,
      };
    const seeds = generateSeeds(W, H, Math.min(p.cellCount, 180), p.jitter, heroSeed, heroImpact);
    const { nearestSeed, dist1Sq, dist2Sq, avgColors } = computeVoronoi(srcPixels, W, H, seeds);
    const out = renderVoronoi(
      W,
      H,
      nearestSeed,
      dist1Sq,
      dist2Sq,
      avgColors,
      seeds,
      srcPixels,
      p.borderWidth,
      [17, 17, 19],
      p.refraction,
      p.bevel,
      24,
      null,
      'normal',
      0
    );
    heroCanvas.width = W;
    heroCanvas.height = H;
    heroCanvas.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  }

  function handleHeroClick(e) {
    if (!heroCanvas) return;
    const rect = heroCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    heroImpact = {
      x: Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height)),
    };
    heroSeed = (heroSeed + 7919) % 999983;
    renderHero();
  }

  function selectHeroPreset(preset) {
    activeHeroPreset = preset.name;
    renderHero(preset);
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      onFile(e.target.files[0]);
      e.target.value = '';
    }
  }

  onMount(() => {
    buildHeroSource();
    renderHero();
  });
</script>

<div class="min-h-[100dvh] bg-studio-bg text-studio-ink overflow-x-hidden">
  <!-- Minimal Top Nav -->
  <header class="sticky top-0 z-30 backdrop-blur-xl bg-studio-bg/90 border-b border-studio-border">
    <div class="max-w-6xl mx-auto flex items-center justify-between h-14 px-5 sm:px-8">
      <a href="#top" class="flex items-center gap-2.5 text-studio-ink no-underline">
        <svg class="w-4 h-4 text-studio-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
          <line x1="12" y1="22" x2="12" y2="12" />
          <line x1="22" y1="8.5" x2="12" y2="12" />
          <line x1="2" y1="8.5" x2="12" y2="12" />
        </svg>
        <span class="font-semibold text-sm tracking-tight">Voronoi Shatter</span>
      </a>

      <nav class="hidden md:flex items-center gap-8 text-sm text-studio-muted">
        <a href="#optics" class="hover:text-studio-ink transition-colors duration-150">Optics</a>
        <a href="#presets" class="hover:text-studio-ink transition-colors duration-150">Presets</a>
      </nav>

      <div class="flex items-center gap-2">
        <ThemeToggle size="md" />
        <button
          type="button"
          onclick={onOpenStudio}
          class="inline-flex items-center justify-center h-9 px-4 rounded-lg bg-studio-ink text-studio-bg text-xs font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Open Studio
        </button>
      </div>
    </div>
  </header>

  <!-- Hero: Editorial Headline + Monumental Type Behind Interactive Window -->
  <section id="top" class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-16 md:pt-16 md:pb-24">
    <div class="max-w-4xl">
      <h1 class="font-medium text-4xl sm:text-6xl lg:text-[4.25rem] leading-[1.03] tracking-[-0.035em] text-studio-ink text-balance">
        You give it pixels.<br />
        We fracture them into crystal.
      </h1>
      <p class="mt-5 text-base sm:text-lg text-studio-muted leading-relaxed max-w-[46ch] text-pretty">
        Per-shard optical refraction, directional bevels, and RGB dispersion—running locally in your browser.
      </p>

      <div class="flex flex-wrap items-center gap-3 mt-7">
        <button
          type="button"
          onclick={onOpenSample}
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
        >
          Try live sample
        </button>
        <button
          type="button"
          onclick={() => fileInput.click()}
          class="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
        >
          Upload image
        </button>
        <input type="file" accept="image/*" bind:this={fileInput} onchange={handleFileChange} aria-label="Upload image to studio" />
      </div>
    </div>

    <!-- Monumental Display Wordmark Behind App Frame -->
    <div class="relative mt-14 md:mt-20">
      <div
        aria-hidden="true"
        class="select-none pointer-events-none font-bold tracking-[-0.055em] leading-[0.82] text-studio-ink/[0.08] dark:text-studio-ink/[0.1] text-center"
        style="font-size: clamp(4.5rem, 16.5vw, 13.5rem);"
      >
        SHATTER
      </div>

      <div class="relative -mt-6 sm:-mt-10 md:-mt-14 rounded-2xl border border-studio-border-strong bg-studio-panel p-2 sm:p-3 shadow-[0_28px_80px_rgba(17,17,19,0.12)] dark:shadow-[0_32px_90px_rgba(0,0,0,0.65)]">
        <div class="relative rounded-xl overflow-hidden bg-studio-bg">
          <canvas
            bind:this={heroCanvas}
            onclick={handleHeroClick}
            title="Click anywhere to move the fracture origin"
            class="block w-full h-auto cursor-crosshair"
          ></canvas>
          <div
            aria-hidden="true"
            class="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-studio-accent bg-studio-bg/60 pointer-events-none"
            style="left: {heroImpact.x * 100}%; top: {heroImpact.y * 100}%;"
          ></div>
        </div>
      </div>
    </div>
  </section>

  <!-- Bold Color-Blocked Showcase Card (Inspired by Reference) -->
  <section id="optics" class="max-w-6xl mx-auto px-5 sm:px-8 py-10 md:py-16">
    <div class="rounded-3xl bg-studio-accent text-studio-accent-ink p-8 sm:p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
      <div class="lg:col-span-5">
        <h2 class="font-medium text-3xl sm:text-5xl leading-[1.05] tracking-[-0.03em] text-balance">
          Freedom to fracture. Zero uploads.
        </h2>
        <p class="mt-4 text-sm sm:text-base opacity-85 leading-relaxed max-w-[34ch]">
          Every pixel stays in your browser's Web Worker. Tune optics in real time and paste straight into Figma.
        </p>
      </div>

      <div class="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
        <div>
          <h3 class="font-semibold text-lg tracking-tight">Optical Refraction</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Displaces sampled pixels per cell along a deterministic vector for real glass depth.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">RGB Dispersion</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Splits red and blue channels along shard boundaries for chromatic prism edges.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">Radial Impact</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Click anywhere on your artwork to cluster smaller shards around an epicenter.
          </p>
        </div>

        <div>
          <h3 class="font-semibold text-lg tracking-tight">3D Facet Bevels</h3>
          <p class="mt-1.5 text-sm opacity-85 leading-relaxed">
            Directional rim highlights paired with smoothstep anti-aliased fracture borders.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Color-Coded Preset Strip + Live Specimen -->
  <section id="presets" class="max-w-6xl mx-auto px-5 sm:px-8 py-16 md:py-24">
    <div class="max-w-2xl mb-10">
      <h2 class="font-medium text-3xl sm:text-5xl leading-[1.06] tracking-[-0.03em] text-studio-ink text-balance">
        Six calibrated presets, ready in one click.
      </h2>
    </div>

    <!-- Color-blocked horizontal preset tabs (like reference) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {#each presets as preset, idx}
        {@const active = activeHeroPreset === preset.name}
        <button
          type="button"
          onclick={() => {
            selectHeroPreset(preset);
            onOpenPreset(preset);
          }}
          class="flex flex-col justify-between p-4 rounded-2xl text-left min-h-[128px] active:scale-[0.96] transition-[transform,opacity] duration-150 {PRESET_COLORS[idx % PRESET_COLORS.length]} {active
            ? 'ring-2 ring-studio-ink ring-offset-2 ring-offset-studio-bg'
            : 'hover:opacity-95'}"
        >
          <div>
            <div class="font-semibold text-base tracking-tight">{preset.name}</div>
            <div class="text-xs opacity-80 mt-0.5">{preset.desc}</div>
          </div>

          <div class="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-xs font-mono tabular-nums">
            <span>{preset.refraction}%</span>
            <span class="opacity-75">{preset.cellCount}c</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Monumental Closing Typographic Section -->
  <section class="max-w-6xl mx-auto px-5 sm:px-8 pt-12 pb-20 md:pt-20 md:pb-28 text-center">
    <h2
      class="font-bold tracking-[-0.045em] leading-[0.95] text-studio-ink select-none"
      style="font-size: clamp(3.5rem, 11vw, 8.5rem);"
    >
      Start today.
    </h2>
    <p class="mt-5 text-base text-studio-muted max-w-[42ch] mx-auto text-pretty">
      Open the studio with a sample composition or drop your own artwork.
    </p>
    <div class="flex flex-wrap items-center justify-center gap-3 mt-8">
      <button
        type="button"
        onclick={onOpenSample}
        class="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-studio-accent text-studio-accent-ink text-sm font-medium hover:opacity-90 active:scale-[0.96] transition-[opacity,transform] duration-150"
      >
        Launch with sample
      </button>
      <button
        type="button"
        onclick={onOpenStudio}
        class="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-studio-border-strong bg-studio-panel text-studio-ink text-sm font-medium hover:border-studio-ink active:scale-[0.96] transition-[border-color,transform] duration-150"
      >
        Open empty studio
      </button>
    </div>
  </section>

  <footer class="max-w-6xl mx-auto px-5 sm:px-8 py-8 border-t border-studio-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-studio-subtle">
    <span>Voronoi Shatter</span>
    <span>Space to reseed &middot; Hold C to compare &middot; Ctrl+S to export</span>
  </footer>
</div>
