import React, { useRef } from 'react';
import { useStudioStore } from '../../../stores/useStudioStore';

export const UploadZone: React.FC = () => {
  const { setFile, previewUrl, reset } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag');
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag');
    const file = e.dataTransfer.files?.[0];
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
        <button onClick={reset} className="spl-rm" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none' }}>✕</button>
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
