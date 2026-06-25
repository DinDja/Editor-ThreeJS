export type Rect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type AlignmentAxis = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom';

export type AlignmentGuide = {
  axis: AlignmentAxis;
  value: number;
  start: number;
  end: number;
};

const ALIGNMENT_THRESHOLD = 5;

const edges = (rect: Rect) => ({
  left: rect.left,
  centerX: rect.left + rect.width / 2,
  right: rect.left + rect.width,
  top: rect.top,
  centerY: rect.top + rect.height / 2,
  bottom: rect.top + rect.height,
});

export const computeAlignmentGuides = (
  targetRect: Rect,
  candidates: Rect[],
  threshold = ALIGNMENT_THRESHOLD,
): AlignmentGuide[] => {
  const guides: AlignmentGuide[] = [];
  const target = edges(targetRect);

  const verticalAxes: AlignmentAxis[] = ['left', 'centerX', 'right'];
  const horizontalAxes: AlignmentAxis[] = ['top', 'centerY', 'bottom'];

  for (const candidate of candidates) {
    const cand = edges(candidate);

    for (const axis of verticalAxes) {
      const diff = Math.abs(target[axis] - cand[axis]);
      if (diff < threshold) {
        const minY = Math.min(target.top, cand.top);
        const maxY = Math.max(target.bottom, cand.bottom);
        guides.push({
          axis,
          value: cand[axis],
          start: minY,
          end: maxY,
        });
      }
    }

    for (const axis of horizontalAxes) {
      const diff = Math.abs(target[axis] - cand[axis]);
      if (diff < threshold) {
        const minX = Math.min(target.left, cand.left);
        const maxX = Math.max(target.right, cand.right);
        guides.push({
          axis,
          value: cand[axis],
          start: minX,
          end: maxX,
        });
      }
    }
  }

  return deduplicateGuides(guides);
};

const deduplicateGuides = (guides: AlignmentGuide[]): AlignmentGuide[] => {
  const seen = new Set<string>();
  return guides.filter((guide) => {
    const key = `${guide.axis}:${Math.round(guide.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
