import { v4 as uuidv4 } from 'uuid';
import type { LineSuggestion, TraceParams } from '../../types/floorPlan';
import { loadOpenCV } from './loader';
import {
  deduplicateLines,
  mergeCollinearLines,
  orthogonalizeLines,
} from './postProcess';

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function drawToCanvas(img: HTMLImageElement, maxWidth: number): HTMLCanvasElement {
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function traceFloorPlan(
  dataUrl: string,
  params: TraceParams,
): Promise<LineSuggestion[]> {
  const cv = await loadOpenCV();
  const img = await loadImage(dataUrl);
  const canvas = drawToCanvas(img, 2048);

  const src = cv.imread(canvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();
  const edges = new cv.Mat();
  const linesMat = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, blurred, { width: 5, height: 5 }, 0);
    cv.adaptiveThreshold(
      blurred,
      binary,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      11,
      2,
    );
    cv.Canny(binary, edges, params.cannyLow, params.cannyHigh);
    cv.HoughLinesP(
      edges,
      linesMat,
      1,
      Math.PI / 180,
      params.houghThreshold,
      params.minLineLength,
      params.maxLineGap,
    );

    const rawLines: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];
    for (let i = 0; i < linesMat.rows; i++) {
      const x1 = linesMat.data32S[i * 4];
      const y1 = linesMat.data32S[i * 4 + 1];
      const x2 = linesMat.data32S[i * 4 + 2];
      const y2 = linesMat.data32S[i * 4 + 3];
      rawLines.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
    }

    let processed = mergeCollinearLines(rawLines);
    if (params.orthogonalize) {
      processed = orthogonalizeLines(processed);
    }
    processed = deduplicateLines(processed, params.minLineLength * 0.5);

    return processed.map((line) => ({
      id: uuidv4(),
      start: line.start,
      end: line.end,
    }));
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    binary.delete();
    edges.delete();
    linesMat.delete();
  }
}
