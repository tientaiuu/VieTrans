import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Type, Save, Undo, Redo, ZoomIn, ZoomOut, Crop } from 'lucide-react';

interface CanvasEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ imageUrl, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<'draw' | 'text' | 'crop'>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ff0000');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevZoomRef = useRef(zoom);
  
  const [cropStart, setCropStart] = useState<{x: number, y: number} | null>(null);
  const [cropCurrent, setCropCurrent] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl + '?t=' + new Date().getTime();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryStep(0);
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const zoomRatio = zoom / prevZoomRef.current;
    
    if (zoomRatio !== 1) {
      const centerX = container.scrollLeft + container.clientWidth / 2;
      const centerY = container.scrollTop + container.clientHeight / 2;
      
      const newScrollLeft = centerX * zoomRatio - container.clientWidth / 2;
      const newScrollTop = centerY * zoomRatio - container.clientHeight / 2;
      
      setTimeout(() => {
        container.scrollLeft = newScrollLeft;
        container.scrollTop = newScrollTop;
      }, 0);
    }
    prevZoomRef.current = zoom;
  }, [zoom]);

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(data);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const canvasRatio = canvas.width / canvas.height;
    const rectRatio = rect.width / rect.height;
    
    let renderedWidth = rect.width;
    let renderedHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (canvasRatio > rectRatio) {
      renderedHeight = rect.width / canvasRatio;
      offsetY = (rect.height - renderedHeight) / 2;
    } else {
      renderedWidth = rect.height * canvasRatio;
      offsetX = (rect.width - renderedWidth) / 2;
    }

    const scaleX = canvas.width / renderedWidth;
    const scaleY = canvas.height / renderedHeight;
    
    return {
      x: (e.clientX - rect.left - offsetX) * scaleX,
      y: (e.clientY - rect.top - offsetY) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getCoordinates(e);

    if (mode === 'draw' && ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
    } else if (mode === 'crop') {
      setCropStart({ x, y });
      setCropCurrent({ x, y });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    const { x, y } = getCoordinates(e);

    if (mode === 'draw' && ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (mode === 'crop' && cropStart) {
      setCropCurrent({ x, y });
      restoreState(historyStep);
      if (ctx) {
        ctx.strokeStyle = '#0A84FF';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(cropStart.x, cropStart.y, x - cropStart.x, y - cropStart.y);
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, canvasRef.current!.width, cropStart.y); // top
        ctx.fillRect(0, cropStart.y, cropStart.x, canvasRef.current!.height - cropStart.y); // left
        ctx.fillRect(cropStart.x, y, canvasRef.current!.width - cropStart.x, canvasRef.current!.height - y); // bottom
        ctx.fillRect(x, cropStart.y, canvasRef.current!.width - x, y - cropStart.y); // right
      }
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (mode === 'draw') {
      saveHistoryState();
    } else if (mode === 'crop' && cropStart && cropCurrent) {
      restoreState(historyStep); // clear overlay
      
      const width = cropCurrent.x - cropStart.x;
      const height = cropCurrent.y - cropStart.y;
      
      if (Math.abs(width) > 20 && Math.abs(height) > 20) {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          const x = Math.min(cropStart.x, cropCurrent.x);
          const y = Math.min(cropStart.y, cropCurrent.y);
          const w = Math.abs(width);
          const h = Math.abs(height);
          
          const croppedData = ctx.getImageData(x, y, w, h);
          canvasRef.current.width = w;
          canvasRef.current.height = h;
          ctx.putImageData(croppedData, 0, 0);
          saveHistoryState();
        }
      }
      setCropStart(null);
      setCropCurrent(null);
    }
  };

  const addText = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'text') return;
    const text = prompt("Enter text:");
    if (text) {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const { x, y } = getCoordinates(e);
        ctx.font = '24px Arial';
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        saveHistoryState();
      }
    }
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      restoreState(newStep);
      setHistoryStep(newStep);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      restoreState(newStep);
      setHistoryStep(newStep);
    }
  };

  const restoreState = (step: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = history[step].width;
    canvas.height = history[step].height;
    ctx.putImageData(history[step], 0, 0);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/jpeg', 0.95));
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden border border-[var(--ln)] rounded-xl h-full">
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[var(--bg)]"
        style={{ display: 'grid', placeItems: zoom <= 1 ? 'center' : 'start' }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onClick={mode === 'text' ? addText : undefined}
          className={`transition-transform ${mode === 'draw' ? 'cursor-crosshair' : mode === 'crop' ? 'cursor-crosshair' : 'cursor-text'}`}
          style={{ 
            width: `${zoom * 100}%`,
            height: `${zoom * 100}%`,
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Word-like Ribbon Bar */}
      <div className="flex flex-col bg-[var(--paper)] border-t border-[var(--ln)] select-none mt-auto">
        {/* Ribbon Tabs */}
        <div className="flex text-sm px-2 pt-1 border-b border-[var(--ln)] bg-[var(--bg2)]">
          <div className="px-5 py-2 bg-[var(--paper)] text-[var(--ink)] rounded-t cursor-default border-t border-l border-r border-[var(--ln)] font-medium">Image Edit</div>
        </div>
        
        {/* Ribbon Body */}
        <div className="flex items-stretch bg-[var(--paper)] py-3 px-2 text-[var(--ink)]">
          
          {/* Group 1: History */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2">
              <button 
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-[var(--bg2)] disabled:opacity-30 min-w-[64px] transition-colors"
                onClick={handleUndo} disabled={historyStep <= 0}
              >
                <Undo size={24} className="text-[var(--blue)] mb-1" />
                <span className="text-xs text-[var(--ink2)] font-medium">Undo</span>
              </button>
              <button 
                className="flex flex-col items-center justify-center p-2 rounded hover:bg-[var(--bg2)] disabled:opacity-30 min-w-[64px] transition-colors"
                onClick={handleRedo} disabled={historyStep >= history.length - 1}
              >
                <Redo size={24} className="text-[var(--blue)] mb-1" />
                <span className="text-xs text-[var(--ink2)] font-medium">Redo</span>
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">History</span>
          </div>

          {/* Group 2: View (Zoom) */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2 items-center h-full pt-1">
              <button 
                className="flex items-center justify-center p-2 rounded hover:bg-[var(--bg2)] text-[var(--ink2)] transition-colors"
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
              >
                <ZoomOut size={20} />
              </button>
              <span className="text-xs text-[var(--ink)] w-10 text-center font-mono font-medium">
                {Math.round(zoom * 100)}%
              </span>
              <button 
                className="flex items-center justify-center p-2 rounded hover:bg-[var(--bg2)] text-[var(--ink2)] transition-colors"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              >
                <ZoomIn size={20} />
              </button>
              <button 
                className="flex items-center justify-center p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--blue)] text-[11px] font-bold uppercase transition-colors ml-1"
                onClick={() => setZoom(1)}
              >
                Fit
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">View</span>
          </div>

          {/* Group 3: Tools */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex gap-2 mb-2">
              <button 
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${mode === 'draw' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}
                onClick={() => setMode('draw')}
              >
                <Pencil size={24} className={mode === 'draw' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Draw</span>
              </button>
              <button 
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${mode === 'text' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}
                onClick={() => setMode('text')}
              >
                <Type size={24} className={mode === 'text' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Text</span>
              </button>
              <button 
                className={`flex flex-col items-center justify-center p-2 rounded min-w-[64px] transition-colors ${mode === 'crop' ? 'bg-[var(--bg2)] shadow-inner border border-[var(--ln)]' : 'hover:bg-[var(--bg2)] border border-transparent'}`}
                onClick={() => setMode('crop')}
              >
                <Crop size={24} className={mode === 'crop' ? 'text-[var(--blue)]' : 'text-[var(--ink2)]'} />
                <span className="text-xs mt-1 text-[var(--ink2)] font-medium">Crop</span>
              </button>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">Tools</span>
          </div>

          {/* Group 4: Properties */}
          <div className="flex flex-col items-center justify-between px-4 border-r border-[var(--ln)]">
            <div className="flex flex-col items-center justify-center flex-1 mb-2 px-3">
              <label className="flex flex-col items-center cursor-pointer hover:bg-[var(--bg2)] p-2 rounded transition-colors">
                <input 
                  type="color" 
                  value={color} 
                  onChange={(e) => setColor(e.target.value)} 
                  className="w-8 h-8 rounded border-2 border-[var(--ln)] p-0 cursor-pointer mb-1"
                />
                <span className="text-xs text-[var(--ink2)] font-medium">Color</span>
              </label>
            </div>
            <span className="text-[10px] text-[var(--ink3)] mb-0.5 uppercase tracking-wider font-semibold">Properties</span>
          </div>

          <div className="flex-1" />

          {/* Group 5: Action */}
          <div className="flex flex-col items-center justify-between pl-5 pr-6">
            <div className="flex items-center justify-center flex-1 mb-2">
              <button 
                className="flex flex-col items-center justify-center px-8 py-3 rounded-lg bg-[var(--blue)] hover:bg-[var(--blue2)] text-white shadow-md min-w-[100px] transition-all hover:-translate-y-0.5"
                onClick={handleSave}
              >
                <Save size={24} className="mb-1.5" />
                <span className="text-sm font-bold tracking-wide">Save Edits</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
