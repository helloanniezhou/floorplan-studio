import { useRef } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';

export function ExportImportPanel() {
  const exportPlan = useFloorPlanStore((s) => s.exportPlan);
  const importPlan = useFloorPlanStore((s) => s.importPlan);
  const resetPlan = useFloorPlanStore((s) => s.resetPlan);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(exportPlan(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floorplan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const plan = JSON.parse(reader.result as string);
        importPlan(plan);
      } catch {
        alert('Invalid floor plan file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="export-panel">
      <button type="button" className="toolbar-btn" onClick={handleExport}>
        Export JSON
      </button>
      <button type="button" className="toolbar-btn" onClick={() => fileRef.current?.click()}>
        Import JSON
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
      <button type="button" className="toolbar-btn danger" onClick={() => {
        if (confirm('Clear entire plan?')) resetPlan();
      }}>
        New plan
      </button>
    </div>
  );
}
