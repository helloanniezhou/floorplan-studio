import { useEffect, useState } from 'react';
import { Toolbar } from './editor/Toolbar';
import { ActionBar } from './editor/ActionBar';
import { PropertyPanel } from './editor/PropertyPanel';
import { ProjectsPage } from './editor/ProjectsPage';
import { ScaleDialog } from './editor/ScaleDialog';
import { FloorPlanCanvas } from './editor/FloorPlanCanvas';
import { Viewport3D } from './viewer/Viewport3D';
import { useFloorPlanStore } from './store/floorPlanStore';
import { useToolShortcuts } from './editor/useToolShortcuts';
import { useProjectPersistence } from './hooks/useProjectPersistence';
import { supabase } from './utils/supabase';
import './App.css';

function App() {
  useToolShortcuts();
  useProjectPersistence();
  const [projectsView, setProjectsView] = useState(false);
  const show3DPreview = useFloorPlanStore((s) => s.show3DPreview);

  useEffect(() => {
    if (!supabase) return;
    // Lightweight connectivity check for local Supabase setup.
    void supabase.from('projects').select('id', { count: 'exact', head: true });
  }, []);

  if (projectsView) {
    return (
      <div className="app app--projects-only">
        <ProjectsPage onBack={() => setProjectsView(false)} standalone />
      </div>
    );
  }

  return (
    <div className="app">
      <Toolbar />
      <div className="main-column">
        <main className="workspace">
          <div className="workspace-overlay">
            <ActionBar
              projectsView={projectsView}
              onToggleProjectsView={() => setProjectsView((prev) => !prev)}
            />
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
