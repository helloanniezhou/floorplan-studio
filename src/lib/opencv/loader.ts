declare global {
  interface Window {
    cv: OpenCvModule;
  }
}

export interface OpenCvModule {
  Mat: new (...args: unknown[]) => OpenCvMat;
  MatVector: new () => OpenCvMatVector;
  imread: (source: HTMLCanvasElement | HTMLImageElement) => OpenCvMat;
  cvtColor: (src: OpenCvMat, dst: OpenCvMat, code: number) => void;
  GaussianBlur: (
    src: OpenCvMat,
    dst: OpenCvMat,
    ksize: OpenCvSize,
    sigmaX: number,
  ) => void;
  adaptiveThreshold: (
    src: OpenCvMat,
    dst: OpenCvMat,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number,
  ) => void;
  Canny: (
    src: OpenCvMat,
    dst: OpenCvMat,
    threshold1: number,
    threshold2: number,
  ) => void;
  HoughLinesP: (
    image: OpenCvMat,
    lines: OpenCvMat,
    rho: number,
    theta: number,
    threshold: number,
    minLineLength: number,
    maxLineGap: number,
  ) => void;
  COLOR_RGBA2GRAY: number;
  ADAPTIVE_THRESH_GAUSSIAN_C: number;
  THRESH_BINARY_INV: number;
  onRuntimeInitialized?: () => void;
}

interface OpenCvMat {
  delete: () => void;
  rows: number;
  cols: number;
  data32S: Int32Array;
}

interface OpenCvMatVector {
  delete: () => void;
}

interface OpenCvSize {
  width: number;
  height: number;
}

let loadPromise: Promise<OpenCvModule> | null = null;

export function loadOpenCV(): Promise<OpenCvModule> {
  if (window.cv?.Mat) {
    return Promise.resolve(window.cv);
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.9.0/opencv.js';
    script.async = true;
    script.onload = () => {
      const check = () => {
        if (window.cv?.Mat) {
          resolve(window.cv);
        } else if (window.cv) {
          window.cv.onRuntimeInitialized = () => resolve(window.cv);
        } else {
          reject(new Error('OpenCV failed to initialize'));
        }
      };
      check();
    };
    script.onerror = () => reject(new Error('Failed to load OpenCV.js'));
    document.head.appendChild(script);
  });

  return loadPromise;
}
