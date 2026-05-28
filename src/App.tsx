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
import { useSupabaseAuth } from './hooks/useSupabaseAuth';
import {
  clearPostLoginProjectsIntent,
  hasPostLoginProjectsIntent,
} from './contexts/SupabaseAuthContext';
import './App.css';

function App() {
  useToolShortcuts();
  useProjectPersistence();
  const auth = useSupabaseAuth();
  const [projectsView, setProjectsView] = useState(hasPostLoginProjectsIntent);
  const show3DPreview = useFloorPlanStore((s) => s.show3DPreview);

  useEffect(() => {
    const openProjects = () => {
      if (hasPostLoginProjectsIntent()) setProjectsView(true);
    };
    window.addEventListener('floorplan-studio:open-projects', openProjects);
    return () => window.removeEventListener('floorplan-studio:open-projects', openProjects);
  }, []);

  useEffect(() => {
    if (auth.loading) return;
    if (auth.user && hasPostLoginProjectsIntent()) {
      setProjectsView(true);
      clearPostLoginProjectsIntent();
    }
  }, [auth.loading, auth.user]);

  if (projectsView) {
    return (
      <div className="app app--projects-only">
        <ProjectsPage onProjectOpened={() => setProjectsView(false)} standalone />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-action-bar-wrap">
        <ActionBar onBackToProjects={() => setProjectsView(true)} />
      </header>
      <div className="app-panels">
        <Toolbar />
        <div className="main-column">
          <main className="workspace">
            {!show3DPreview && (
              <div className="workspace-overlay">
                <ScaleDialog />
              </div>
            )}
            {show3DPreview ? (
              <Viewport3D />
            ) : (
              <div className="editor-column">
                <FloorPlanCanvas />
              </div>
            )}
          </main>
        </div>
        <PropertyPanel />
      </div>
    </div>
  );
}

export default App;
