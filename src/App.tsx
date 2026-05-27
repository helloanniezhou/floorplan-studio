import { Toolbar } from './editor/Toolbar';
import { PropertyPanel } from './editor/PropertyPanel';
import { TracePanel } from './editor/TracePanel';
import { ScaleDialog } from './editor/ScaleDialog';
import { FloorPlanCanvas } from './editor/FloorPlanCanvas';
import { ExportImportPanel } from './editor/ExportImportPanel';
import { Viewport3D } from './viewer/Viewport3D';
import './App.css';

function App() {
  return (
    <div className="app">
      <Toolbar />
      <main className="workspace">
        <div className="editor-column">
          <ScaleDialog />
          <FloorPlanCanvas />
          <TracePanel />
          <ExportImportPanel />
        </div>
        <Viewport3D />
      </main>
      <PropertyPanel />
    </div>
  );
}

export default App;
