import type { FloorPlan, PlacedItemBase, Point } from '../../types/floorPlan';
import { allLevelWalls } from '../plan/levels';
import { getLocalPlanBackground } from '../storage/planBackgroundStorage';

const PREVIEW_WIDTH = 400;
const PREVIEW_HEIGHT = 240;
const PADDING = 16;

function collectPoints(plan: FloorPlan): Point[] {
  const points: Point[] = [];
  for (const wall of allLevelWalls(plan.levels ?? [])) {
    points.push(wall.start, wall.end);
  }
  for (const item of [...plan.furniture, ...plan.landscape]) {
    points.push(...placeableBounds(item));
  }
  return points;
}

function placeableBounds(item: PlacedItemBase): Point[] {
  const { x, y } = item.position;
  return [
    { x, y },
    { x: x + item.width, y },
    { x, y: y + item.depth },
    { x: x + item.width, y: y + item.depth },
  ];
}

/** Rasterize walls and placeables when no background image is available. */
export function renderPlanPreviewDataUrl(plan: FloorPlan): string | null {
  const levels = plan.levels ?? [];
  if (
    allLevelWalls(levels).length === 0 &&
    plan.furniture.length === 0 &&
    plan.landscape.length === 0
  ) {
    return null;
  }

  const points = collectPoints(plan);
  if (points.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const innerW = PREVIEW_WIDTH - PADDING * 2;
  const innerH = PREVIEW_HEIGHT - PADDING * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const canvas = document.createElement('canvas');
  canvas.width = PREVIEW_WIDTH;
  canvas.height = PREVIEW_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);

  const toCanvas = (p: Point) => ({
    x: PADDING + (p.x - minX) * scale,
    y: PADDING + (p.y - minY) * scale,
  });

  for (const item of [...plan.furniture, ...plan.landscape]) {
    const tl = toCanvas(item.position);
    const w = item.width * scale;
    const h = item.depth * scale;
    const kind = 'kind' in item ? item.kind : '';
    ctx.fillStyle = kind === 'tree' || kind === 'shrub' ? '#bbf7d0' : '#e7e5e4';
    ctx.fillRect(tl.x, tl.y, w, h);
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x, tl.y, w, h);
  }

  ctx.strokeStyle = '#1c1917';
  ctx.lineCap = 'round';
  for (const wall of allLevelWalls(levels)) {
    const s = toCanvas(wall.start);
    const e = toCanvas(wall.end);
    ctx.lineWidth = Math.max(2, wall.thickness * scale * 0.5);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }

  return canvas.toDataURL('image/png');
}

export function resolvePlanBackground(projectId: string, plan: FloorPlan): string | undefined {
  if (plan.backgroundImage) return plan.backgroundImage;
  return getLocalPlanBackground(projectId)?.dataUrl;
}

export function getProjectPreviewUrl(projectId: string, plan: FloorPlan): string | null {
  const background = resolvePlanBackground(projectId, plan);
  if (background) return background;
  return renderPlanPreviewDataUrl(plan);
}
