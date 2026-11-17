# Voronoi Shatter

Interactive, client-side Voronoi tessellation image studio built with Svelte 5, Tailwind CSS, and Web Workers.

## Features

- **Voronoi Shatter Engine**: Generates jittered grid seed points, computes nearest-neighbor distance fields in a background Web Worker ([src/lib/worker.js](src/lib/worker.js), [src/lib/voronoi.js](src/lib/voronoi.js)), and renders **per-shard optical refraction**, **3D facet bevel lighting**, and **anti-aliased fracture borders**.
- **Fast Re-rendering**: Caches Voronoi distance fields and source pixels so refraction, bevel, border, and blend adjustments re-render without recomputing cell geometry.
- **Presets**: Six one-click presets (`Prism`, `Glass`, `Mosaic`, `Low Poly`, `Cracked`, `Fine`) in [src/components/Sidebar.svelte](src/components/Sidebar.svelte).
- **Designer Workflow**: Built-in procedural sample artwork for instant testing, plus **Hold to compare** (`C` key or HUD button) to inspect the original image against the shattered output.
- **Blend Overlay**: Composite a second image over the Voronoi cells using `Normal`, `Multiply`, `Screen`, `Overlay`, or `Soft Light` blend modes with adjustable opacity.
- **Export**: Download the rendered canvas as `PNG`, `JPEG`, or `WebP` (with configurable quality for lossy formats).

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Reseed Voronoi cells |
| `C` (hold) | Compare original image |
| `Ctrl+S` / `Cmd+S` | Export current canvas |
| `Ctrl+Z` / `Cmd+Z` | Reset geometry and shatter parameters to defaults |

## Development

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
├── main.js                  # App entry point
├── app.css                  # Tailwind layers and custom studio form controls
├── context.svelte.js        # Shared Svelte 5 $state context
├── components/
│   ├── App.svelte           # Root layout, image loading, crossfade & worker orchestration
│   ├── Header.svelte        # Studio top bar and render status pill
│   ├── Sidebar.svelte       # Controls, presets, blend overlay, and export panel
│   ├── CanvasArea.svelte    # Canvas stage, dropzone host, and shortcut HUD
│   ├── UploadZone.svelte    # Drag-and-drop / click-to-browse empty state
│   ├── LoadingOverlay.svelte# Processing spinner overlay
│   ├── ControlSlider.svelte # Labeled range slider with tabular numeric readout
│   └── ColorPicker.svelte   # Border color swatch and hex readout
└── lib/
    ├── engine.js            # Web Worker lifecycle and transferable buffer messaging
    ├── worker.js            # Worker message handler ('full' and 'render' passes)
    ├── voronoi.js           # Seed generation, Voronoi distance field, and blending
    └── canvas-utils.js      # Canvas snapshot helper for crossfade transitions
```
