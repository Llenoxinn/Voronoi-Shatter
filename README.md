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

- **Interactive Landing Demo** — Editorial landing page ([`src/components/LandingPage.svelte`](src/components/LandingPage.svelte)) with an `Outfit` (`579`) Voronoi-faceted display showcase, cached hero geometry/appearance rendering (`Cells` `24`–`160`, `Refraction`, `Bevel`, `Dispersion`, `Crystal`/`Diamond`/`Grid` metrics, clickable fracture origin, instant `Export SVG`), desktop & mobile tool parity (`Impact`, `Reseed`, `Cutout`, `Wireframe`), full demo-to-studio handoff, and a 6-tab interactive Preset showcase with live specimen previews.
- **Spatial-Grid Voronoi Engine & Blend Modes** — Spatial-grid accelerated (`n >= 24`) tessellation across `Crystal` (Euclidean), `Diamond` (Manhattan), and `Grid` (Chebyshev) metrics ([`src/lib/voronoi.js`](src/lib/voronoi.js)), deterministic Mulberry32 seeds (`1`–`1e9`), radial impact epicenter clustering, per-shard optical refraction, directional 3D facet bevels with `smoothstep` edge falloff, RGB chromatic dispersion, and 5 blend modes (`normal`, `multiply`, `screen`, `overlay`, fixed `soft-light`) with aspect-cover compositing.
- **Vector SVG & Raster Export** — Editable polygon `SVG` export ([`src/lib/svg-export.js`](src/lib/svg-export.js)) supporting all 3 distance metrics (`euclidean` half-plane clipping, `manhattan`/`chebyshev` marching-squares contours), geometric `transparentBorder` cutout gaps, subtle facet bevel tinting, and sanitized attributes — alongside `PNG`/`JPEG`/`WebP` export and clipboard `Copy PNG`.
- **Studio Workflow & Recovery** — Cached Web Worker pipeline ([`src/lib/engine.js`](src/lib/engine.js), [`src/lib/worker.js`](src/lib/worker.js)) with automatic worker error recovery and accessible status notices, 50-step Undo/Redo history ([`src/lib/history.js`](src/lib/history.js)), clipboard image paste (`Ctrl+V` / `Cmd+V`), drag-and-drop replace, `Fit / 100%` zoom with toggleable `16px` alpha checkerboard ([`src/components/CanvasArea.svelte`](src/components/CanvasArea.svelte)), and persistent Gallery Stone / Darkroom theming (`localStorage` + `prefers-color-scheme` via [`src/context.svelte.js`](src/context.svelte.js) and [`index.html`](index.html)).
- **Figma Plugin & 1-Click ZIP** — Download `voronoi-shatter-figma-plugin.zip` from the landing page (or build with `npm run build:plugin`) to connect [`figma-plugin/ui.html`](figma-plugin/ui.html) to `?embed=1` Studio via [`src/lib/plugin-api.js`](src/lib/plugin-api.js): `1×`/`2×` Retina pull scale, live selection status via `selectionchange`, smart layer placement (`24px` right of source layer or viewport center), persisted custom hosted Studio URLs via `figma.clientStorage`, and `voronoi:export-error` notifications ([`figma-plugin/README.md`](figma-plugin/README.md)).

---

## Tech Stack

| Stack | Technology | Role |
| --- | --- | --- |
| ![Svelte](https://img.shields.io/badge/Svelte_5-FF3E00?style=flat-square&logo=svelte&logoColor=white) | **Svelte 5** | Runes-based reactive UI (`$state`, `$derived`, `$props`, `$bindable`, `$props.id()`, `$effect`) |
| ![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=flat-square&logo=vite&logoColor=white) | **Vite 6** | Dev server, HMR, and production bundling with module Web Workers |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | **Tailwind CSS 3** | Tokenized Gallery Stone & Darkroom studio theme (`Outfit`, `Geist`, `Geist Mono`) |
| ![HTML5](https://img.shields.io/badge/Canvas_2D-E34F26?style=flat-square&logo=html5&logoColor=white) | **HTML5 Canvas 2D** | Offscreen image sampling, reduced-motion-aware crossfades, and export encoding |
| ![Web Workers](https://img.shields.io/badge/Web_Workers-111113?style=flat-square&logo=javascript&logoColor=F7DF1E) | **Web Workers** | Non-blocking Voronoi computation using transferable `ArrayBuffer`s with crash recovery |

---

## Presets & Shortcuts

| Preset | Profile | Cells | Jitter | Refraction | Bevel | Dispersion | Border |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Prism** | Refracted shards | `80` | `75%` | `65%` | `55%` | `24%` | `1.5px` |
| **Glass** | Stained bevels | `120` | `45%` | `35%` | `70%` | `15%` | `3px` |
| **Mosaic** | Flat tiles | `90` | `60%` | `0%` | `15%` | `0%` | `1.5px` |
| **Low Poly** | Clean facets | `220` | `90%` | `0%` | `35%` | `0%` | `0px` |
| **Cracked** | Fractured lens | `55` | `80%` | `85%` | `60%` | `35%` | `2.5px` |
| **Fine** | Micro crystal | `400` | `55%` | `40%` | `30%` | `12%` | `0.5px` |

| Shortcut | Action |
| --- | --- |
| `Click` on canvas | Set radial shatter impact epicenter |
| `Space` | Reseed Voronoi cells |
| `C` *(hold)* | Compare original image |
| `Ctrl+Z` / `Cmd+Z` | Undo parameter change |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` / `Ctrl+Y` | Redo parameter change |
| `Ctrl+S` / `Cmd+S` | Export current canvas |
| `Ctrl+V` / `Cmd+V` | Paste image from clipboard |
| `Escape` | Blur focused inspector control or clear radial impact |

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests (Voronoi, SVG, history, plugin bridge & packager)
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
├── manifest.json             # Figma Desktop plugin manifest (local & hosted Studio domains)
├── code.js                   # Figma sandbox (selectionchange, 1×–4× export, smart placement, clientStorage)
├── ui.html                   # Studio iframe bridge (?embed=1), 1×/2× pull & persisted URL settings
└── README.md                 # Figma Desktop install & bridge protocol guide
public/
├── favicon.svg               # Voronoi prism SVG web icon
└── voronoi-shatter-figma-plugin.zip # Prebuilt 1-click downloadable Figma plugin archive
scripts/
└── build-plugin.mjs          # Zero-dependency ZIP packager for figma-plugin/
src/
├── main.js                   # Application entry point
├── app.css                   # 3-layer CSS tokens (primitive/semantic/component) & reduced-motion
├── context.svelte.js         # Shared Svelte 5 $state context & persisted toggleTheme()
├── components/
│   ├── App.svelte            # View switching, allowlisted embed bridge, undo/redo, worker orchestration
│   ├── LandingPage.svelte    # Landing page with cached hero demo, 6-tab preset showcase & plugin download
│   ├── Header.svelte         # Workstation bar (Open, Sample, Undo/Redo, Reset, spec pill, Copy PNG, Export/Insert)
│   ├── ThemeToggle.svelte    # Shared Gallery Stone / Darkroom theme switch
│   ├── ToolRail.svelte       # Left vertical workstation tool dock (Impact, Compare, Reseed, Cutout, Wireframe)
│   ├── CanvasArea.svelte     # Matte pasteboard viewport, alpha checkerboard, Fit/100% zoom, impact marker, drag-replace
│   ├── Sidebar.svelte        # Right-docked Pro Inspector (Presets, Geometry, Seed, Optics, Blend, Export Format)
│   ├── UploadZone.svelte     # Asymmetric viewfinder dropzone & sample artwork loader
│   ├── LoadingOverlay.svelte # Processing status overlay
│   ├── ControlSlider.svelte  # Labeled range slider with $props.id(), progress track, and tabular-nums
│   └── ColorPicker.svelte    # Border color swatch, hex readout, and quick swatches
└── lib/
    ├── engine.js             # Web Worker lifecycle, error recovery, and transferable buffer messaging
    ├── worker.js             # Worker message handler ('full' and 'render' passes)
    ├── voronoi.js            # Mulberry32 PRNG, spatial-grid Voronoi, metrics, optics & blend modes
    ├── history.js            # Bounded undo/redo parameter snapshot stack
    ├── svg-export.js         # Euclidean & non-Euclidean SVG generator with cutout insets & bevel tinting
    ├── plugin-api.js         # ?embed / postMessage bridge with prototype-pollution filtering
    └── canvas-utils.js       # Canvas snapshot helper for crossfade transitions
tests/
├── voronoi.test.mjs          # Unit tests for seeds, spatial grid, metrics, optics, blend & SVG export
├── history.test.mjs          # Unit tests for bounded undo/redo history stack & snapshot equality
├── plugin-api.test.mjs       # Unit tests for embed mode detection & sanitized postMessage bridge
└── build-plugin.test.mjs     # Unit tests for figma-plugin ZIP packager
```
