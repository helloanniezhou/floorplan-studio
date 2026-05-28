import type { FloorPlan, Point } from '../../types/floorPlan';
import { formatLength } from '../geometry/vectors';
import { wallFootprintPolygon } from '../geometry/wallFootprint';
import { allLevelLights, allLevelWalls } from '../plan/levels';

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 1200;
const PADDING = 48;

function collectPoints(plan: FloorPlan): Point[] {
  const points: Point[] = [];
  for (const wall of allLevelWalls(plan.levels ?? [])) {
    points.push(wall.start, wall.end);
  }
  for (const light of allLevelLights(plan.levels ?? [])) {
    points.push(light.position);
  }
  for (const item of [...plan.furniture, ...plan.landscape]) {
    const { x, y } = item.position;
    points.push(
      { x, y },
      { x: x + item.width, y },
      { x, y: y + item.depth },
      { x: x + item.width, y: y + item.depth },
    );
  }
  if (plan.lotSize) {
    points.push({ x: 0, y: 0 }, { x: plan.lotSize.width, y: plan.lotSize.depth });
  }
  return points;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load plan image'));
    img.src = src;
  });
}

export type PlanImageExportOptions = {
  width?: number;
  height?: number;
  backgroundImage?: string;
};

/** Rasterize the 2D plan for PNG/PDF export. */
export async function renderPlanExportImage(
  plan: FloorPlan,
  options: PlanImageExportOptions = {},
): Promise<string | null> {
  const exportWalls = allLevelWalls(plan.levels ?? []);
  if (exportWalls.length === 0 && plan.furniture.length === 0 && plan.landscape.length === 0) {
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

  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const innerW = width - PADDING * 2;
  const innerH = height - PADDING * 2;
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#fafaf9';
  ctx.fillRect(0, 0, width, height);

  const toCanvas = (p: Point) => ({
    x: PADDING + (p.x - minX) * scale,
    y: PADDING + (p.y - minY) * scale,
  });

  const bgSrc = options.backgroundImage ?? plan.backgroundImage;
  if (bgSrc && plan.backgroundVisible !== false) {
    try {
      const img = await loadImage(bgSrc);
      const ox = plan.backgroundOffset?.x ?? 0;
      const oy = plan.backgroundOffset?.y ?? 0;
      const drawAt = toCanvas({ x: ox, y: oy });
      const imgW = (plan.imageSize?.width ?? img.width) * scale;
      const imgH = (plan.imageSize?.height ?? img.height) * scale;
      ctx.globalAlpha = 0.45;
      ctx.drawImage(img, drawAt.x, drawAt.y, imgW, imgH);
      ctx.globalAlpha = 1;
    } catch {
      /* skip background if decode fails */
    }
  }

  if (plan.lotSize) {
    const tl = toCanvas({ x: 0, y: 0 });
    const w = plan.lotSize.width * scale;
    const h = plan.lotSize.depth * scale;
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = '#15803d';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, w, h);
    ctx.setLineDash([]);
  }

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
  ctx.lineJoin = 'round';
  for (const wall of exportWalls) {
    const footprint = wallFootprintPolygon(wall, exportWalls);
    ctx.beginPath();
    footprint.forEach((p, i) => {
      const c = toCanvas(p);
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.closePath();
    ctx.fillStyle = '#2d2d2d';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = '#57534e';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Unit: ${plan.unit}`, PADDING, height - 16);
  if (plan.scale) {
    ctx.fillText(
      `Scale: ${plan.scale.pixelsPerUnit.toFixed(1)} px / ${plan.unit}`,
      PADDING,
      height - 36,
    );
  }
  if (plan.lotSize) {
    ctx.fillText(
      `Lot: ${formatLength(plan.lotSize.width, plan.unit)} × ${formatLength(plan.lotSize.depth, plan.unit)}`,
      PADDING,
      height - 56,
    );
  }

  return canvas.toDataURL('image/png');
}
