import { useEffect } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { getLayoutGeometry } from '../lib/plan/layout';
import type { Tool } from '../types/floorPlan';

const SHORTCUT_TO_TOOL: Record<string, Tool> = {
  v: 'select',
  w: 'wall',
  r: 'rect',
  k: 'scale',
  l: 'light',
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

/** Global shortcuts: V/W/R/K tools, Backspace/Delete selection. Pan uses Space (FloorPlanCanvas). */
export function useToolShortcuts(): void {
  const setTool = useFloorPlanStore((s) => s.setTool);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const { selection, deleteSelection } = useFloorPlanStore.getState();
        if (!selection) return;
        e.preventDefault();
        deleteSelection();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        const state = useFloorPlanStore.getState();
        const geo = getLayoutGeometry(state, state.activeLevelId);
        if (state.tool !== 'select' || geo.walls.length === 0) return;
        e.preventDefault();
        state.selectAllWalls();
        return;
      }

      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        const { selection, copySelection, pasteSelection, cutSelection } =
          useFloorPlanStore.getState();

        if (key === 'c' && selection) {
          e.preventDefault();
          copySelection();
          return;
        }
        if (key === 'v') {
          e.preventDefault();
          pasteSelection();
          return;
        }
        if (key === 'x' && selection) {
          e.preventDefault();
          cutSelection();
          return;
        }
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.repeat) return;

      const tool = SHORTCUT_TO_TOOL[e.key.toLowerCase()];
      if (!tool) return;

      e.preventDefault();
      setTool(tool);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setTool]);
}

export const TOOL_SHORTCUT_LABELS: Partial<Record<Tool, string>> = {
  select: 'V',
  wall: 'W',
  rect: 'R',
  scale: 'K',
  light: 'L',
  pan: 'Space',
};
