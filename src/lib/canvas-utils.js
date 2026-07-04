export function snapshotCanvas(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width;
  c.height = canvas.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  return c;
}

export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
