/**
 * OpenCV wall detection off the main thread so the UI stays responsive.
 */

/// <reference lib="webworker" />

export type WorkerTraceParams = {
  cannyLow: number;
  cannyHigh: number;
  houghThreshold: number;
  minLineLength: number;
  maxLineGap: number;
};

export type WorkerLine = { start: { x: number; y: number }; end: { x: number; y: number } };

export type WorkerTraceRequest = {
  id: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
  params: WorkerTraceParams;
};

export type WorkerTraceResponse =
  | { id: number; lines: WorkerLine[] }
  | { id: number; error: string };

const OPENCV_URL = 'https://docs.opencv.org/4.9.0/opencv.js';
const MAX_RAW_LINES = 200;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cv = any;

let cvReady: Promise<Cv> | null = null;

function loadCv(): Promise<Cv> {
  if (cvReady) return cvReady;
  cvReady = new Promise((resolve, reject) => {
    try {
      (self as DedicatedWorkerGlobalScope).importScripts(OPENCV_URL);
    } catch {
      reject(new Error('Failed to load OpenCV.js'));
      return;
    }

    const cv = (self as unknown as { cv?: Cv }).cv;
    if (!cv) {
      reject(new Error('OpenCV not available in worker'));
      return;
    }

    if (cv.Mat) {
      resolve(cv);
      return;
    }

    cv.onRuntimeInitialized = () => resolve(cv);
  });
  return cvReady;
}

function runPipeline(
  cv: Cv,
  width: number,
  height: number,
  data: Uint8ClampedArray,
  params: WorkerTraceParams,
): WorkerLine[] {
  const src = cv.matFromImageData({ data, width, height });
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const binary = new cv.Mat();
  const edges = new cv.Mat();
  const linesMat = new cv.Mat();

  const minDim = Math.min(width, height);
  const minLineLength = Math.max(
    params.minLineLength,
    Math.round(minDim * 0.06),
  );
  const houghThreshold = Math.max(params.houghThreshold, Math.round(minDim * 0.08));

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
      houghThreshold,
      minLineLength,
      params.maxLineGap,
    );

    const raw: WorkerLine[] = [];
    const rows = linesMat.rows;
    for (let i = 0; i < rows && raw.length < MAX_RAW_LINES * 2; i++) {
      const x1 = linesMat.data32S[i * 4];
      const y1 = linesMat.data32S[i * 4 + 1];
      const x2 = linesMat.data32S[i * 4 + 2];
      const y2 = linesMat.data32S[i * 4 + 3];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len >= minLineLength * 0.5) {
        raw.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
      }
    }

    raw.sort((a, b) => {
      const la = Math.hypot(a.end.x - a.start.x, a.end.y - a.start.y);
      const lb = Math.hypot(b.end.x - b.start.x, b.end.y - b.start.y);
      return lb - la;
    });

    return raw.slice(0, MAX_RAW_LINES);
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    binary.delete();
    edges.delete();
    linesMat.delete();
  }
}

self.onmessage = async (event: MessageEvent<WorkerTraceRequest>) => {
  const { id, width, height, data, params } = event.data;
  try {
    const cv = await loadCv();
    const lines = runPipeline(cv, width, height, data, params);
    const response: WorkerTraceResponse = { id, lines };
    self.postMessage(response);
  } catch (err) {
    const response: WorkerTraceResponse = {
      id,
      error: err instanceof Error ? err.message : 'Trace failed in worker',
    };
    self.postMessage(response);
  }
};
