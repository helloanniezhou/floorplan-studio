import { useState } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';
import { SUN_TIME_OPTIONS } from '../lib/compass/orientation';
import { SettingsModal } from './SettingsModal';
import { UnitsSettingsPanel } from './settings/UnitsSettingsPanel';
import { LotSizeSettingsPanel, formatLotSizeSummary } from './settings/LotSizeSettingsPanel';
import { CompassSettings } from './CompassSettings';
import { PlanImageSettingsPanel, planImageSummary } from './settings/PlanImageSettingsPanel';

type SettingsSection = 'units' | 'lot' | 'planImage' | 'orientation' | null;

const MENU: { id: SettingsSection; label: string }[] = [
  { id: 'units', label: 'Units' },
  { id: 'lot', label: 'Lot size' },
  { id: 'planImage', label: 'Plan image' },
  { id: 'orientation', label: 'Orientation & sun' },
];

function orientationSummary(northAngleDeg: number, sunTime: string): string {
  const sun = SUN_TIME_OPTIONS.find((o) => o.id === sunTime)?.label.split(' ')[0] ?? sunTime;
  return `N ${Math.round(northAngleDeg)}° · ${sun}`;
}

export function SidebarSettings() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(null);

  const unit = useFloorPlanStore((s) => s.unit);
  const lotSize = useFloorPlanStore((s) => s.lotSize);
  const northAngleDeg = useFloorPlanStore((s) => s.northAngleDeg);
  const sunTime = useFloorPlanStore((s) => s.sunTime);
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);

  const openSection = (id: SettingsSection) => {
    setActiveSection(id);
    setMenuOpen(true);
  };

  const closeModal = () => setActiveSection(null);

  const summaryFor = (id: SettingsSection): string => {
    switch (id) {
      case 'units':
        return unit === 'ft' ? 'Feet' : 'Meters';
      case 'lot':
        return formatLotSizeSummary(lotSize, unit);
      case 'planImage':
        return planImageSummary(backgroundImage, backgroundVisible);
      case 'orientation':
        return orientationSummary(northAngleDeg, sunTime);
      default:
        return '';
    }
  };

  const modalTitle = MENU.find((m) => m.id === activeSection)?.label ?? 'Settings';

  return (
    <div className="toolbar-settings">
      <button
        type="button"
        className="toolbar-settings-toggle"
        onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen}
      >
        <span>Settings</span>
        <span className="toolbar-settings-chevron">{menuOpen ? '▾' : '▸'}</span>
      </button>

      {menuOpen && (
        <nav className="settings-menu" aria-label="Settings categories">
          {MENU.map((item) => (
            <button
              key={item.id}
              type="button"
              className="settings-menu-item"
              onClick={() => openSection(item.id)}
            >
              <span className="settings-menu-label">{item.label}</span>
              <span className="settings-menu-summary">{summaryFor(item.id)}</span>
            </button>
          ))}
        </nav>
      )}

      <SettingsModal open={activeSection !== null} title={modalTitle} onClose={closeModal}>
        {activeSection === 'units' && <UnitsSettingsPanel />}
        {activeSection === 'lot' && <LotSizeSettingsPanel />}
        {activeSection === 'planImage' && <PlanImageSettingsPanel />}
        {activeSection === 'orientation' && <CompassSettings />}
      </SettingsModal>
    </div>
  );
}
