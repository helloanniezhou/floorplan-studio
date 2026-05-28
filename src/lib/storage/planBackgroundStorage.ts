/** Keeps large plan background images in the browser when cloud rows omit them. */

const KEY_PREFIX = 'floorplan-studio:bg:';

type StoredBackground = {
  dataUrl: string;
  imageSize?: { width: number; height: number };
};

export function saveLocalPlanBackground(
  projectId: string,
  dataUrl: string,
  imageSize?: { width: number; height: number },
): void {
  try {
    const payload: StoredBackground = { dataUrl, imageSize };
    localStorage.setItem(`${KEY_PREFIX}${projectId}`, JSON.stringify(payload));
  } catch {
    // Quota exceeded — cloud save may still work without local copy.
  }
}

export function getLocalPlanBackground(projectId: string): StoredBackground | null {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw) as StoredBackground;
  } catch {
    return null;
  }
}

export function clearLocalPlanBackground(projectId: string): void {
  localStorage.removeItem(`${KEY_PREFIX}${projectId}`);
}
