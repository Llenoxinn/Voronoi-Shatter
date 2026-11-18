figma.showUI(__html__, { width: 980, height: 680 });

function placeAtViewportCenter(node) {
  const center = figma.viewport.center;
  node.x = center.x - node.width / 2;
  node.y = center.y - node.height / 2;
  figma.currentPage.appendChild(node);
  figma.currentPage.selection = [node];
  figma.viewport.scrollAndZoomIntoView([node]);
}

figma.ui.onmessage = (msg) => {
  if (!msg || typeof msg !== 'object') return;

  if (msg.type === 'insert-svg' && typeof msg.svg === 'string') {
    const node = figma.createNodeFromSvg(msg.svg);
    node.name = 'Voronoi Shatter';
    placeAtViewportCenter(node);
    figma.notify('Inserted Voronoi Shatter SVG');
    return;
  }

  if (msg.type === 'insert-png' && msg.bytes) {
    const width = Number(msg.width) || 1;
    const height = Number(msg.height) || 1;
    const image = figma.createImage(new Uint8Array(msg.bytes));
    const rect = figma.createRectangle();
    rect.name = 'Voronoi Shatter';
    rect.resize(width, height);
    rect.fills = [
      {
        type: 'IMAGE',
        scaleMode: 'FILL',
        imageHash: image.hash,
      },
    ];
    placeAtViewportCenter(rect);
    figma.notify('Inserted Voronoi Shatter PNG');
    return;
  }

  if (msg.type === 'notify' && typeof msg.message === 'string') {
    figma.notify(msg.message);
  }
};
