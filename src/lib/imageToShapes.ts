'use client';

import * as THREE from 'three';

type Point = { x: number; y: number };
type Contour = Point[];

function buildBinaryGrid(
  imageData: ImageData,
  threshold: number,
): { grid: Uint8Array; width: number; height: number } {
  const { data, width, height } = imageData;
  const grid = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const idx = (row + x) * 4;
      const alpha = data[idx + 3];
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      grid[row + x] = alpha > threshold && brightness < 240 ? 1 : 0;
    }
  }

  return { grid, width, height };
}

function findContours(grid: Uint8Array, gw: number, gh: number): Contour[] {
  const visited = new Uint8Array(gw * gh);
  const contours: Contour[] = [];
  const maxContours = 200;
  const maxPointsPerContour = 8000;

  const isFilled = (x: number, y: number) => {
    if (x < 0 || x >= gw || y < 0 || y >= gh) return 0;
    return grid[y * gw + x];
  };

  const isBoundary = (x: number, y: number) => {
    if (!isFilled(x, y)) return false;
    return !isFilled(x - 1, y) || !isFilled(x + 1, y)
      || !isFilled(x, y - 1) || !isFilled(x, y + 1);
  };

  const findBoundaryStart = (): Point | null => {
    for (let y = 0; y < gh; y++) {
      const row = y * gw;
      for (let x = 0; x < gw; x++) {
        if (!visited[row + x] && isBoundary(x, y)) return { x, y };
      }
    }
    return null;
  };

  const dir8 = [
    [1, 0], [1, -1], [0, -1], [-1, -1],
    [-1, 0], [-1, 1], [0, 1], [1, 1],
  ];

  while (contours.length < maxContours) {
    const start = findBoundaryStart();
    if (!start) break;

    const points: Point[] = [];
    let cx = start.x;
    let cy = start.y;
    let dir = 0;

    for (let step = 0; step < maxPointsPerContour; step++) {
      visited[cy * gw + cx] = 1;
      points.push({ x: cx, y: cy });

      let nextX = -1;
      let nextY = -1;

      for (let d = 0; d < 8; d++) {
        const nd = (dir + 5 + d) % 8;
        const nx = cx + dir8[nd][0];
        const ny = cy + dir8[nd][1];

        if (nx === start.x && ny === start.y && points.length >= 4) {
          if (points.length >= 5) contours.push(points);
          nextX = -1;
          break;
        }

        if (isFilled(nx, ny)) {
          nextX = nx;
          nextY = ny;
          dir = nd;
          break;
        }
      }

      if (nextX < 0) {
        if (points.length >= 5) contours.push(points);
        break;
      }

      cx = nextX;
      cy = nextY;
    }
  }

  return contours;
}

function polygonArea(pts: Point[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) * 0.5;
}

function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];
  const first = points[0];
  const last = points[points.length - 1];
  if (first.x === last.x && first.y === last.y) {
    points = points.slice(0, -1);
    if (points.length <= 2) return [...points, first];
  }

  const stack: [number, number][] = [[0, points.length - 1]];
  const keep = new Set<number>();
  keep.add(0);
  keep.add(points.length - 1);

  while (stack.length > 0) {
    const [lo, hi] = stack.pop()!;
    let maxDist = 0;
    let maxIdx = lo;

    const a = points[lo];
    const b = points[hi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;

    for (let i = lo + 1; i < hi; i++) {
      let d: number;
      if (len2 === 0) {
        d = Math.hypot(points[i].x - a.x, points[i].y - a.y);
      } else {
        const t = Math.max(0, Math.min(1, ((points[i].x - a.x) * dx + (points[i].y - a.y) * dy) / len2));
        const px = a.x + t * dx;
        const py = a.y + t * dy;
        d = Math.hypot(points[i].x - px, points[i].y - py);
      }
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }

    if (maxDist > epsilon) {
      stack.push([lo, maxIdx]);
      stack.push([maxIdx, hi]);
    } else {
      keep.add(maxIdx);
    }
  }

  return points.filter((_, i) => keep.has(i));
}

function contourToShape(
  contour: Point[],
  holes: Contour[],
  gw: number,
  gh: number,
  scaleX: number,
  scaleY: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const cx = gw / 2;
  const cy = gh / 2;

  for (let i = 0; i < contour.length; i++) {
    const sx = (contour[i].x - cx) * scaleX;
    const sy = -(contour[i].y - cy) * scaleY;
    if (i === 0) shape.moveTo(sx, sy);
    else shape.lineTo(sx, sy);
  }
  shape.closePath();

  for (const hc of holes) {
    const hole = new THREE.Path();
    for (let i = 0; i < hc.length; i++) {
      const sx = (hc[i].x - cx) * scaleX;
      const sy = -(hc[i].y - cy) * scaleY;
      if (i === 0) hole.moveTo(sx, sy);
      else hole.lineTo(sx, sy);
    }
    hole.closePath();
    shape.holes.push(hole);
  }

  return shape;
}

function classifyContours(contours: Contour[]): { outer: Contour; holes: Contour[] }[] {
  if (contours.length === 0) return [];
  contours.sort((a, b) => polygonArea(b) - polygonArea(a));

  const isInside = (inner: Contour, outer: Contour): boolean => {
    if (polygonArea(outer) < polygonArea(inner)) return false;
    const cx = inner[0].x, cy = inner[0].y;
    let inside = false;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      if (
        (outer[i].y > cy) !== (outer[j].y > cy) &&
        cx < ((outer[j].x - outer[i].x) * (cy - outer[i].y)) / (outer[j].y - outer[i].y) + outer[i].x
      ) inside = !inside;
    }
    return inside;
  };

  const assigned = new Set<number>();
  const results: { outer: Contour; holes: Contour[] }[] = [];

  for (let i = 0; i < contours.length; i++) {
    if (assigned.has(i)) continue;
    const holes: Contour[] = [];
    for (let j = i + 1; j < contours.length; j++) {
      if (!assigned.has(j) && isInside(contours[j], contours[i])) {
        holes.push(contours[j]);
        assigned.add(j);
      }
    }
    assigned.add(i);
    results.push({ outer: contours[i], holes });
  }

  return results;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

export type ImageToShapesResult = {
  shapes: THREE.Shape[];
  sourceWidth: number;
  sourceHeight: number;
};

export async function imageToShapes(
  source: string,
  options: {
    threshold?: number;
    simplifyEpsilon?: number;
    minArea?: number;
    maxDimension?: number;
  } = {},
): Promise<ImageToShapesResult> {
  const {
    threshold = 30,
    simplifyEpsilon = 1.5,
    minArea = 30,
    maxDimension = 300,
  } = options;

  const img = await loadImage(source);

  let w = img.width;
  let h = img.height;
  if (w > maxDimension || h > maxDimension) {
    const ratio = maxDimension / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);

  const { grid, width: gw, height: gh } = buildBinaryGrid(imageData, threshold);

  const rawContours = findContours(grid, gw, gh);

  const classified = classifyContours(rawContours);

  const scaleX = (w / gw) * 0.01;
  const scaleY = (h / gh) * 0.01;
  const shapes: THREE.Shape[] = [];

  for (const info of classified) {
    const simplifiedOuter = simplifyPoints(info.outer, simplifyEpsilon);
    if (simplifiedOuter.length < 4) continue;
    if (polygonArea(simplifiedOuter) < minArea) continue;

    const simplifiedHoles = info.holes
      .map((h) => simplifyPoints(h, simplifyEpsilon))
      .filter((h) => h.length >= 4 && polygonArea(h) >= minArea / 4);

    shapes.push(contourToShape(simplifiedOuter, simplifiedHoles, gw, gh, scaleX, scaleY));
  }

  if (shapes.length === 0) {
    const full: Point[] = [
      { x: 0, y: 0 }, { x: gw - 1, y: 0 },
      { x: gw - 1, y: gh - 1 }, { x: 0, y: gh - 1 },
    ];
    shapes.push(contourToShape(full, [], gw, gh, scaleX, scaleY));
  }

  return { shapes, sourceWidth: w, sourceHeight: h };
}
