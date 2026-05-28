import type { FloorPlan } from '../../types/floorPlan';
import {
  DEFAULT_BACKGROUND_OFFSET,
  DEFAULT_NORTH_ANGLE_DEG,
  DEFAULT_SUN_TIME,
  DEFAULT_TRACE_PARAMS,
} from '../../types/floorPlan';
import { defaultGridSizeForUnit } from '../units/defaults';

const DB_NAME = 'floorplan-studio';
const DB_VERSION = 1;
const STORE = 'projects';
const LAST_PROJECT_KEY = 'floorplan-studio:lastProjectId';
const LEGACY_PERSIST_KEY = 'floorplan-studio';

export type SavedProject = {
  id: string;
  name: string;
  updatedAt: number;
  plan: FloorPlan;
};

export type SavedProjectMeta = Pick<SavedProject, 'id' | 'name' | 'updatedAt'>;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export async function listProjects(): Promise<SavedProjectMeta[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const all = await requestToPromise(store.getAll() as IDBRequest<SavedProject[]>);
    return all
      .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function listFullProjects(): Promise<SavedProject[]> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const all = await requestToPromise(store.getAll() as IDBRequest<SavedProject[]>);
    return all.sort((a, b) => b.updatedAt - a.updatedAt);
  } finally {
    db.close();
  }
}

export async function getProject(id: string): Promise<SavedProject | undefined> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, 'readonly');
    return requestToPromise(tx.objectStore(STORE).get(id) as IDBRequest<SavedProject | undefined>);
  } finally {
    db.close();
  }
}

export async function saveProject(project: SavedProject): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STORE).put(project));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
    setLastProjectId(project.id);
  } finally {
    db.close();
  }
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    await requestToPromise(tx.objectStore(STORE).delete(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    });
    if (getLastProjectId() === id) {
      localStorage.removeItem(LAST_PROJECT_KEY);
    }
  } finally {
    db.close();
  }
}

export function getLastProjectId(): string | null {
  return localStorage.getItem(LAST_PROJECT_KEY);
}

export function setLastProjectId(id: string): void {
  localStorage.setItem(LAST_PROJECT_KEY, id);
}

type LegacyPersistPayload = {
  state?: Partial<FloorPlan>;
};

/** One-time migration from Zustand localStorage persist. */
export async function migrateLegacyLocalStorage(): Promise<SavedProject | null> {
  const raw = localStorage.getItem(LEGACY_PERSIST_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LegacyPersistPayload;
    const state = parsed.state;
    if (!state?.walls) return null;

    const plan: FloorPlan = {
      walls: state.walls ?? [],
      openings: state.openings ?? [],
      furniture: state.furniture ?? [],
      landscape: state.landscape ?? [],
      unit: state.unit ?? 'ft',
      wallHeight: state.wallHeight ?? 8,
      backgroundImage: state.backgroundImage,
      imageSize: state.imageSize,
      scale: state.scale ?? null,
      suggestions: state.suggestions ?? [],
      traceParams: state.traceParams ?? DEFAULT_TRACE_PARAMS,
      northAngleDeg: state.northAngleDeg ?? DEFAULT_NORTH_ANGLE_DEG,
      sunTime: state.sunTime ?? DEFAULT_SUN_TIME,
      lotSize: state.lotSize ?? null,
      gridSize: state.gridSize ?? defaultGridSizeForUnit(state.unit ?? 'ft'),
      backgroundOffset: state.backgroundOffset ?? DEFAULT_BACKGROUND_OFFSET,
      backgroundVisible: state.backgroundVisible ?? true,
    };

    const project: SavedProject = {
      id: crypto.randomUUID(),
      name: 'Imported plan',
      updatedAt: Date.now(),
      plan,
    };

    await saveProject(project);
    localStorage.removeItem(LEGACY_PERSIST_KEY);
    return project;
  } catch {
    return null;
  }
}
