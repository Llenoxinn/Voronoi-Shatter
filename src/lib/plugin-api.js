/**
 * Embed detection and postMessage bridge for hosting Voronoi Shatter inside
 * an iframe (e.g. a Figma plugin UI or external studio host).
 */

/**
 * Returns true when running in embed mode (`?embed` query param or inside an iframe).
 * @returns {boolean}
 */
export function isEmbedMode() {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).has('embed')) return true;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Post a typed message to the parent host window.
 * @param {string} type
 * @param {Record<string, unknown>} [payload]
 */
export function postToHost(type, payload = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.parent.postMessage({ type, ...payload }, '*');
  } catch {
    // Ignore detached or restricted parent window errors.
  }
}

/**
 * Initialize the window message listener for host-to-app commands and notify
 * the host that the app is ready.
 * @param {object} handlers
 * @param {(dataUrl: string) => void} [handlers.onLoadImageDataUrl]
 * @param {(params: Record<string, unknown>) => void} [handlers.onSetParams]
 * @param {(format: string) => void} [handlers.onRequestExport]
 * @returns {() => void} Cleanup function removing the message listener.
 */
export function initPluginBridge({
  onLoadImageDataUrl,
  onSetParams,
  onRequestExport,
} = {}) {
  if (typeof window === 'undefined') return () => {};

  const handleMessage = (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    switch (data.type) {
      case 'voronoi:load-image':
        if (typeof data.dataUrl === 'string') {
          onLoadImageDataUrl?.(data.dataUrl);
        }
        break;
      case 'voronoi:set-params':
        if (data.params && typeof data.params === 'object') {
          onSetParams?.(data.params);
        }
        break;
      case 'voronoi:export':
        if (typeof data.format === 'string') {
          onRequestExport?.(data.format);
        }
        break;
      default:
        break;
    }
  };

  window.addEventListener('message', handleMessage);
  postToHost('voronoi:ready');

  return () => {
    window.removeEventListener('message', handleMessage);
  };
}
