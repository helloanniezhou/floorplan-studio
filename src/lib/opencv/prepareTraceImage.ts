/** Max dimension for trace processing — keeps OpenCV fast and UI responsive */
export const TRACE_MAX_DIMENSION = 960;

export type PreparedTraceImage = {
  width: number;
  height: number;
  /** RGBA pixel buffer */
  data: Uint8ClampedArray;
  /** Multiply worker coords by this to map back to original image pixels */
  scaleToOriginal: number;
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

export async function prepareTraceImage(dataUrl: string): Promise<PreparedTraceImage> {
  const img = await loadImage(dataUrl);
  const longest = Math.max(img.width, img.height);
  const scale = longest > TRACE_MAX_DIMENSION ? TRACE_MAX_DIMENSION / longest : 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas not available');

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  return {
    width,
    height,
    data: imageData.data,
    scaleToOriginal: 1 / scale,
  };
}

export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
