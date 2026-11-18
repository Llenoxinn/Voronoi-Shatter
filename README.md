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

- **Interactive Landing Demo** — Hero preview ([`src/components/LandingPage.svelte`](src/components/LandingPage.svelte)) with clickable fracture origin, live `Crystal`/`Diamond`/`Grid` metrics, `Wireframe` toggle, `Cells` slider (`24`–`160`), and instant `Export SVG` download.
- **Optical Shard Refraction & RGB Dispersion** — Displaces sampled source pixels along a deterministic per-cell vector and splits red/blue channels for prism edges ([`src/lib/voronoi.js`](src/lib/voronoi.js)).
- **Shard Distance Metrics & Numeric Seed** — Switch between `Crystal` (Euclidean), `Diamond` (Manhattan), and `Grid` (Chebyshev) cell tessellation, and enter exact seeds (`1`–`1e9`) via the numeric `Seed` input or randomize with `Reseed` (`Space`).
- **Interactive Impact Epicenter** — Click anywhere on the canvas to cluster shards radially around a focal point, or reset back to a uniform jittered grid.
- **3D Facet Bevels, Cutout Gaps, Wireframe & Stage Tools** — Top-left key-light rim highlights paired with `smoothstep` edge falloff, transparent cutout borders, wireframe-only output, an automatic/toggleable alpha checkerboard backdrop, and `Fit / 100%` canvas zoom ([`src/components/CanvasArea.svelte`](src/components/CanvasArea.svelte)).
- **Cached Worker Pipeline** — Geometry and distance fields (`nearestSeed`, `dist1Sq`, `dist2Sq`, `avgColors`) stay cached in [`src/context.svelte.js`](src/context.svelte.js) and [`src/lib/worker.js`](src/lib/worker.js) so appearance sliders update without recomputing Voronoi cells.
- **Vector SVG, Blend & Clipboard Copy** — Export editable clipped-polygon `SVG` vectors ([`src/lib/svg-export.js`](src/lib/svg-export.js)), raster `PNG`/`JPEG`/`WebP`, composite blend layers, or copy PNG straight to the clipboard.
- **1-Click Figma Plugin ZIP & Bridge** — Download `voronoi-shatter-figma-plugin.zip` directly from the landing page (or build with `npm run build:plugin`), connecting [`figma-plugin/ui.html`](figma-plugin/ui.html) to the `?embed=1` Studio via [`src/lib/plugin-api.js`](src/lib/plugin-api.js) to insert `SVG` or `PNG` layers into Figma ([`figma-plugin/`](figma-plugin/README.md)).

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
| `Escape` | Close active control tray |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Voronoi & SVG unit tests
npm test

# Package Figma plugin ZIP (also runs automatically before build)
npm run build:plugin

# Build and preview production bundle
npm run build
npm run preview
```

---

## Project Structure

```text
figma-plugin/
├── manifest.json             # Figma Desktop plugin manifest
├── code.js                   # Figma sandbox script (SVG vector & PNG image insertion)
├── ui.html                   # Studio iframe bridge (?embed=1) & Figma insert toolbar
└── README.md                 # Figma Desktop install & bridge guide
public/
├── favicon.svg               # Voronoi prism SVG web icon
└── voronoi-shatter-figma-plugin.zip # Prebuilt 1-click downloadable Figma plugin archive
scripts/
└── build-plugin.mjs          # Zero-dependency ZIP packager for figma-plugin/
src/
├── main.js                   # Application entry point
├── app.css                   # 3-layer CSS tokens (primitive/semantic/component) & reduced-motion
├── context.svelte.js         # Shared Svelte 5 $state context & toggleTheme()
├── components/
│   ├── App.svelte            # View switching (landing/studio), embed bridge, worker orchestration
│   ├── LandingPage.svelte    # Landing page with embedded 4-zone Pro Studio hero demo & plugin ZIP download
│   ├── Header.svelte         # Top workstation bar (Open, Sample, Reset, spec pill, Copy PNG, Export/Insert)
│   ├── ThemeToggle.svelte    # Shared Gallery Stone / Darkroom theme switch
│   ├── ToolRail.svelte       # Left vertical workstation tool dock (Impact, Compare, Reseed, Cutout, Wireframe)
│   ├── CanvasArea.svelte     # Matte pasteboard viewport, alpha checkerboard, Fit/100% zoom, impact marker, drag-replace
│   ├── Sidebar.svelte        # Right-docked Pro Inspector (Presets, Geometry, Seed, Optics, Blend, Export Format)
│   ├── UploadZone.svelte     # Asymmetric viewfinder dropzone & sample artwork loader
│   ├── LoadingOverlay.svelte # Processing status overlay
│   ├── ControlSlider.svelte  # Labeled range slider with $props.id(), progress track, and tabular-nums
│   └── ColorPicker.svelte    # Border color swatch, hex readout, and quick swatches
└── lib/
    ├── engine.js             # Web Worker lifecycle and transferable buffer messaging
    ├── worker.js             # Worker message handler ('full' and 'render' passes)
    ├── voronoi.js            # Mulberry32 PRNG, radial/grid seeds, metrics, refraction, bevels, dispersion
    ├── svg-export.js         # Sutherland-Hodgman clipped Voronoi SVG vector generator
    ├── plugin-api.js         # ?embed / postMessage bridge for iframe & Figma plugin hosts
    └── canvas-utils.js       # Canvas snapshot helper for crossfade transitions
tests/
└── voronoi.test.mjs          # node:test unit suite for seeds, metrics, optics, and SVG export
```
