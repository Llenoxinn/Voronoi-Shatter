<div align="center">

# Voronoi Shatter

**Client-side optical fracture & Voronoi tessellation studio.**  
Per-shard refraction, directional facet bevels, RGB chromatic dispersion, and radial impact points — rendered locally in a Web Worker.

[![Svelte 5](https://img.shields.io/badge/Svelte_5-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev/)
[![Vite 6](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind_CSS_3-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-111113?style=for-the-badge&logo=javascript&logoColor=F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Web Workers](https://img.shields.io/badge/Web_Workers-D94826?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

</div>

---

## Capabilities

- **Optical Shard Refraction & RGB Dispersion** — Displaces sampled source pixels along a deterministic per-cell vector and splits red/blue channels for prism edges ([`src/lib/voronoi.js`](src/lib/voronoi.js)).
- **Interactive Impact Epicenter** — Click anywhere on the canvas to cluster shards radially around a focal point, or reset back to a uniform jittered grid.
- **3D Facet Bevels & Anti-Aliased Borders** — Top-left key-light rim highlights paired with `smoothstep` sub-pixel edge falloff.
- **Cached Worker Pipeline** — Geometry and distance fields (`nearestSeed`, `dist1Sq`, `dist2Sq`, `avgColors`) stay cached in [`src/context.svelte.js`](src/context.svelte.js) and [`src/lib/worker.js`](src/lib/worker.js) so appearance sliders update without recomputing Voronoi cells.
- **Gallery Stone & Darkroom Themes** — Switch between light editorial stone and darkroom charcoal via [`src/components/ThemeToggle.svelte`](src/components/ThemeToggle.svelte).
- **Blend & Export** — Composite a second image (`Normal`, `Multiply`, `Screen`, `Overlay`, `Soft Light`), copy PNG straight to the clipboard, or export `PNG`, `JPEG`, and `WebP`.

---

## Tech Stack

| Stack | Technology | Role |
| --- | --- | --- |
| ![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?style=flat-square&logo=svelte&logoColor=white) | **Svelte 5** | Runes-based reactive UI (`$state`, `$derived`, `$props`, `$bindable`, `$props.id()`) |
| ![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white) | **Vite 6** | Dev server, HMR, and production bundling with module Web Workers |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | **Tailwind CSS 3** | Tokenized Gallery Stone & Darkroom studio theme utilities |
| ![HTML5](https://img.shields.io/badge/Canvas_2D-E34F26?style=flat-square&logo=html5&logoColor=white) | **HTML5 Canvas 2D** | Offscreen image sampling, crossfade transitions, and export encoding |
| ![Web Workers](https://img.shields.io/badge/Web_Workers-111113?style=flat-square&logo=javascript&logoColor=F7DF1E) | **Web Workers** | Non-blocking Voronoi computation using transferable `ArrayBuffer`s |

---

## Presets & Shortcuts

| Preset | Profile | Cells | Jitter | Refraction | Bevel | Border |
| --- | --- | --- | --- | --- | --- | --- |
| **Prism** | Refracted shards | `80` | `75%` | `65%` | `55%` | `1.5px` |
| **Glass** | Stained bevels | `120` | `45%` | `35%` | `70%` | `3px` |
| **Mosaic** | Flat tiles | `90` | `60%` | `0%` | `15%` | `1.5px` |
| **Low Poly** | Clean facets | `220` | `90%` | `0%` | `35%` | `0px` |
| **Cracked** | Fractured lens | `55` | `80%` | `85%` | `60%` | `2.5px` |
| **Fine** | Micro crystal | `400` | `55%` | `40%` | `30%` | `0.5px` |

| Shortcut | Action |
| --- | --- |
| `Click` on canvas | Set radial shatter impact epicenter |
| `Space` | Reseed Voronoi cells |
| `C` *(hold)* | Compare original image |
| `Ctrl+S` / `Cmd+S` | Export current canvas |
| `Ctrl+Z` / `Cmd+Z` | Reset geometry and shatter parameters |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build and preview production bundle
npm run build
npm run preview
```

---

## Project Structure

```text
src/
├── main.js                   # Application entry point
├── app.css                   # Theme CSS variables, slider/select controls, reduced-motion rules
├── context.svelte.js         # Shared Svelte 5 $state context & toggleTheme()
├── components/
│   ├── App.svelte            # View switching (landing/studio), image loading, worker orchestration
│   ├── LandingPage.svelte    # Editorial landing page with live interactive Voronoi hero
│   ├── Header.svelte         # Floating studio masthead, telemetry, and inspector toggle
│   ├── ThemeToggle.svelte    # Shared Gallery Stone / Darkroom theme switch
│   ├── CanvasArea.svelte     # Full-bleed stage, preset dock, impact marker, and compare HUD
│   ├── Sidebar.svelte        # Floating hairline-divided glass inspector & export actions
│   ├── UploadZone.svelte     # Asymmetric viewfinder dropzone & sample artwork loader
│   ├── LoadingOverlay.svelte # Processing status overlay
│   ├── ControlSlider.svelte  # Labeled range slider with $props.id() and tabular-nums
│   └── ColorPicker.svelte    # Border color swatch, hex readout, and quick swatches
└── lib/
    ├── engine.js             # Web Worker lifecycle and transferable buffer messaging
    ├── worker.js             # Worker message handler ('full' and 'render' passes)
    ├── voronoi.js            # Mulberry32 PRNG, radial/grid seeds, refraction, bevels, dispersion
    └── canvas-utils.js       # Canvas snapshot helper for crossfade transitions
```
