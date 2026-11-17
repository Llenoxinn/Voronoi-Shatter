# Repository Guidelines

## Stack & Architecture

- **Framework**: Svelte 5 (runes `$state`, `$derived`, `$props`, `$bindable`) + Vite 6 + Tailwind CSS 3.
- **State**: Centralized in [src/context.svelte.js](src/context.svelte.js) via `createAppState()` / `getAppState()`.
- **Rendering Pipeline**:
  - Geometry changes (`cellCount`, `jitter`, or `Reseed`) trigger `requestFullProcess()` in [src/lib/engine.js](src/lib/engine.js), recomputing seeds and distance fields in [src/lib/worker.js](src/lib/worker.js).
  - Appearance changes (`borderWidth`, `borderColor`, `blendMode`, `blendOpacity`) trigger `requestRenderOnly()` using cached typed arrays so sliders stay responsive.
  - Buffers are transferred via `postMessage(..., transferables)` — always copy `srcData` / cached typed arrays before posting because transferred buffers detach.

## UI Conventions

- **Palette**: Dark studio theme defined in [tailwind.config.js](tailwind.config.js) (`studio-bg`, `studio-panel`, `studio-elevated`, `studio-ink`, `studio-muted`, `studio-accent`).
- **Motion**: Use explicit transition properties (`transition-colors`, `transition-transform`, `transition-opacity`) with `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`) from [src/app.css](src/app.css) and keep UI durations under `300ms`. Respect `prefers-reduced-motion`.
- **Icons**: Use inline geometric SVGs (`aria-hidden="true"`) rather than emoji characters.

## Verification

Run the production build after any UI or worker change:

```bash
npm run build
```
