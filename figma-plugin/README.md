# Voronoi Shatter Figma Plugin

## Install in Figma Desktop

1. **Get the plugin bundle**:
   - Download `voronoi-shatter-figma-plugin.zip` from the landing page and unzip it to a local folder, **or**
   - From this repository, run `npm run build:plugin` (which packages `manifest.json`, `code.js`, `ui.html`, and `README.md` into `public/voronoi-shatter-figma-plugin.zip`), or import directly from `figma-plugin/`.
2. Open **Figma Desktop** and go to **Plugins -> Development -> Import plugin from manifest...**.
3. Select `manifest.json` from the unzipped folder (or `figma-plugin/manifest.json`), then run **Plugins -> Development -> Voronoi Shatter**.

## Features & Bridge Workflow

- **Live Figma Selection Indicator**: `code.js` subscribes to `figma.on('selectionchange')` and posts `selection-info` (`{ count, name }`) to `ui.html`, keeping the toolbar pill synced with the currently selected layer name (or `No layer selected`).
- **`1×` / `2×` Retina Export Scale**: Choose `1×` or `2×` next to **Pull Selection** to export the active Figma layer via `node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } })` (`code.js` clamps `scale` between `1` and `4`).
- **Smart Placement & Naming**: Newly inserted SVG and PNG results are placed `24px` to the right of the active selection or previously pulled source layer on the current page (falling back to the viewport center when no reference layer is available) and named `Voronoi Shatter — <Layer Name>` (or `Voronoi Shatter`). SVG and PNG creation are wrapped in `try/catch` to report errors safely without crashing the plugin.
- **Custom & Hosted Studio URLs (Persisted)**:
  - `manifest.json` configures `networkAccess.allowedDomains: ["*"]` (plus `devAllowedDomains` for local ports `5173` and `5175`) so you can connect to either `npm run dev` locally or any hosted Voronoi Shatter Studio deployment.
  - Click the **URL** toggle button in the toolbar anytime to open or close the Studio URL panel (it also appears automatically if the Studio has not responded within 3 seconds).
  - Submitted URLs automatically preserve or append `?embed=1` and persist across sessions via `figma.clientStorage` (`get-studio-url` / `save-studio-url`). Passing a `?studio=<url>` query parameter overrides the saved URL for that session.
- **Export Error Feedback**: If you click **Insert SVG** or **Insert PNG** before loading an image (or if an export fails), the Studio emits `voronoi:export-error`; `ui.html` updates the toolbar status text and forwards `{ type: 'notify', message }` to Figma.

## Message Protocol

### Plugin Sandbox (`code.js`) <-> Bridge UI (`ui.html`)

| Direction | Message `type` | Payload |
| --- | --- | --- |
| `code.js` -> `ui.html` | `selection-info` | `{ count: number, name: string }` |
| `code.js` -> `ui.html` | `selection-bytes` | `{ bytes: number[], name: string, scale: number }` |
| `code.js` -> `ui.html` | `studio-url` | `{ url: string }` |
| `ui.html` -> `code.js` | `request-selection` | `{ silent?: boolean, scale?: number }` |
| `ui.html` -> `code.js` | `get-studio-url` | `{}` |
| `ui.html` -> `code.js` | `save-studio-url` | `{ url: string }` |
| `ui.html` -> `code.js` | `insert-svg` | `{ svg: string }` |
| `ui.html` -> `code.js` | `insert-png` | `{ bytes: number[], width: number, height: number }` |
| `ui.html` -> `code.js` | `notify` | `{ message: string }` |

### Bridge UI (`ui.html`) <-> Embedded Studio (`src/lib/plugin-api.js`)

| Direction | Message `type` | Payload |
| --- | --- | --- |
| Studio -> Host | `voronoi:ready` | `{}` |
| Studio -> Host | `voronoi:export-result` | `{ format: 'svg', svg: string }` or `{ format: 'png', bytes: number[], width: number, height: number }` |
| Studio -> Host | `voronoi:export-error` | `{ format?: string, message: string }` |
| Host -> Studio | `voronoi:load-image` | `{ dataUrl: string }` |
| Host -> Studio | `voronoi:set-params` | `{ params: Record<string, unknown> }` |
| Host -> Studio | `voronoi:export` | `{ format: 'svg' \| 'png' }` |
