import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Undo2, Redo2, Type, Crop, Save, Minus, Plus } from 'lucide-react';
interface CanvasEditorProps {
  imageUrl: string;
  onSave: (imgData: string) => Promise<void>;
}
type Tool = 'pen' | 'eraser' | 'text' | 'crop';
export const CanvasEditor: React.FC<CanvasEditorProps> = ({ imageUrl, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [tool, setTool] = useState<Tool>('pen');
  const [brushSize] = useState(8);
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    if (imageUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imgRef.current = img;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      setIsDirty(false);
    };
    img.src = imageUrl;
  }, [imageUrl]);
  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);
  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPos.current = getPos(e);
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [getPos]);
  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
    }
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsDirty(true);
  }, [tool, brushColor, brushSize, getPos]);
  const endDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);
  const handleRevert = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0);
    setIsDirty(false);
  }, []);
  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      await onSave(dataUrl);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);
  const handleFitZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const fitScale = Math.min(
      container.clientWidth / canvas.width,
      container.clientHeight / canvas.height,
      1
    );
    setZoom(fitScale);
  }, []);
  return (
    <div className="canvas-editor flex flex-col flex-1 min-h-0 bg-white rounded-xl overflow-hidden border border-[var(--ln)]">
      
      {/* Canvas Area (Top) */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[var(--bg)]"
        style={{ display: 'grid', placeItems: zoom <= 1 ? 'center' : 'start' }}
      >
        <canvas
          ref={canvasRef}
          className={`transition-transform ${tool === 'pen' || tool === 'crop' ? 'cursor-crosshair' : 'cursor-text'}`}
          style={{
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            objectFit: 'contain',
            touchAction: 'none'
          }}
          onPointerDown={startDraw}
          onPointerMove={draw}
          onPointerUp={endDraw}
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
        />
      </div>
      {/* Ribbon Toolbar (Bottom) */}
      <div className="flex flex-col bg-[var(--paper)] border-t border-[var(--ln)] select-none mt-auto">
        <div className="flex text-sm px-2 pt-1 border-b border-[var(--ln)] bg-[var(--bg2)]">
          <div className="px-5 py-2 bg-[var(--paper)] text-[var(--ink)] rounded-t cursor-default border-t border-l border-r border-[var(--ln)] font-medium">
            Image Edit
          </div>
        </div>
        <div className="flex items-stretch bg-[var(--paper)] py-3 px-2 text-[var(--ink)]">
          
          {/* HISTORY */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={handleRevert} 
                disabled={!isDirty}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-[var(--bg2)] disabled:opacity-30 min-w-[64px] transition-colors"
              >
                <Undo2 size={24} className="text-[var(--blue)] mb-1" />
                <span className="text-xs text-[var(--ink2)] font-medium">Undo</span>
              </button>
              <button 
                disabled={true}
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-[var(--bg2)] disabled:opacity-30 min-w-[64px] transition-colors"
              >
                <Redo2 size={24} className="text-[var(--blue)] mb-1" />
                <span className="text-xs text-[var(--ink2)] font-medium">Redo</span>
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">History</span>
          </div>
          {/* VIEW */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2 items-center h-full pt-1">
              <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="flex items-center justify-center p-2 rounded hover:bg-[var(--bg2)] text-[var(--ink2)] transition-colors">
                <Minus size={20} />
              </button>
              <span className="text-xs text-[var(--ink)] w-10 text-center font-mono font-medium">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(z + 0.25, 4))} className="flex items-center justify-center p-2 rounded hover:bg-[var(--bg2)] text-[var(--ink2)] transition-colors">
                <Plus size={20} />
              </button>
              <button onClick={handleFitZoom} className="flex items-center justify-center p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--blue)] text-[11px] font-bold uppercase transition-colors ml-1">
                Fit
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">View</span>
          </div>
          {/* TOOLS */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2">
              <button 
                onClick={() => setTool('pen')}
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${tool === 'pen' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}
              >
                <Pencil size={24} className={tool === 'pen' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Draw</span>
              </button>
              <button 
                onClick={() => setTool('text')}
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${tool === 'text' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}>
                <Type size={24} className={tool === 'text' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Text</span>
              </button>
              <button 
                onClick={() => setTool('crop')}
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${tool === 'crop' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}>
                <Crop size={24} className={tool === 'crop' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Crop</span>
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">Tools</span>
          </div>
          {/* PROPERTIES */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex flex-col items-center justify-center flex-1 mb-2 px-3">
              <label className="flex flex-col items-center cursor-pointer hover:bg-[var(--bg2)] p-2 rounded transition-colors">
                <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-8 h-8 rounded border-2 border-[var(--ln)] p-0 cursor-pointer mb-1" />
                <span className="text-xs text-[var(--ink2)] font-medium">Color</span>
              </label>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">Properties</span>
          </div>
          <div className="flex-1"></div>
          {/* SAVE */}
          <div className="flex flex-col items-center justify-between pl-5 pr-6">
            <div className="flex items-center justify-center flex-1 mb-2">
              <button 
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="flex flex-col items-center justify-center px-8 py-3 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue2)] disabled:opacity-50 text-white shadow-md min-w-[100px] transition-all hover:-translate-y-0.5"
              >
                <Save size={24} className="mb-1.5" />
                <span className="text-sm font-bold tracking-wide">{isSaving ? 'Saving...' : 'Save Edits'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};