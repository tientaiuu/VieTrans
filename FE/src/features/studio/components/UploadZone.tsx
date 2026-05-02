import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStudioStore } from '../../../stores/useStudioStore';

type UploadZoneProps = {
  isCropMode: boolean;
  onCropModeChange: (value: boolean) => void;
};

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_CROP_SIZE = 24;

export const UploadZone: React.FC<UploadZoneProps> = ({ isCropMode, onCropModeChange }) => {
  const { setFile, previewUrl, reset, file } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropStageRef = useRef<HTMLDivElement>(null);
  const dragCleanupRef = useRef<(() => void) | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasDraggedCrop, setHasDraggedCrop] = useState(false);

  const stopDragging = () => {
    if (dragCleanupRef.current) {
      dragCleanupRef.current();
      dragCleanupRef.current = null;
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;

    onCropModeChange(false);
    setCropRect(null);
    setHasDraggedCrop(false);
    setFile(nextFile);
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
    const nextFile = event.dataTransfer.files?.[0];
    if (!nextFile) return;

    onCropModeChange(false);
    setCropRect(null);
    setHasDraggedCrop(false);
    setFile(nextFile);
  };

  useEffect(() => {
    if (!previewUrl) {
      setCropRect(null);
      setHasDraggedCrop(false);
      onCropModeChange(false);
      setImageLoaded(false);
    }
  }, [onCropModeChange, previewUrl]);

  useEffect(() => {
    if (!isCropMode) {
      stopDragging();
    }
  }, [isCropMode]);

  useEffect(() => () => stopDragging(), []);

  const canApplyCrop = useMemo(() => {
    return imageLoaded && !!cropRect && cropRect.width >= MIN_CROP_SIZE && cropRect.height >= MIN_CROP_SIZE;
  }, [cropRect, imageLoaded]);

  const getStagePoint = (clientX: number, clientY: number) => {
    const bounds = cropStageRef.current?.getBoundingClientRect();
    if (!bounds) {
      return { x: 0, y: 0 };
    }

    return {
      x: Math.min(Math.max(clientX - bounds.left, 0), bounds.width),
      y: Math.min(Math.max(clientY - bounds.top, 0), bounds.height),
    };
  };

  const handleCropStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isCropMode) return;

    event.preventDefault();
    event.stopPropagation();
    stopDragging();

    const start = getStagePoint(event.clientX, event.clientY);
    setHasDraggedCrop(false);
    setCropRect({ x: start.x, y: start.y, width: 0, height: 0 });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const point = getStagePoint(moveEvent.clientX, moveEvent.clientY);
      const width = Math.abs(point.x - start.x);
      const height = Math.abs(point.y - start.y);

      if (width > 0 || height > 0) {
        setHasDraggedCrop(true);
      }

      setCropRect({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width,
        height,
      });
    };

    const handleMouseUp = () => {
      stopDragging();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    dragCleanupRef.current = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  };

  const handleCancelCrop = () => {
    stopDragging();
    setCropRect(null);
    setHasDraggedCrop(false);
    onCropModeChange(false);
  };

  const handleApplyCrop = async () => {
    if (!previewUrl || !imageRef.current || !cropStageRef.current || !cropRect || !canApplyCrop || !file) return;

    const image = imageRef.current;
    
    // Ensure image has loaded and has valid dimensions
    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      console.warn('Image dimensions are not available');
      return;
    }

    const stageBounds = cropStageRef.current.getBoundingClientRect();
    if (!stageBounds.width || !stageBounds.height) return;

    const scaleX = image.naturalWidth / stageBounds.width;
    const scaleY = image.naturalHeight / stageBounds.height;

    const sourceX = Math.round(cropRect.x * scaleX);
    const sourceY = Math.round(cropRect.y * scaleY);
    const sourceWidth = Math.round(cropRect.width * scaleX);
    const sourceHeight = Math.round(cropRect.height * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type || 'image/png');
    });
    if (!blob) return;

    const hasExtension = /\.[^.]+$/.test(file.name);
    const baseName = hasExtension ? file.name.replace(/\.[^.]+$/, '') : file.name;
    const extension = hasExtension ? file.name.slice(file.name.lastIndexOf('.')) : '.png';
    const croppedFile = new File([blob], `${baseName}-cropped${extension}`, { type: blob.type || file.type });

    setFile(croppedFile);
    setCropRect(null);
    setHasDraggedCrop(false);
    onCropModeChange(false);
  };

  if (previewUrl) {
    return (
      <div className={`img-preview ${isCropMode ? 'is-cropping' : ''}`} style={{ display: 'block' }}>
        <div className="img-preview-stage-wrap">
          <div ref={cropStageRef} className="img-preview-stage">
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Preview"
              className="img-preview-media"
              onLoad={() => setImageLoaded(true)}
            />
            {isCropMode && <div className="img-preview-hit" onMouseDown={handleCropStart} />}
            {isCropMode && cropRect && (
              <div
                className="img-preview-crop-selection"
                style={{
                  left: `${cropRect.x}px`,
                  top: `${cropRect.y}px`,
                  width: `${cropRect.width}px`,
                  height: `${cropRect.height}px`,
                }}
              />
            )}
          </div>
        </div>

        {!isCropMode && (
          <div className="img-preview-overlay">
            <div className="ipo-name">Preview Ready</div>
            <div className="ipo-size">Click Edit to crop or Process to continue</div>
          </div>
        )}

        {isCropMode && (
          <div className="img-preview-crop-toolbar">
            <div className="img-preview-crop-copy">
              <div className="img-preview-crop-title">Drag to crop</div>
              <div className="img-preview-crop-note">Click and drag on the image to select the crop area.</div>
            </div>
            <div className="img-preview-crop-actions">
              <button type="button" className="img-preview-crop-btn is-ghost" onClick={handleCancelCrop}>
                Cancel
              </button>
              <button
                type="button"
                className="img-preview-crop-btn is-primary"
                onClick={handleApplyCrop}
                disabled={!hasDraggedCrop || !canApplyCrop}
              >
                Apply Crop
              </button>
            </div>
          </div>
        )}

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
