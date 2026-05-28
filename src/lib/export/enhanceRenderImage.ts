function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load render image'));
    img.src = src;
  });
}

/** Stylize a 3D viewport screenshot for a more photorealistic look. */
export async function enhanceRenderImage(dataUrl: string): Promise<string> {
  const img = await loadImage(dataUrl);
  const w = img.width;
  const h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.filter = 'contrast(1.06) saturate(1.12) brightness(1.03)';
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';

  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.2,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(15,20,30,0.22)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const warm = ctx.createLinearGradient(0, 0, w, h);
  warm.addColorStop(0, 'rgba(255, 220, 180, 0.04)');
  warm.addColorStop(1, 'rgba(180, 210, 255, 0.06)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, w, h);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
