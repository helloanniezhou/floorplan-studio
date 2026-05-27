import { Toolbar } from './editor/Toolbar';
import { PropertyPanel } from './editor/PropertyPanel';
import { ScaleDialog } from './editor/ScaleDialog';
import { FloorPlanCanvas } from './editor/FloorPlanCanvas';
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
        </div>
        <Viewport3D />
      </main>
      <PropertyPanel />
    </div>
  );
}

export default App;
