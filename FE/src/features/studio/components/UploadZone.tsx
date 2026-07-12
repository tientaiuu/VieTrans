import React, { useRef, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { useStudioStore } from '../../../stores/useStudioStore';
import { toast } from '../../../stores/useToastStore';
import { validateImageFile } from '../../../api';

export const UploadZone: React.FC = () => {
  const { addFiles } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const accepted = incoming.filter((file) => validateImageFile(file) === null);
    const rejectedCount = incoming.length - accepted.length;

    if (rejectedCount > 0) {
      toast.error(`${rejectedCount} file(s) skipped. Use JPG, PNG, or WebP under 10MB.`);
    }
    if (accepted.length > 0) {
      addFiles(accepted);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset so same files can be re-added
    e.target.value = '';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        height: '340px',
        border: `1.5px dashed ${isDragging ? 'var(--blue)' : 'var(--ln)'}`,
        borderRadius: '12px',
        background: isDragging ? 'var(--blueG)' : 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        padding: '16px',
        userSelect: 'none',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <ImageIcon
        size={26}
        style={{ color: isDragging ? 'var(--blue)' : 'var(--ink3)', transition: 'color 0.15s' }}
      />
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: isDragging ? 'var(--blue)' : 'var(--ink2)',
          transition: 'color 0.15s',
        }}>
          Drop images here
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--ink4)', marginTop: '3px' }}>
          or <span style={{ color: 'var(--blue)', textDecoration: 'underline' }}>browse files</span>
        </div>
      </div>
    </div>
  );
};
