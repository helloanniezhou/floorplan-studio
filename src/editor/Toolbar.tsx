import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FurnitureKind, LandscapeKind } from '../types/floorPlan';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';
import { LIGHT_KIND_LABELS, LIGHT_TOOL_ITEMS } from '../lib/lights/defaults';
import { SidebarSettings } from './SidebarSettings';
import { CollapsibleToolbarSection } from './CollapsibleToolbarSection';
import { PlanLayoutSwitcher } from './PlanLayoutSwitcher';
import { TOOL_SHORTCUT_LABELS } from './useToolShortcuts';

const FLOOR_DRAWING_TOOLS = [
  { id: 'select' as const, label: 'Select', icon: '↖' },
  { id: 'wall' as const, label: 'Wall', icon: '▭' },
  { id: 'rect' as const, label: 'Rectangle', icon: '⬜' },
  { id: 'door' as const, label: 'Door', icon: '🚪' },
  { id: 'window' as const, label: 'Window', icon: '▢' },
  { id: 'scale' as const, label: 'Scale', icon: '📏' },
  { id: 'pan' as const, label: 'Pan', icon: '✥' },
] as const;

const ROOF_DRAWING_TOOLS = [
  { id: 'select' as const, label: 'Select', icon: '↖' },
  { id: 'wall' as const, label: 'Roof edge', icon: '▭' },
  { id: 'rect' as const, label: 'Rectangle', icon: '⬜' },
  { id: 'window' as const, label: 'Skylight', icon: '▢' },
  { id: 'scale' as const, label: 'Scale', icon: '📏' },
  { id: 'pan' as const, label: 'Pan', icon: '✥' },
] as const;

const FURNITURE_ITEMS: { kind: FurnitureKind; icon: string }[] = [
  { kind: 'kitchenCounter', icon: '▬' },
  { kind: 'kitchenCabinet', icon: '▴' },
  { kind: 'sink', icon: '◯' },
  { kind: 'toilet', icon: '⌂' },
  { kind: 'sectionalSofa', icon: '⊔' },
  { kind: 'table', icon: '▣' },
  { kind: 'chair', icon: '◫' },
  { kind: 'gasRange', icon: '▦' },
  { kind: 'fridge', icon: '▥' },
  { kind: 'bed', icon: '▭' },
  { kind: 'nightstand', icon: '▫' },
];

const LANDSCAPE_ITEMS: { kind: LandscapeKind; icon: string }[] = [
  { kind: 'tree', icon: '🌳' },
  { kind: 'shrub', icon: '🌿' },
  { kind: 'flowerBed', icon: '🌸' },
  { kind: 'patio', icon: '▧' },
  { kind: 'path', icon: '═' },
  { kind: 'lawn', icon: '▤' },
  { kind: 'pool', icon: '◧' },
];

export function Toolbar() {
  const tool = useFloorPlanStore((s) => s.tool);
  const activeLevel = useFloorPlanStore((s) =>
    s.levels.find((l) => l.id === s.activeLevelId),
  );
  const isRoof = activeLevel?.kind === 'roof';
  const activePlaceable = useFloorPlanStore((s) => s.activePlaceable);
  const activeLightKind = useFloorPlanStore((s) => s.activeLightKind);
  const setTool = useFloorPlanStore((s) => s.setTool);
  const startPlace = useFloorPlanStore((s) => s.startPlace);
  const startLightPlace = useFloorPlanStore((s) => s.startLightPlace);

  const drawingTools = isRoof ? ROOF_DRAWING_TOOLS : FLOOR_DRAWING_TOOLS;

  const placeActive =
    tool === 'place' &&
    activePlaceable.category === 'furniture'
      ? activePlaceable.kind
      : tool === 'place' &&
          activePlaceable.category === 'landscape'
        ? activePlaceable.kind
        : null;

  const lightActive = tool === 'light' ? activeLightKind : null;

  return (
    <aside className="toolbar">
      <div className="toolbar-scroll">
        <PlanLayoutSwitcher />

        <CollapsibleToolbarSection
          id="tools"
          title={isRoof ? 'Roof drawing' : 'Floor plan tools'}
          defaultOpen
        >
          {drawingTools.map((t) => {
            const shortcut = TOOL_SHORTCUT_LABELS[t.id];
            return (
              <button
                key={t.id}
                type="button"
                className={`toolbar-btn ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
              >
                <span className="tool-icon">{t.icon}</span>
                <span className="tool-label">{t.label}</span>
                {shortcut && <kbd className="tool-shortcut">{shortcut}</kbd>}
              </button>
            );
          })}
        </CollapsibleToolbarSection>

        <CollapsibleToolbarSection
          id="lighting"
          title="Lighting"
          defaultOpen={!isRoof}
          highlight
        >
          {LIGHT_TOOL_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`toolbar-btn ${lightActive === item.kind ? 'active' : ''}`}
              onClick={() => startLightPlace(item.kind)}
            >
              <span className="tool-icon">{item.icon}</span>
              {LIGHT_KIND_LABELS[item.kind]}
            </button>
          ))}
        </CollapsibleToolbarSection>

        {!isRoof && (
        <CollapsibleToolbarSection
          id="furniture"
          title="Indoor furniture"
          defaultOpen={false}
          highlight
        >
          {FURNITURE_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`toolbar-btn ${placeActive === item.kind ? 'active' : ''}`}
              onClick={() => startPlace({ category: 'furniture', kind: item.kind })}
            >
              <span className="tool-icon">{item.icon}</span>
              {FURNITURE_LABELS[item.kind]}
            </button>
          ))}
        </CollapsibleToolbarSection>
        )}

        {!isRoof && (
        <CollapsibleToolbarSection
          id="landscape"
          title="Outdoor landscape"
          defaultOpen={false}
          highlight
        >
          {LANDSCAPE_ITEMS.map((item) => (
            <button
              key={item.kind}
              type="button"
              className={`toolbar-btn ${placeActive === item.kind ? 'active' : ''}`}
              onClick={() => startPlace({ category: 'landscape', kind: item.kind })}
            >
              <span className="tool-icon">{item.icon}</span>
              {LANDSCAPE_LABELS[item.kind]}
            </button>
          ))}
        </CollapsibleToolbarSection>
        )}
      </div>

      <SidebarSettings />
    </aside>
  );
}
