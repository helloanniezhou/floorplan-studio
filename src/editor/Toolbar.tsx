import { useRef } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';

const TOOLS = [
  { id: 'select' as const, label: 'Select', icon: '↖' },
  { id: 'wall' as const, label: 'Wall', icon: '▭' },
  { id: 'door' as const, label: 'Door', icon: '🚪' },
  { id: 'window' as const, label: 'Window', icon: '▢' },
  { id: 'scale' as const, label: 'Scale', icon: '📏' },
  { id: 'pan' as const, label: 'Pan', icon: '✥' },
];

export function Toolbar() {
  const tool = useFloorPlanStore((s) => s.tool);
  const setTool = useFloorPlanStore((s) => s.setTool);
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

  return (
    <aside className="toolbar">
      <h1 className="toolbar-title">Floor Plan Studio</h1>

      <div className="toolbar-section">
        <button type="button" className="toolbar-btn primary" onClick={() => fileRef.current?.click()}>
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
        <p className="toolbar-label">Tools</p>
        {TOOLS.map((t) => (
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
    </aside>
  );
}
