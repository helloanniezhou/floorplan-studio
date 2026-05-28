import { useRef, useState } from 'react';
import { compressPlanImage } from '../lib/images/compressPlanImage';
import { useFloorPlanStore } from '../store/floorPlanStore';

type Props = {
  label?: string;
  className?: string;
};

export function PlanImageUploadButton({
  label = 'Upload plan',
  className = 'toolbar-btn',
}: Props) {
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
    <>
      <button
        type="button"
        className={className}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Upload a floor plan image to trace over"
      >
        {uploading ? 'Processing…' : label}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        disabled={uploading}
        onChange={handleUpload}
      />
    </>
  );
}
