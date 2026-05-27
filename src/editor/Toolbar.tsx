import { useRef, useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FurnitureKind, LandscapeKind } from '../types/floorPlan';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';

type ToolbarTab = 'plan' | 'furniture' | 'landscape';

const PLAN_TOOLS = [
  { id: 'select' as const, label: 'Select', icon: '↖' },
  { id: 'wall' as const, label: 'Wall', icon: '▭' },
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

const TABS: { id: ToolbarTab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'landscape', label: 'Landscape' },
];

export function Toolbar() {
  const tool = useFloorPlanStore((s) => s.tool);
  const activePlaceable = useFloorPlanStore((s) => s.activePlaceable);
  const setTool = useFloorPlanStore((s) => s.setTool);
  const startPlace = useFloorPlanStore((s) => s.startPlace);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<ToolbarTab>('plan');

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
        setTab('plan');
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

      <div className="toolbar-tabs" role="tablist" aria-label="Tool categories">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`toolbar-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <>
          <div className="toolbar-section">
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
          </div>

          <div className="toolbar-section">
            <p className="toolbar-label">Drawing tools</p>
            {PLAN_TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`toolbar-btn ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
              >
                <span className="tool-icon">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'furniture' && (
        <div className="toolbar-section">
          <p className="toolbar-label">Indoor furniture</p>
          <p className="toolbar-hint">Click an item, then click the canvas to place it.</p>
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
        </div>
      )}

      {tab === 'landscape' && (
        <div className="toolbar-section">
          <p className="toolbar-label">Outdoor landscape</p>
          <p className="toolbar-hint">Click an item, then click the canvas to place it.</p>
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
        </div>
      )}
    </aside>
  );
}
