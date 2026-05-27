import { useRef } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FurnitureKind, LandscapeKind } from '../types/floorPlan';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';
import { SidebarSettings } from './SidebarSettings';
import { CollapsibleToolbarSection } from './CollapsibleToolbarSection';
import { TOOL_SHORTCUT_LABELS } from './useToolShortcuts';

const DRAWING_TOOLS = [
  { id: 'select' as const, label: 'Select', icon: '↖' },
  { id: 'wall' as const, label: 'Wall', icon: '▭' },
  { id: 'rect' as const, label: 'Rectangle', icon: '⬜' },
  { id: 'door' as const, label: 'Door', icon: '🚪' },
  { id: 'window' as const, label: 'Window', icon: '▢' },
  { id: 'scale' as const, label: 'Scale', icon: '📏' },
  { id: 'pan' as const, label: 'Pan', icon: '✥' },
];

const FURNITURE_ITEMS: { kind: FurnitureKind; icon: string }[] = [
  { kind: 'kitchenCounter', icon: '▬' },
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
  const activePlaceable = useFloorPlanStore((s) => s.activePlaceable);
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const setBackgroundVisible = useFloorPlanStore((s) => s.setBackgroundVisible);
  const setTool = useFloorPlanStore((s) => s.setTool);
  const startPlace = useFloorPlanStore((s) => s.startPlace);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        useFloorPlanStore.getState().setBackgroundImage(dataUrl, img.width, img.height);
        useFloorPlanStore.getState().setTool('scale');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const placeActive =
    tool === 'place' &&
    activePlaceable.category === 'furniture'
      ? activePlaceable.kind
      : tool === 'place' &&
          activePlaceable.category === 'landscape'
        ? activePlaceable.kind
        : null;

  return (
    <aside className="toolbar">
      <h1 className="toolbar-title">Floor Plan Studio</h1>

      <div className="toolbar-scroll">
        <CollapsibleToolbarSection id="project" title="Project" defaultOpen>
          <button
            type="button"
            className="toolbar-btn primary"
            onClick={() => fileRef.current?.click()}
          >
            Upload plan
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleUpload}
          />
          {backgroundImage && (
            <label className="field row toolbar-toggle">
              <input
                type="checkbox"
                checked={backgroundVisible}
                onChange={(e) => setBackgroundVisible(e.target.checked)}
              />
              <span>Show uploaded image</span>
            </label>
          )}
        </CollapsibleToolbarSection>

        <CollapsibleToolbarSection id="tools" title="Tools" defaultOpen>
          {DRAWING_TOOLS.map((t) => {
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
      </div>

      <SidebarSettings />
    </aside>
  );
}
