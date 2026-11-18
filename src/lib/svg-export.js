/**
 * Clip a convex polygon against the perpendicular bisector half-plane
 * (p - mid) · (seedJ - seedS) <= 0 using Sutherland-Hodgman clipping.
 */
function clipPolygonHalfPlane(poly, sx, sy, jx, jy) {
  const nx = jx - sx;
  const ny = jy - sy;
  if (nx === 0 && ny === 0) return poly;

  const midX = (sx + jx) * 0.5;
  const midY = (sy + jy) * 0.5;
  const out = [];
  const len = poly.length;

  for (let i = 0; i < len; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % len];
    const dA = (a.x - midX) * nx + (a.y - midY) * ny;
    const dB = (b.x - midX) * nx + (b.y - midY) * ny;
    const inA = dA <= 0;
    const inB = dB <= 0;

    if (inA && inB) {
      out.push(b);
    } else if (inA && !inB) {
      const t = dA / (dA - dB);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    } else if (!inA && inB) {
      const t = dA / (dA - dB);
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
      out.push(b);
    }
  }

  return out;
}

/**
 * Generate a clean, valid SVG string of the Voronoi tessellation.
 */
export function generateVoronoiSVG(
  w,
  h,
  seeds,
  avgColors,
  {
    borderWidth = 1.5,
    borderColor = '#111113',
    transparentBorder = false,
    wireframe = false,
  } = {}
) {
  const n = seeds.length;
  const polygons = [];

  const stroke = wireframe
    ? borderColor
    : transparentBorder || borderWidth <= 0
      ? 'none'
      : borderColor;
  const strokeWidth = transparentBorder && !wireframe ? 0 : borderWidth;

  for (let s = 0; s < n; s++) {
    const sx = seeds[s].x;
    const sy = seeds[s].y;

    let poly = [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: h },
      { x: 0, y: h },
    ];

    for (let j = 0; j < n; j++) {
      if (j === s) continue;
      poly = clipPolygonHalfPlane(poly, sx, sy, seeds[j].x, seeds[j].y);
      if (poly.length < 3) break;
    }

    if (poly.length < 3) continue;

    const points = poly
      .map((p) => `${Number(p.x.toFixed(2))},${Number(p.y.toFixed(2))}`)
      .join(' ');

    let fill = 'none';
    if (!wireframe) {
      const ai = s * 4;
      const r = avgColors ? avgColors[ai] : 0;
      const g = avgColors ? avgColors[ai + 1] : 0;
      const b = avgColors ? avgColors[ai + 2] : 0;
      fill = `rgb(${r}, ${g}, ${b})`;
    }

    polygons.push(
      `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round" />`
    );
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    ...polygons,
    '</svg>',
  ].join('\n');
}
