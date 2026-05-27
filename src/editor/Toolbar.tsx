import { useRef } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import type { FurnitureKind, LandscapeKind } from '../types/floorPlan';
import {
  FURNITURE_LABELS,
  LANDSCAPE_LABELS,
} from '../lib/placeables/defaults';

const DRAWING_TOOLS = [
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

export function Toolbar() {
  const tool = useFloorPlanStore((s) => s.tool);
  const activePlaceable = useFloorPlanStore((s) => s.activePlaceable);
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const showBackgroundImage = useFloorPlanStore((s) => s.showBackgroundImage);
  const setTool = useFloorPlanStore((s) => s.setTool);
  const startPlace = useFloorPlanStore((s) => s.startPlace);
  const setShowBackgroundImage = useFloorPlanStore((s) => s.setShowBackgroundImage);
  const resetPlan = useFloorPlanStore((s) => s.resetPlan);
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
        {backgroundImage && (
          <label className="field row toolbar-toggle">
            <input
              type="checkbox"
              checked={showBackgroundImage}
              onChange={(e) => setShowBackgroundImage(e.target.checked)}
            />
            <span>Show uploaded image</span>
          </label>
        )}
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => {
            if (confirm('Clear entire plan?')) resetPlan();
          }}
        >
          New plan
        </button>
      </div>

      <div className="toolbar-section">
        <p className="toolbar-label">Tools</p>
        {DRAWING_TOOLS.map((t) => (
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

      <div className="toolbar-section toolbar-section--highlight">
        <p className="toolbar-label">Indoor furniture</p>
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

      <div className="toolbar-section toolbar-section--highlight">
        <p className="toolbar-label">Outdoor landscape</p>
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
    </aside>
  );
}
