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
import { supabase } from './utils/supabase';
import './App.css';

function App() {
  useToolShortcuts();
  useProjectPersistence();
  const auth = useSupabaseAuth();
  const [projectsView, setProjectsView] = useState(false);
  const show3DPreview = useFloorPlanStore((s) => s.show3DPreview);

  useEffect(() => {
    const openProjects = () => setProjectsView(true);
    window.addEventListener('floorplan-studio:open-projects', openProjects);
    return () => window.removeEventListener('floorplan-studio:open-projects', openProjects);
  }, []);

  useEffect(() => {
    if (!auth.loading && auth.user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('view') === 'projects') {
        setProjectsView(true);
        params.delete('view');
        const next = params.toString();
        const path = window.location.pathname + (next ? `?${next}` : '');
        window.history.replaceState({}, '', path);
      }
    }
  }, [auth.loading, auth.user]);

  useEffect(() => {
    if (!supabase) return;
    // Lightweight connectivity check for local Supabase setup.
    void supabase.from('projects').select('id', { count: 'exact', head: true });
  }, []);

  if (projectsView) {
    return (
      <div className="app app--projects-only">
        <header className="app-action-bar-wrap">
          <ActionBar
            projectsView={projectsView}
            onToggleProjectsView={() => setProjectsView(false)}
          />
        </header>
        <ProjectsPage onProjectOpened={() => setProjectsView(false)} standalone />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-action-bar-wrap">
        <ActionBar
          projectsView={projectsView}
          onToggleProjectsView={() => setProjectsView((prev) => !prev)}
        />
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
