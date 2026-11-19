figma.showUI(__html__, { width: 980, height: 680 });

const STUDIO_URL_STORAGE_KEY = 'studioUrl';
const MAX_STUDIO_URL_LENGTH = 512;
const MAX_IMAGE_DIMENSION = 8192;
const MAX_PNG_BYTES = 20 * 1024 * 1024;

let lastSourceNodeId = null;
let lastSourceName = '';

function isValidStudioUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length >= MAX_STUDIO_URL_LENGTH) return false;
  return /^https?:\/\/[^\s\x00-\x1f]+$/i.test(trimmed);
}

function clampPngDimension(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return 1;
  return Math.max(1, Math.min(MAX_IMAGE_DIMENSION, num));
}

function isOnCurrentPage(node) {
  let current = node;
  while (current) {
    if (current === figma.currentPage) return true;
    current = current.parent;
  }
  return false;
}

function getNodeByIdSafe(id) {
  if (!id) return null;
  try {
    return figma.getNodeById(id);
  } catch (err) {
    return null;
  }
}

function findReferenceNode() {
  const candidates = [
    figma.currentPage.selection[0],
    getNodeByIdSafe(lastSourceNodeId),
  ];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (
      candidate &&
      !candidate.removed &&
      isOnCurrentPage(candidate) &&
      typeof candidate.x === 'number' &&
      typeof candidate.y === 'number' &&
      typeof candidate.width === 'number'
    ) {
      return candidate;
    }
  }

  return null;
}

function getInsertedNodeName() {
  return lastSourceName ? `Voronoi Shatter — ${lastSourceName}` : 'Voronoi Shatter';
}

function placeInsertedNode(node) {
  const ref = findReferenceNode();
  figma.currentPage.appendChild(node);

  if (ref) {
    if (ref.parent === figma.currentPage || !ref.absoluteBoundingBox) {
      node.x = ref.x + ref.width + 24;
      node.y = ref.y;
    } else {
      node.x = ref.absoluteBoundingBox.x + ref.absoluteBoundingBox.width + 24;
      node.y = ref.absoluteBoundingBox.y;
    }
  } else {
    const center = figma.viewport.center;
    node.x = center.x - node.width / 2;
    node.y = center.y - node.height / 2;
  }

  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
}

function sendSelectionInfo() {
  const selection = figma.currentPage.selection;
  const first = selection[0];
  figma.ui.postMessage({
    type: 'selection-info',
    count: selection.length,
    name: first && typeof first.name === 'string' ? first.name : '',
  });
}

async function sendSelectionToUI(silent = false, scale = 1) {
  const node = figma.currentPage.selection[0];
  if (!node) {
    if (!silent) figma.notify('Select a layer or frame in Figma first.');
    return;
  }

  const exportScale = Math.max(1, Math.min(4, Number(scale) || 1));

  try {
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: exportScale },
    });
    lastSourceNodeId = node.id;
    lastSourceName = node.name || 'Selection';
    figma.ui.postMessage({
      type: 'selection-bytes',
      bytes: Array.from(bytes),
      name: lastSourceName,
      scale: exportScale,
    });
  } catch (err) {
    if (!silent) figma.notify('Unable to export selected layer.');
  }
}

figma.on('selectionchange', sendSelectionInfo);
sendSelectionInfo();

figma.ui.onmessage = async (msg) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'request-selection') {
    const scale = Math.max(1, Math.min(4, Number(msg.scale) || 1));
    await sendSelectionToUI(Boolean(msg.silent), scale);
    return;
  }

  if (msg.type === 'get-studio-url') {
    let saved = '';
    try {
      const stored = await figma.clientStorage.getAsync(STUDIO_URL_STORAGE_KEY);
      if (isValidStudioUrl(stored)) saved = stored.trim();
    } catch (err) {
      saved = '';
    }
    figma.ui.postMessage({ type: 'studio-url', url: saved });
    sendSelectionInfo();
    return;
  }

  if (msg.type === 'save-studio-url' && typeof msg.url === 'string') {
    const trimmedUrl = msg.url.trim();
    if (!isValidStudioUrl(trimmedUrl)) {
      figma.notify('Invalid Studio URL — use http:// or https:// under 512 characters.');
      return;
    }
    try {
      await figma.clientStorage.setAsync(STUDIO_URL_STORAGE_KEY, trimmedUrl);
    } catch (err) {
      // Ignore clientStorage failures in restricted environments.
    }
    return;
  }

  if (msg.type === 'insert-svg' && typeof msg.svg === 'string') {
    try {
      const node = figma.createNodeFromSvg(msg.svg);
      node.name = getInsertedNodeName();
      placeInsertedNode(node);
      figma.notify('Inserted Voronoi Shatter SVG');
    } catch (err) {
      figma.notify('Unable to insert Voronoi Shatter SVG.');
    }
    return;
  }

  if (msg.type === 'insert-png') {
    const isByteArray = Array.isArray(msg.bytes) || msg.bytes instanceof Uint8Array;
    if (!isByteArray || msg.bytes.length <= 0 || msg.bytes.length > MAX_PNG_BYTES) {
      figma.notify('Unable to insert PNG — invalid or oversized image data.');
      return;
    }
    try {
      const width = clampPngDimension(msg.width);
      const height = clampPngDimension(msg.height);
      const pngBytes =
        msg.bytes instanceof Uint8Array ? msg.bytes : new Uint8Array(msg.bytes);
      const image = figma.createImage(pngBytes);
      const rect = figma.createRectangle();
      rect.name = getInsertedNodeName();
      rect.resize(width, height);
      rect.fills = [
        {
          type: 'IMAGE',
          scaleMode: 'FILL',
          imageHash: image.hash,
        },
      ];
      placeInsertedNode(rect);
      figma.notify('Inserted Voronoi Shatter PNG');
    } catch (err) {
      figma.notify('Unable to insert Voronoi Shatter PNG.');
    }
    return;
  }

  if (msg.type === 'notify' && typeof msg.message === 'string') {
    figma.notify(msg.message);
  }
};
