import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FloorPlan } from '../types/floorPlan';
import {
  deleteProject,
  getLastProjectId,
  getProject,
  listProjects,
  migrateLegacyLocalStorage,
  saveProject,
  type SavedProject,
  type SavedProjectMeta,
} from '../lib/storage/projectStorage';
import {
  collectLocalBrowserProjects,
  hasMeaningfulPlan,
} from '../lib/storage/localProjectImport';
import {
  deleteSupabaseProject,
  getSupabaseProject,
  listSupabaseProjects,
  saveSupabaseProject,
} from '../lib/storage/supabaseProjectStorage';
import { CloudSyncError } from '../lib/storage/supabaseErrors';
import { mergeProjectMetaLists } from '../lib/storage/mergeProjectLists';

const AUTOSAVE_MS = 1500;
const CLOUD_MIGRATED_KEY_PREFIX = 'floorplan-studio:cloudMigrated:';

function cloudMigratedKey(userId: string): string {
  return `${CLOUD_MIGRATED_KEY_PREFIX}${userId}`;
}

export function clearCloudMigrationMarker(userId: string): void {
  localStorage.removeItem(cloudMigratedKey(userId));
}

function planFingerprint(plan: FloorPlan): string {
  return JSON.stringify({
    levels: plan.levels,
    furniture: plan.furniture,
    landscape: plan.landscape,
    unit: plan.unit,
    wallHeight: plan.wallHeight,
    scale: plan.scale,
    traceParams: plan.traceParams,
    northAngleDeg: plan.northAngleDeg,
    sunTime: plan.sunTime,
    lotSize: plan.lotSize,
    gridSize: plan.gridSize,
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
  const [saveDetail, setSaveDetail] = useState<string | null>(null);

  const collectLocalProjects = useCallback(async () => {
    const state = useFloorPlanStore.getState();
    return collectLocalBrowserProjects({
      id: state.projectId,
      name: state.projectName,
      exportPlan: () => state.exportPlan(),
      wallCount: state.levels.find((l) => l.kind === 'floor')?.walls.length ?? 0,
    });
  }, []);

  const ensureLocalProjectsMigratedToCloud = useCallback(
    async (options?: { force?: boolean }) => {
      if (!auth.user) return { imported: 0, localCount: 0 };

      const userId = auth.user.id;
      const markerKey = cloudMigratedKey(userId);
      const localProjects = await collectLocalProjects();
      const localCount = localProjects.length;

      if (localCount === 0) {
        return { imported: 0, localCount: 0 };
      }

      let cloudProjects: SavedProjectMeta[] = [];
      try {
        cloudProjects = await listSupabaseProjects(userId);
      } catch {
        // Table/RLS issues — still attempt upload below.
      }

      const markerSet = localStorage.getItem(markerKey) === '1';
      const cloudMissingLocal = localProjects.some(
        (local) => !cloudProjects.some((cloud) => cloud.id === local.id),
      );
      const shouldUpload =
        options?.force === true ||
        cloudProjects.length === 0 ||
        cloudMissingLocal ||
        !markerSet;

      if (!shouldUpload) {
        return { imported: 0, localCount };
      }

      let imported = 0;
      for (const project of localProjects) {
        await saveSupabaseProject(userId, project);
        imported += 1;
      }
      localStorage.setItem(markerKey, '1');
      return { imported, localCount };
    },
    [auth.user, collectLocalProjects],
  );

  const importLocalBrowserProjects = useCallback(async () => {
    if (!auth.user) {
      throw new Error('Sign in to import browser projects to your account.');
    }
    clearCloudMigrationMarker(auth.user.id);
    return ensureLocalProjectsMigratedToCloud({ force: true });
  }, [auth.user, ensureLocalProjectsMigratedToCloud]);

  const backend = useMemo(
    () => ({
      list: async (): Promise<SavedProjectMeta[]> => {
        const local = (await collectLocalBrowserProjects()).map((p) => ({
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
        }));
        if (!cloudMode || !auth.user) {
          return local.length > 0 ? local : listProjects();
        }
        await ensureLocalProjectsMigratedToCloud();
        const cloud = await listSupabaseProjects(auth.user.id);
        return mergeProjectMetaLists(cloud, local);
      },
      get: async (id: string): Promise<SavedProject | undefined> => {
        if (cloudMode && auth.user) {
          const cloud = await getSupabaseProject(auth.user.id, id);
          if (cloud) return cloud;
          return getProject(id);
        }
        return getProject(id);
      },
      save: async (project: SavedProject): Promise<void> => {
        if (cloudMode && auth.user) {
          await saveProject(project);
          await saveSupabaseProject(auth.user.id, project);
          return;
        }
        await saveProject(project);
      },
      remove: async (id: string): Promise<void> => {
        if (cloudMode && auth.user) {
          try {
            await deleteSupabaseProject(auth.user.id, id);
          } catch {
            // Still remove local copy below.
          }
        }
        await deleteProject(id);
      },
    }),
    [auth.user, cloudMode, ensureLocalProjectsMigratedToCloud, collectLocalProjects],
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
      setSaveDetail(null);
      useFloorPlanStore.setState({
        projectId: id,
        projectName: name,
        saveStatus: 'saved',
      });
    } catch (err) {
      const cloudSyncFailed = err instanceof CloudSyncError;
      if (cloudSyncFailed) {
        try {
          await saveProject(project);
          lastSavedFingerprint.current = planFingerprint(plan);
          const detail = err.message;
          setSaveDetail(detail);
          useFloorPlanStore.setState({
            projectId: id,
            projectName: name,
            saveStatus: 'saved',
          });
        } catch {
          setSaveDetail(err.message);
          useFloorPlanStore.setState({ saveStatus: 'error' });
        }
      } else {
        const message =
          err instanceof Error ? err.message : 'Could not save plan in this browser.';
        setSaveDetail(message);
        useFloorPlanStore.setState({ saveStatus: 'error' });
      }
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

      try {
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

      if (!project && cloudMode) {
        const localFallback = await collectLocalProjects();
        if (localFallback.length > 0) {
          project = localFallback[0];
          if (auth.user) {
            try {
              await saveSupabaseProject(auth.user.id, project);
            } catch {
              // Still open from local data even if cloud write fails.
            }
          }
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
        const localOnly = await collectLocalProjects();
        const meaningful = localOnly.find((p) => hasMeaningfulPlan(p.plan));
        if (meaningful) {
          useFloorPlanStore.getState().importPlan(meaningful.plan, { recordHistory: false });
          useFloorPlanStore.setState({
            projectId: meaningful.id,
            projectName: meaningful.name,
            storageReady: true,
            saveStatus: 'saved',
            undoStack: [],
            redoStack: [],
          });
          lastSavedFingerprint.current = planFingerprint(meaningful.plan);
          if (cloudMode && auth.user) {
            try {
              await saveSupabaseProject(auth.user.id, meaningful);
            } catch {
              useFloorPlanStore.setState({ saveStatus: 'error' });
            }
          }
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
      } catch {
        if (cancelled) return;
        const id = uuidv4();
        useFloorPlanStore.setState({
          projectId: id,
          projectName: 'Untitled plan',
          storageReady: true,
          saveStatus: 'error',
        });
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
    collectLocalProjects,
    persistCurrent,
  ]);

  useEffect(() => {
    if (!storageReady) return;

    const unsub = useFloorPlanStore.subscribe((state, prev) => {
      const fields: (keyof typeof state)[] = [
        'levels',
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
        'gridSize',
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
    try {
      return await backend.list();
    } catch (err) {
      if (!cloudMode || !auth.user) throw err;
      const local = (await collectLocalBrowserProjects()).map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
      }));
      if (local.length > 0) return local;
      throw err;
    }
  }, [backend, cloudMode, auth.user, collectLocalProjects]);

  const getProjectById = useCallback(
    async (id: string): Promise<SavedProject | undefined> => backend.get(id),
    [backend],
  );

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
    authError: auth.authError,
    user: auth.user,
    cloudMode,
    signInWithGoogle: auth.signInWithGoogle,
    signOut: auth.signOut,
    storageReady,
    projectId,
    projectName,
    saveStatus,
    saveDetail,
    saveNow,
    saveAs,
    renameProject,
    loadProject,
    createNewProject,
    removeProject,
    renameAnyProject,
    fetchProjectList,
    getProjectById,
    importLocalBrowserProjects,
  };
}
