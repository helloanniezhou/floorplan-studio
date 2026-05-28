import { Toolbar } from './editor/Toolbar';
import { ActionBar } from './editor/ActionBar';
import { PropertyPanel } from './editor/PropertyPanel';
import { ScaleDialog } from './editor/ScaleDialog';
import { FloorPlanCanvas } from './editor/FloorPlanCanvas';
import { Viewport3D } from './viewer/Viewport3D';
import { useFloorPlanStore } from './store/floorPlanStore';
import { useToolShortcuts } from './editor/useToolShortcuts';
import { useProjectPersistence } from './hooks/useProjectPersistence';
import './App.css';

function App() {
  useToolShortcuts();
  useProjectPersistence();
  const show3DPreview = useFloorPlanStore((s) => s.show3DPreview);

  return (
    <div className="app">
      <Toolbar />
      <div className="main-column">
        <main className="workspace">
          <div className="workspace-overlay">
            <ActionBar />
          </div>
          {show3DPreview ? (
            <Viewport3D />
          ) : (
            <div className="editor-column">
              <ScaleDialog />
              <FloorPlanCanvas />
            </div>
          )}
        </main>
      </div>
      <PropertyPanel />
    </div>
  );
}

export default App;
