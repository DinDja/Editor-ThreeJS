'use client';

import * as THREE from 'three';

type Point = { x: number; y: number };

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}

function buildMask(imageData: ImageData, threshold: number): Uint8Array {
  const { data, width, height } = imageData;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      const hasAlpha = alpha > threshold;
      const isDark = brightness < 200;
      mask[y * width + x] = (hasAlpha && isDark) || (hasAlpha && alpha > 200) ? 1 : 0;
    }
  }
  return mask;
}

function dilate(mask: Uint8Array, w: number, h: number, iterations: number): Uint8Array {
  let current = mask;
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Uint8Array(current.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (current[idx]) {
          next[idx] = 1;
          continue;
        }
        if (x > 0 && current[idx - 1]) next[idx] = 1;
        else if (x < w - 1 && current[idx + 1]) next[idx] = 1;
        else if (y > 0 && current[idx - w]) next[idx] = 1;
        else if (y < h - 1 && current[idx + w]) next[idx] = 1;
      }
    }
    current = next;
  }
  return current;
}

function erode(mask: Uint8Array, w: number, h: number, iterations: number): Uint8Array {
  let current = mask;
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Uint8Array(current.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!current[idx]) {
          next[idx] = 0;
          continue;
        }
        const left = x > 0 ? current[idx - 1] : 0;
        const right = x < w - 1 ? current[idx + 1] : 0;
        const up = y > 0 ? current[idx - w] : 0;
        const down = y < h - 1 ? current[idx + w] : 0;
        next[idx] = (left && right && up && down) ? 1 : 0;
      }
    }
    current = next;
  }
  return current;
}

const CASE_TABLE: number[][] = [
  [-1, -1],
  [3, 0],
  [0, 1],
  [3, 1],
  [1, 2],
  [-1, -1],
  [0, 2],
  [3, 2],
  [2, 3],
  [2, 0],
  [-1, -1],
  [2, 1],
  [1, 3],
  [0, 1],
  [3, 0],
  [-1, -1],
];

function marchingSquares(mask: Uint8Array, w: number, h: number): Point[][] {
  type Seg = { a: Point; b: Point };
  const segments: Seg[] = [];

  const edgePt = (cx: number, cy: number, edge: number): Point => {
    switch (edge) {
      case 0: return { x: cx + 0.5, y: cy };
      case 1: return { x: cx + 1, y: cy + 0.5 };
      case 2: return { x: cx + 0.5, y: cy + 1 };
      case 3: return { x: cx, y: cy + 0.5 };
      default: return { x: cx, y: cy };
    }
  };

  for (let y = 0; y < h - 1; y++) {
    for (let x = 0; x < w - 1; x++) {
      const v0 = mask[y * w + x];
      const v1 = mask[y * w + x + 1];
      const v2 = mask[(y + 1) * w + x + 1];
      const v3 = mask[(y + 1) * w + x];
      const caseIdx = (v0 ? 1 : 0) | (v1 ? 2 : 0) | (v2 ? 4 : 0) | (v3 ? 8 : 0);

      if (caseIdx === 5 || caseIdx === 10) {
        const center = (v0 + v1 + v2 + v3) / 4;
        if (center > 0.5) {
          if (caseIdx === 5) {
            segments.push({ a: edgePt(x, y, 3), b: edgePt(x, y, 1) });
            segments.push({ a: edgePt(x, y, 0), b: edgePt(x, y, 2) });
          } else {
            segments.push({ a: edgePt(x, y, 0), b: edgePt(x, y, 3) });
            segments.push({ a: edgePt(x, y, 1), b: edgePt(x, y, 2) });
          }
        } else {
          if (caseIdx === 5) {
            segments.push({ a: edgePt(x, y, 3), b: edgePt(x, y, 0) });
            segments.push({ a: edgePt(x, y, 1), b: edgePt(x, y, 2) });
          } else {
            segments.push({ a: edgePt(x, y, 0), b: edgePt(x, y, 1) });
            segments.push({ a: edgePt(x, y, 2), b: edgePt(x, y, 3) });
          }
        }
        continue;
      }

      const [ea, eb] = CASE_TABLE[caseIdx];
      if (ea < 0) continue;
      segments.push({ a: edgePt(x, y, ea), b: edgePt(x, y, eb) });
    }
  }

  return connectSegments(segments);
}

function connectSegments(segments: { a: Point; b: Point }[]): Point[][] {
  const key = (p: Point) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
  const map = new Map<string, number[]>();
  const segs = segments.map(s => ({ a: { ...s.a }, b: { ...s.b }, used: false }));

  for (let i = 0; i < segs.length; i++) {
    const ka = key(segs[i].a);
    const kb = key(segs[i].b);
    if (!map.has(ka)) map.set(ka, []);
    if (!map.has(kb)) map.set(kb, []);
    map.get(ka)!.push(i);
    map.get(kb)!.push(i);
  }

  const contours: Point[][] = [];

  for (let startIdx = 0; startIdx < segs.length; startIdx++) {
    if (segs[startIdx].used) continue;

    const contour: Point[] = [segs[startIdx].a];
    segs[startIdx].used = true;
    contour.push(segs[startIdx].b);
    let endPt = segs[startIdx].b;
    const startKey = key(segs[startIdx].a);

    while (true) {
      const k = key(endPt);
      const candidates = map.get(k);
      if (!candidates) break;

      let foundIdx = -1;
      for (const ci of candidates) {
        if (!segs[ci].used) {
          foundIdx = ci;
          break;
        }
      }

      if (foundIdx < 0) break;

      const seg = segs[foundIdx];
      seg.used = true;

      if (key(seg.a) === k) {
        endPt = seg.b;
      } else {
        endPt = seg.a;
      }

      if (key(endPt) === startKey) break;
      contour.push(endPt);
    }

    if (contour.length >= 4) {
      contours.push(contour);
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
  return a * 0.5;
}

function simplifyRDP(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return [...points];

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack: [number, number][] = [[0, points.length - 1]];

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
        const t = ((points[i].x - a.x) * dx + (points[i].y - a.y) * dy) / len2;
        const tc = Math.max(0, Math.min(1, t));
        d = Math.hypot(points[i].x - (a.x + tc * dx), points[i].y - (a.y + tc * dy));
      }
      if (d > maxDist) {
        maxDist = d;
        maxIdx = i;
      }
    }

    if (maxDist > epsilon) {
      keep[maxIdx] = 1;
      stack.push([lo, maxIdx]);
      stack.push([maxIdx, hi]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function classifyContours(contours: Point[][]): { outer: Point[]; holes: Point[][] }[] {
  if (contours.length === 0) return [];

  const withArea = contours.map(c => ({ pts: c, area: Math.abs(polygonArea(c)) }));
  withArea.sort((a, b) => b.area - a.area);

  const isInside = (inner: Point[], outer: Point[]): boolean => {
    const cx = inner[0].x;
    const cy = inner[0].y;
    let inside = false;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      if ((outer[i].y > cy) !== (outer[j].y > cy) &&
        cx < ((outer[j].x - outer[i].x) * (cy - outer[i].y)) / (outer[j].y - outer[i].y) + outer[i].x) {
        inside = !inside;
      }
    }
    return inside;
  };

  const assigned = new Set<number>();
  const result: { outer: Point[]; holes: Point[][] }[] = [];

  for (let i = 0; i < withArea.length; i++) {
    if (assigned.has(i)) continue;
    const holes: Point[][] = [];
    for (let j = i + 1; j < withArea.length; j++) {
      if (assigned.has(j)) continue;
      if (withArea[j].area < withArea[i].area * 0.01) continue;
      if (isInside(withArea[j].pts, withArea[i].pts)) {
        holes.push(withArea[j].pts);
        assigned.add(j);
      }
    }
    assigned.add(i);
    result.push({ outer: withArea[i].pts, holes });
  }

  return result;
}

function contoursToShape(
  outer: Point[],
  holes: Point[][],
  imgW: number,
  imgH: number,
): THREE.Shape {
  const shape = new THREE.Shape();
  const sx = 1 / imgW;
  const sy = 1 / imgH;

  const toVec = (p: Point) => new THREE.Vector2(
    (p.x * sx - 0.5) * 2,
    (0.5 - p.y * sy) * 2,
  );

  const outerPts = outer.map(toVec);
  shape.moveTo(outerPts[0].x, outerPts[0].y);
  for (let i = 1; i < outerPts.length; i++) {
    shape.lineTo(outerPts[i].x, outerPts[i].y);
  }
  shape.closePath();

  for (const hole of holes) {
    const holePath = new THREE.Path();
    const holePts = hole.map(toVec);
    holePath.moveTo(holePts[0].x, holePts[0].y);
    for (let i = 1; i < holePts.length; i++) {
      holePath.lineTo(holePts[i].x, holePts[i].y);
    }
    holePath.closePath();
    shape.holes.push(holePath);
  }

  return shape;
}

export type ExtrudeOptions = {
  threshold?: number;
  depth?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
  simplifyEpsilon?: number;
  maxDimension?: number;
  cleanup?: number;
};

export type ExtrudeResult = {
  geometry: THREE.BufferGeometry;
  texture: THREE.CanvasTexture;
  width: number;
  height: number;
};

export async function imageToExtrudedMesh(
  source: string,
  options: ExtrudeOptions = {},
): Promise<ExtrudeResult> {
  const {
    threshold = 30,
    depth = 0.3,
    bevelEnabled = false,
    bevelThickness = 0.05,
    bevelSize = 0.05,
    bevelSegments = 3,
    simplifyEpsilon = 1.0,
    maxDimension = 400,
    cleanup = 1,
  } = options;

  const img = await loadImage(source);

  let imgW = img.width;
  let imgH = img.height;
  if (imgW > maxDimension || imgH > maxDimension) {
    const ratio = maxDimension / Math.max(imgW, imgH);
    imgW = Math.round(imgW * ratio);
    imgH = Math.round(imgH * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = imgW;
  canvas.height = imgH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(img, 0, 0, imgW, imgH);
  const imageData = ctx.getImageData(0, 0, imgW, imgH);

  let mask = buildMask(imageData, threshold);

  if (cleanup > 0) {
    mask = erode(mask, imgW, imgH, cleanup);
    mask = dilate(mask, imgW, imgH, cleanup + 1);
  }

  const rawContours = marchingSquares(mask, imgW, imgH);

  const simplified = rawContours
    .map(c => simplifyRDP(c, simplifyEpsilon))
    .filter(c => c.length >= 4);

  const classified = classifyContours(simplified);

  if (classified.length === 0) {
    const fallback = new THREE.Shape();
    fallback.moveTo(-0.8, -0.8);
    fallback.lineTo(0.8, -0.8);
    fallback.lineTo(0.8, 0.8);
    fallback.lineTo(-0.8, 0.8);
    fallback.closePath();

    const geo = new THREE.ExtrudeGeometry(fallback, {
      depth, bevelEnabled, bevelThickness, bevelSize, bevelSegments,
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { geometry: geo, texture: tex, width: imgW, height: imgH };
  }

  const shapes = classified.map(c =>
    contoursToShape(c.outer, c.holes, imgW, imgH)
  );

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled,
    bevelThickness,
    bevelSize,
    bevelSegments,
  });

  geometry.computeBoundingBox();
  geometry.computeVertexNormals();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return { geometry, texture, width: imgW, height: imgH };
}
