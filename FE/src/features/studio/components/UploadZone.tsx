import React, { useRef } from 'react';
import { X } from 'lucide-react';
import { useStudioStore } from '../../../stores/useStudioStore';

export const UploadZone: React.FC = () => {
  const { setFile, previewUrl, reset } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setFile(file);
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.add('drag');
  };

  const onDragLeave = (event: React.DragEvent) => {
    event.currentTarget.classList.remove('drag');
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.currentTarget.classList.remove('drag');
    const file = event.dataTransfer.files?.[0];
    if (file) setFile(file);
  };

  if (previewUrl) {
    return (
      <div className="img-preview" style={{ display: 'block' }}>
        <img src={previewUrl} alt="Preview" />
        <div className="img-preview-overlay">
          <div className="ipo-name">Preview Ready</div>
          <div className="ipo-size">Click Process to Begin</div>
        </div>
        <button onClick={reset} className="studio-preview-close" type="button" aria-label="Remove image">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="upload-zone"
      onClick={() => fileInputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div className="uz-title">Upload Image</div>
      <div className="uz-sub">Drag and drop here, or <span className="uz-hl">browse</span></div>
      <div className="uz-fmts">
        <span className="uz-fmt">JPG</span><span className="uz-fmt">PNG</span><span className="uz-fmt">WebP</span>
      </div>
    </div>
  );
};
