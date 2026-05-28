import { useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FloorPlan } from '../types/floorPlan';
import {
  deleteProject,
  getLastProjectId,
  getProject,
  listFullProjects,
  listProjects,
  migrateLegacyLocalStorage,
  saveProject,
  type SavedProject,
  type SavedProjectMeta,
} from '../lib/storage/projectStorage';
import {
  deleteSupabaseProject,
  getSupabaseProject,
  listSupabaseProjects,
  saveSupabaseProject,
} from '../lib/storage/supabaseProjectStorage';

const AUTOSAVE_MS = 1500;
const CLOUD_MIGRATED_KEY_PREFIX = 'floorplan-studio:cloudMigrated:';

function planFingerprint(plan: FloorPlan): string {
  return JSON.stringify({
    walls: plan.walls,
    openings: plan.openings,
    furniture: plan.furniture,
    landscape: plan.landscape,
    unit: plan.unit,
    wallHeight: plan.wallHeight,
    scale: plan.scale,
    traceParams: plan.traceParams,
    northAngleDeg: plan.northAngleDeg,
    sunTime: plan.sunTime,
    lotSize: plan.lotSize,
    backgroundOffset: plan.backgroundOffset,
    backgroundVisible: plan.backgroundVisible,
    imageSize: plan.imageSize,
    hasBackground: Boolean(plan.backgroundImage),
    bgLen: plan.backgroundImage?.length ?? 0,
  });
}

export function useProjectPersistence() {
  const auth = useSupabaseAuth();
  const storageReady = useFloorPlanStore((s) => s.storageReady);
  const projectId = useFloorPlanStore((s) => s.projectId);
  const projectName = useFloorPlanStore((s) => s.projectName);
  const saveStatus = useFloorPlanStore((s) => s.saveStatus);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedFingerprint = useRef<string | null>(null);
  const savingRef = useRef(false);
  const cloudMode = auth.enabled && Boolean(auth.user);

  const ensureLocalProjectsMigratedToCloud = useCallback(async () => {
    if (!auth.user) return;
    const markerKey = `${CLOUD_MIGRATED_KEY_PREFIX}${auth.user.id}`;
    if (localStorage.getItem(markerKey) === '1') return;

    const localProjects = await listFullProjects();
    if (localProjects.length === 0) {
      localStorage.setItem(markerKey, '1');
      return;
    }

    for (const project of localProjects) {
      await saveSupabaseProject(auth.user.id, project);
    }
    localStorage.setItem(markerKey, '1');
  }, [auth.user]);

  const backend = useMemo(
    () => ({
      list: async (): Promise<SavedProjectMeta[]> => {
        if (cloudMode && auth.user) return listSupabaseProjects(auth.user.id);
        return listProjects();
      },
      get: async (id: string): Promise<SavedProject | undefined> => {
        if (cloudMode && auth.user) return getSupabaseProject(auth.user.id, id);
        return getProject(id);
      },
      save: async (project: SavedProject): Promise<void> => {
        if (cloudMode && auth.user) {
          await saveSupabaseProject(auth.user.id, project);
          return;
        }
        await saveProject(project);
      },
      remove: async (id: string): Promise<void> => {
        if (cloudMode && auth.user) {
          await deleteSupabaseProject(auth.user.id, id);
          return;
        }
        await deleteProject(id);
      },
    }),
    [auth.user, cloudMode],
  );

  const persistCurrent = useCallback(async (nameOverride?: string) => {
    const state = useFloorPlanStore.getState();
    let id = state.projectId;
    if (!id) {
      id = uuidv4();
      state.setProjectMeta(id, nameOverride ?? state.projectName);
    }

    const name = nameOverride ?? state.projectName;
    const plan = state.exportPlan();
    const project: SavedProject = {
      id,
      name,
      updatedAt: Date.now(),
      plan,
    };

    useFloorPlanStore.setState({ saveStatus: 'saving' });
    savingRef.current = true;
    try {
      await backend.save(project);
      lastSavedFingerprint.current = planFingerprint(plan);
      useFloorPlanStore.setState({
        projectId: id,
        projectName: name,
        saveStatus: 'saved',
      });
    } catch {
      useFloorPlanStore.setState({ saveStatus: 'error' });
    } finally {
      savingRef.current = false;
    }
  }, [backend]);

  const scheduleAutosave = useCallback(() => {
    if (!useFloorPlanStore.getState().storageReady) return;
    useFloorPlanStore.setState({ saveStatus: 'dirty' });

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void persistCurrent();
    }, AUTOSAVE_MS);
  }, [persistCurrent]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (auth.enabled && auth.loading) return;
      if (auth.enabled && !auth.user) {
        useFloorPlanStore.setState({ storageReady: false, saveStatus: 'saved' });
        return;
      }

      if (cloudMode) {
        await ensureLocalProjectsMigratedToCloud();
        if (cancelled) return;
      }

      let project: SavedProject | null | undefined = null;
      if (!cloudMode) {
        const migrated = await migrateLegacyLocalStorage();
        if (cancelled) return;
        project = migrated;
        if (!project) {
          const lastId = getLastProjectId();
          if (lastId) {
            project = await backend.get(lastId);
          }
        }
      }

      if (!project) {
        const all = await backend.list();
        if (all.length > 0) {
          project = await backend.get(all[0].id);
        }
      }

      if (cancelled) return;

      if (project) {
        useFloorPlanStore.getState().importPlan(project.plan, { recordHistory: false });
        useFloorPlanStore.setState({
          projectId: project.id,
          projectName: project.name,
          storageReady: true,
          saveStatus: 'saved',
          undoStack: [],
          redoStack: [],
        });
        lastSavedFingerprint.current = planFingerprint(project.plan);
      } else {
        const id = uuidv4();
        useFloorPlanStore.setState({
          projectId: id,
          projectName: 'Untitled plan',
          storageReady: true,
          saveStatus: 'saved',
        });
        lastSavedFingerprint.current = planFingerprint(useFloorPlanStore.getState().exportPlan());
        await persistCurrent('Untitled plan');
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [
    auth.enabled,
    auth.loading,
    auth.user,
    backend,
    cloudMode,
    ensureLocalProjectsMigratedToCloud,
    persistCurrent,
  ]);

  useEffect(() => {
    if (!storageReady) return;

    const unsub = useFloorPlanStore.subscribe((state, prev) => {
      const fields: (keyof typeof state)[] = [
        'walls',
        'openings',
        'furniture',
        'landscape',
        'unit',
        'wallHeight',
        'backgroundImage',
        'imageSize',
        'scale',
        'traceParams',
        'suggestions',
        'northAngleDeg',
        'sunTime',
        'lotSize',
        'backgroundOffset',
        'backgroundVisible',
      ];
      const changed = fields.some((f) => state[f] !== prev[f]);
      if (!changed || savingRef.current) return;

      const fp = planFingerprint(state.exportPlan());
      if (fp === lastSavedFingerprint.current) return;

      scheduleAutosave();
    });

    return () => {
      unsub();
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [storageReady, scheduleAutosave]);

  const saveNow = useCallback(async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    await persistCurrent();
  }, [persistCurrent]);

  const saveAs = useCallback(
    async (name: string) => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

      const state = useFloorPlanStore.getState();
      const trimmed = name.trim() || 'Untitled plan';
      const plan = state.exportPlan();
      const id = uuidv4();

      const project: SavedProject = {
        id,
        name: trimmed,
        updatedAt: Date.now(),
        plan,
      };

      useFloorPlanStore.setState({ saveStatus: 'saving' });
      savingRef.current = true;
      try {
        await backend.save(project);
        lastSavedFingerprint.current = planFingerprint(plan);
        useFloorPlanStore.setState({
          projectId: id,
          projectName: trimmed,
          saveStatus: 'saved',
        });
      } catch {
        useFloorPlanStore.setState({ saveStatus: 'error' });
      } finally {
        savingRef.current = false;
      }
    },
    [backend],
  );

  const renameProject = useCallback(
    async (name: string) => {
      const trimmed = name.trim() || 'Untitled plan';
      useFloorPlanStore.setState({ projectName: trimmed });
      await persistCurrent(trimmed);
    },
    [persistCurrent],
  );

  const loadProject = useCallback(async (id: string) => {
    const project = await backend.get(id);
    if (!project) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    useFloorPlanStore.getState().importPlan(project.plan, { recordHistory: false });
    useFloorPlanStore.setState({
      projectId: project.id,
      projectName: project.name,
      saveStatus: 'saved',
      tool: 'select',
      selection: null,
      show3DPreview: false,
      undoStack: [],
      redoStack: [],
    });
    lastSavedFingerprint.current = planFingerprint(project.plan);
    await backend.save({ ...project, updatedAt: Date.now() });
  }, [backend]);

  const createNewProject = useCallback(async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    const state = useFloorPlanStore.getState();
    if (state.saveStatus === 'dirty' || state.saveStatus === 'saving') {
      await persistCurrent();
    }

    const id = uuidv4();
    state.resetPlan();
    useFloorPlanStore.setState({
      projectId: id,
      projectName: 'Untitled plan',
      saveStatus: 'saved',
      tool: 'wall',
      selection: null,
      show3DPreview: false,
      undoStack: [],
      redoStack: [],
    });
    lastSavedFingerprint.current = planFingerprint(useFloorPlanStore.getState().exportPlan());
    await persistCurrent('Untitled plan');
  }, [persistCurrent]);

  const removeProject = useCallback(
    async (id: string) => {
      await backend.remove(id);
      if (useFloorPlanStore.getState().projectId === id) {
        const remaining = await backend.list();
        if (remaining.length > 0) {
          await loadProject(remaining[0].id);
        } else {
          await createNewProject();
        }
      }
    },
    [backend, loadProject, createNewProject],
  );

  const fetchProjectList = useCallback(async (): Promise<SavedProjectMeta[]> => {
    return backend.list();
  }, [backend]);

  const renameAnyProject = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim() || 'Untitled plan';
      const project = await backend.get(id);
      if (!project) return;
      await backend.save({
        ...project,
        name: trimmed,
        updatedAt: Date.now(),
      });
      if (useFloorPlanStore.getState().projectId === id) {
        useFloorPlanStore.setState({ projectName: trimmed });
      }
    },
    [backend],
  );

  return {
    authEnabled: auth.enabled,
    authLoading: auth.loading,
    user: auth.user,
    cloudMode,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut,
    storageReady,
    projectId,
    projectName,
    saveStatus,
    saveNow,
    saveAs,
    renameProject,
    loadProject,
    createNewProject,
    removeProject,
    renameAnyProject,
    fetchProjectList,
  };
}
