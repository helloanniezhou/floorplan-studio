import { useRef } from 'react';
import { useFloorPlanStore } from '../store/floorPlanStore';

export function PlanUploadControls() {
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const setBackgroundVisible = useFloorPlanStore((s) => s.setBackgroundVisible);
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
    <div className="action-bar-group action-bar-plan">
      <button
        type="button"
        className="action-bar-btn"
        onClick={() => fileRef.current?.click()}
        title="Upload a floor plan image to trace over"
      >
        Upload plan
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      {backgroundImage && (
        <label className="action-bar-checkbox">
          <input
            type="checkbox"
            checked={backgroundVisible}
            onChange={(e) => setBackgroundVisible(e.target.checked)}
          />
          <span>Show image</span>
        </label>
      )}
    </div>
  );
}
