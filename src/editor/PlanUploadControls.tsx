import { useRef, useState } from 'react';
import { compressPlanImage } from '../lib/images/compressPlanImage';
import { useFloorPlanStore } from '../store/floorPlanStore';

export function PlanUploadControls() {
  const backgroundImage = useFloorPlanStore((s) => s.backgroundImage);
  const backgroundVisible = useFloorPlanStore((s) => s.backgroundVisible);
  const setBackgroundVisible = useFloorPlanStore((s) => s.setBackgroundVisible);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploading(true);
    void compressPlanImage(file)
      .then(({ dataUrl, width, height }) => {
        useFloorPlanStore.getState().setBackgroundImage(dataUrl, width, height);
        useFloorPlanStore.getState().setTool('scale');
      })
      .catch(() => {
        window.alert('Could not process that image. Try a smaller JPG or PNG.');
      })
      .finally(() => setUploading(false));
  };

  return (
    <div className="action-bar-group action-bar-plan">
      <button
        type="button"
        className="action-bar-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload a floor plan image to trace over"
      >
        {uploading ? 'Processing…' : 'Upload plan'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        disabled={uploading}
        onChange={handleUpload}
      />
      {backgroundImage && (
        <label className="action-bar-checkbox">
          <input
            type="checkbox"
            checked={backgroundVisible}
            onChange={(ev) => setBackgroundVisible(ev.target.checked)}
          />
          <span>Show image</span>
        </label>
      )}
    </div>
  );
}
