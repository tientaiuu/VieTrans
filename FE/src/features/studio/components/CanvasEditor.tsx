import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Undo2, Redo2, Type, Save, Minus, Plus, Eraser, ZoomIn, MousePointer } from 'lucide-react';
import { useAppStore } from '../../../stores/useAppStore';

interface CanvasEditorProps {
  imageUrl: string;
  onSave: (imgData: string) => Promise<void>;
}

type Tool = 'select' | 'pen' | 'eraser' | 'text';

const PRESET_COLORS = ['#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];

interface TextState {
  x: number;
  y: number;
  clientX: number;
  clientY: number;
  value: string;
}

interface AddedText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

export const CanvasEditor: React.FC<CanvasEditorProps> = ({ imageUrl, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>('select');
  const [brushSize, setBrushSize] = useState(8);
  const [isEditingSize, setIsEditingSize] = useState(false);
  const [tempSizeInput, setTempSizeInput] = useState('8');
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [zoom, setZoom] = useState(1);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [textInput, setTextInput] = useState<TextState | null>(null);
  const [addedTexts, setAddedTexts] = useState<AddedText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffset = useRef<{ x: number; y: number } | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.warn("CanvasEditor [redraw]: no canvas element found");
      return;
    }
    if (!imgRef.current) {
      console.warn("CanvasEditor [redraw]: no loaded image reference found");
      return;
    }
    const ctx = canvas.getContext('2d')!;

    console.log("CanvasEditor [redraw]: drawing composite layers", {
      src: imgRef.current.src,
      width: canvas.width,
      height: canvas.height,
      textsCount: addedTexts.length,
      selectedTextId
    });

    // 1. Clear base canvas
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw background image
    ctx.drawImage(imgRef.current, 0, 0);

    // 3. Draw offscreen drawings
    if (drawingCanvasRef.current) {
      ctx.drawImage(drawingCanvasRef.current, 0, 0);
    }

    // 4. Draw all text elements
    addedTexts.forEach((t) => {
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';

      const lines = t.text.split('\n');
      const lineHeight = t.size * 1.2;
      lines.forEach((line, index) => {
        ctx.fillText(line, t.x, t.y + index * lineHeight);
      });

      // Selection box for the select tool
      if (t.id === selectedTextId && tool === 'select') {
        ctx.strokeStyle = 'var(--blue)';
        ctx.lineWidth = Math.max(2, t.size / 10);
        ctx.setLineDash([5, 5]);

        let maxWidth = 0;
        lines.forEach((l) => {
          const w = ctx.measureText(l).width;
          if (w > maxWidth) maxWidth = w;
        });

        const pad = t.size * 0.3;
        ctx.strokeRect(
          t.x - maxWidth / 2 - pad,
          t.y - t.size / 2 - pad,
          maxWidth + pad * 2,
          lines.length * lineHeight + pad
        );
        ctx.setLineDash([]);
      }
    });
  }, [addedTexts, selectedTextId, tool]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let active = true;
    let finalUrl = imageUrl;
    let isBlobCreated = false;

    const loadAndDraw = async () => {
      try {
        console.log("CanvasEditor [loader]: loadAndDraw starting for", imageUrl);
        if (imageUrl.startsWith('http')) {
          const token = useAppStore.getState().token;
          const headers: HeadersInit = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch(imageUrl, { headers });
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

          const blob = await res.blob();
          if (!active) return;
          finalUrl = URL.createObjectURL(blob);
          isBlobCreated = true;
        }

        const img = new Image();
        img.onload = () => {
          if (!active) {
            if (isBlobCreated) URL.revokeObjectURL(finalUrl);
            return;
          }
          console.log("CanvasEditor [loader]: image loaded successfully from blob/url", finalUrl);
          imgRef.current = img;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          const drawingCanvas = document.createElement('canvas');
          drawingCanvas.width = img.naturalWidth;
          drawingCanvas.height = img.naturalHeight;
          drawingCanvasRef.current = drawingCanvas;

          setAddedTexts([]);
          setSelectedTextId(null);

          ctx.drawImage(img, 0, 0);
          setIsDirty(false);

          if (isBlobCreated) {
            URL.revokeObjectURL(finalUrl);
          }

          setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setTimeout(() => {
            if (!active) return;
            const container = containerRef.current;
            if (container && container.clientWidth > 0) {
              const availableWidth = Math.max(container.clientWidth - 64, 100);
              const availableHeight = Math.max(container.clientHeight - 64, 100);
              const fitScale = Math.min(availableWidth / img.naturalWidth, availableHeight / img.naturalHeight);
              setZoom(fitScale);
            } else {
              setZoom(1);
            }
          }, 50);
        };
        img.onerror = (e) => {
          console.error("CanvasEditor [loader]: image load failed", finalUrl, e);
          if (isBlobCreated) URL.revokeObjectURL(finalUrl);
        };
        img.src = finalUrl;
      } catch (err) {
        console.error("CanvasEditor [loader]: fetch to blob failed, falling back to direct load", imageUrl, err);
        if (!active) return;
        const img = new Image();
        if (imageUrl.startsWith('http')) img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (!active) return;
          imgRef.current = img;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const drawingCanvas = document.createElement('canvas');
          drawingCanvas.width = img.naturalWidth;
          drawingCanvas.height = img.naturalHeight;
          drawingCanvasRef.current = drawingCanvas;
          setAddedTexts([]);
          setSelectedTextId(null);
          ctx.drawImage(img, 0, 0);
          setIsDirty(false);

          setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          setTimeout(() => {
            if (!active) return;
            const container = containerRef.current;
            if (container && container.clientWidth > 0) {
              const availableWidth = Math.max(container.clientWidth - 64, 100);
              const availableHeight = Math.max(container.clientHeight - 64, 100);
              const fitScale = Math.min(availableWidth / img.naturalWidth, availableHeight / img.naturalHeight);
              setZoom(fitScale);
            } else {
              setZoom(1);
            }
          }, 50);
        };
        img.onerror = (e) => {
          console.error("CanvasEditor [loader]: direct fallback image load failed", imageUrl, e);
        };
        img.src = imageUrl;
      }
    };

    loadAndDraw();

    return () => {
      active = false;
    };
  }, [imageUrl]);

  useEffect(() => {
    redraw();
  }, [redraw, zoom]);

  const getPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text') return;
    
    e.preventDefault();
    const pos = getPos(e);
    
    if (tool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        let matchedTextId: string | null = null;
        for (let i = addedTexts.length - 1; i >= 0; i--) {
          const t = addedTexts[i];
          ctx.font = `bold ${t.size}px sans-serif`;
          const lines = t.text.split('\n');
          let maxWidth = 0;
          lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
          });
          const height = lines.length * (t.size * 1.2);
          const pad = t.size * 0.3;
          
          const isInside = (
            pos.x >= t.x - maxWidth / 2 - pad &&
            pos.x <= t.x + maxWidth / 2 + pad &&
            pos.y >= t.y - t.size / 2 - pad &&
            pos.y <= t.y + height + pad
          );
          
          if (isInside) {
            matchedTextId = t.id;
            break;
          }
        }
        
        if (matchedTextId) {
          setAddedTexts(prev => prev.filter(t => t.id !== matchedTextId));
          setIsDirty(true);
          setSelectedTextId(null);
          redraw();
          return;
        }
      }
    }

    if (tool === 'select') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      
      let matchedTextId: string | null = null;
      for (let i = addedTexts.length - 1; i >= 0; i--) {
        const t = addedTexts[i];
        ctx.font = `bold ${t.size}px sans-serif`;
        const lines = t.text.split('\n');
        let maxWidth = 0;
        lines.forEach(line => {
          const w = ctx.measureText(line).width;
          if (w > maxWidth) maxWidth = w;
        });
        const height = lines.length * (t.size * 1.2);
        const pad = t.size * 0.3;
        
        const isInside = (
          pos.x >= t.x - maxWidth / 2 - pad &&
          pos.x <= t.x + maxWidth / 2 + pad &&
          pos.y >= t.y - t.size / 2 - pad &&
          pos.y <= t.y + height + pad
        );
        
        if (isInside) {
          matchedTextId = t.id;
          dragStartOffset.current = { x: pos.x - t.x, y: pos.y - t.y };
          break;
        }
      }
      
      setSelectedTextId(matchedTextId);
      if (matchedTextId) {
        isDrawing.current = true;
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      }
      redraw();
      return;
    }
    
    isDrawing.current = true;
    lastPos.current = pos;
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  }, [tool, getPos, addedTexts, redraw]);

  const draw = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'text' || !isDrawing.current) return;
    e.preventDefault();
    const pos = getPos(e);
    
    if (tool === 'eraser') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d')!;
        let matchedTextId: string | null = null;
        for (let i = addedTexts.length - 1; i >= 0; i--) {
          const t = addedTexts[i];
          ctx.font = `bold ${t.size}px sans-serif`;
          const lines = t.text.split('\n');
          let maxWidth = 0;
          lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
          });
          const height = lines.length * (t.size * 1.2);
          const pad = t.size * 0.3;
          
          const isInside = (
            pos.x >= t.x - maxWidth / 2 - pad &&
            pos.x <= t.x + maxWidth / 2 + pad &&
            pos.y >= t.y - t.size / 2 - pad &&
            pos.y <= t.y + height + pad
          );
          
          if (isInside) {
            matchedTextId = t.id;
            break;
          }
        }
        
        if (matchedTextId) {
          setAddedTexts(prev => prev.filter(t => t.id !== matchedTextId));
          setIsDirty(true);
          setSelectedTextId(null);
          redraw();
        }
      }
    }

    if (tool === 'select' && selectedTextId && dragStartOffset.current) {
      const newX = pos.x - dragStartOffset.current.x;
      const newY = pos.y - dragStartOffset.current.y;
      setAddedTexts(prev => prev.map(t => t.id === selectedTextId ? { ...t, x: newX, y: newY } : t));
      setIsDirty(true);
      return;
    }
    
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const ctx = drawingCanvas.getContext('2d')!;
    
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (lastPos.current) ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setIsDirty(true);
    
    redraw();
  }, [tool, brushColor, brushSize, getPos, selectedTextId, redraw]);

  const endDraw = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
    dragStartOffset.current = null;
  }, []);

  const handleRevert = useCallback(() => {
    setAddedTexts([]);
    setSelectedTextId(null);
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas) {
      const ctx = drawingCanvas.getContext('2d')!;
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    }
    redraw();
    setIsDirty(false);
  }, [redraw]);

  const handleSave = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      await onSave(dataUrl);
      setIsDirty(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }, [onSave]);

  const handleFitZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const availableWidth = Math.max(container.clientWidth - 64, 100);
    const availableHeight = Math.max(container.clientHeight - 64, 100);
    const fitScale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    setZoom(fitScale);
  }, []);

  const toolItems: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: 'select', label: 'Select',  icon: <MousePointer size={17} /> },
    { id: 'pen',    label: 'Draw',    icon: <Pencil size={17} /> },
    { id: 'text',   label: 'Text',    icon: <Type size={17} /> },
    { id: 'eraser', label: 'Erase',   icon: <Eraser size={17} /> },
  ];

  return (
    <div className="canvas-editor flex flex-col flex-1 min-h-0 rounded-xl overflow-hidden border border-[var(--ln)] relative" style={{ background: 'var(--bg)' }}>

      {textInput && (
        <div
          style={{
            position: 'absolute',
            left: `${textInput.clientX}px`,
            top: `${textInput.clientY}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
            display: 'inline-block',
          }}
        >
          <textarea
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setTextInput(null);
              }
            }}
            onBlur={() => {
              if (textInput) {
                const trimmed = textInput.value.trim();
                if (trimmed) {
                  const newText: AddedText = {
                    id: crypto.randomUUID(),
                    text: trimmed,
                    x: textInput.x,
                    y: textInput.y,
                    color: brushColor,
                    size: brushSize,
                  };
                  setAddedTexts((prev) => [...prev, newText]);
                  setIsDirty(true);
                }
              }
              setTextInput(null);
            }}
            placeholder="TEXT"
            style={{
              background: 'transparent',
              color: brushColor,
              fontFamily: 'var(--sans)',
              fontSize: `${brushSize}px`,
              fontWeight: 'bold',
              padding: '6px 12px',
              minWidth: '120px',
              outline: 'none',
              resize: 'both',
              border: '2px solid #8b5cf6',
              borderRadius: '4px',
              textAlign: 'center',
              display: 'block',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
            }}
          />

          {/* Canva-style resize handles */}
          {/* Corner Circles */}
          <div style={{ position: 'absolute', top: '-4px', left: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-4px', left: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
          
          {/* Side Capsules */}
          <div style={{ position: 'absolute', left: '-3px', top: 'calc(50% - 6px)', width: '5px', height: '12px', borderRadius: '4px', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: '-3px', top: 'calc(50% - 6px)', width: '5px', height: '12px', borderRadius: '4px', background: 'white', border: '1.5px solid #8b5cf6', pointerEvents: 'none' }} />
        </div>
      )}

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-8"
        style={{ background: 'var(--bg)' }}
        onClick={() => setShowColorPalette(false)}
      >
        <div
          style={{
            position: 'relative',
            width: dimensions ? `${dimensions.width * zoom}px` : '100%',
            height: dimensions ? `${dimensions.height * zoom}px` : '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'width 0.15s ease, height 0.15s ease',
          }}
        >
          <canvas
            ref={canvasRef}
            className="transition-[transform,filter] duration-150"
            style={{
              position: 'absolute',
              width: dimensions ? `${dimensions.width}px` : '100%',
              height: dimensions ? `${dimensions.height}px` : '100%',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              touchAction: 'none',
              cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair',
            }}
            onPointerDown={startDraw}
            onPointerMove={draw}
            onPointerUp={endDraw}
            onPointerLeave={endDraw}
            onPointerCancel={endDraw}
            onClick={(e) => {
              if (tool === 'text') {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const editor = canvas.closest('.canvas-editor');
                if (!editor) return;
                
                const rect = canvas.getBoundingClientRect();
                const editorRect = editor.getBoundingClientRect();
                
                const canvasX = (e.clientX - rect.left) * (canvas.width / rect.width);
                const canvasY = (e.clientY - rect.top) * (canvas.height / rect.height);
                
                const clientX = e.clientX - editorRect.left;
                const clientY = e.clientY - editorRect.top;
                
                setTextInput({
                  x: canvasX,
                  y: canvasY,
                  clientX,
                  clientY,
                  value: '',
                });
              }
            }}
          />
        </div>
      </div>

      {/* ── Floating Glassmorphic Toolbar ── */}
      <div
        className="absolute bottom-5 left-1/2 select-none"
        style={{ transform: 'translateX(-50%)', zIndex: 10 }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.7)',
            borderRadius: '100px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
            padding: '5px 6px',
          }}
        >
          {/* Tool group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1px', background: 'rgba(0,0,0,0.04)', borderRadius: '100px', padding: '2px' }}>
            {toolItems.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTool(id)}
                title={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '100px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  letterSpacing: '-0.01em',
                  transition: 'all 0.15s ease',
                  background: tool === id
                    ? 'white'
                    : 'transparent',
                  color: tool === id ? 'var(--blue)' : '#6b7280',
                  boxShadow: tool === id ? '0 1px 4px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.1)', margin: '0 6px', flexShrink: 0 }} />

          {/* Color picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPalette(p => !p); }}
              title="Pen color"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 14px',
                borderRadius: '100px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                width: '18px', height: '18px',
                borderRadius: '50%',
                background: brushColor,
                border: brushColor === '#ffffff' ? '1.5px solid rgba(0,0,0,0.15)' : '1.5px solid rgba(0,0,0,0.08)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                flexShrink: 0,
                display: 'block',
              }} />
              <span>Color</span>
            </button>

            {/* Color palette popup */}
            {showColorPalette && (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 12px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '16px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                  padding: '12px',
                  zIndex: 20,
                  minWidth: '200px',
                }}
              >
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Pen color</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setBrushColor(c); setShowColorPalette(false); }}
                      style={{
                        width: '26px', height: '26px',
                        borderRadius: '50%',
                        background: c,
                        border: brushColor === c ? '2.5px solid var(--blue)' : c === '#ffffff' ? '1.5px solid #e5e7eb' : '1.5px solid rgba(0,0,0,0.08)',
                        cursor: 'pointer',
                        transition: 'transform 0.1s, box-shadow 0.1s',
                        boxShadow: brushColor === c ? '0 0 0 2px white, 0 0 0 4px var(--blue)' : '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Custom</span>
                  <label style={{ position: 'relative', cursor: 'pointer' }}>
                    <span style={{
                      display: 'block', width: '26px', height: '26px', borderRadius: '50%',
                      background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)`,
                      border: '1.5px solid rgba(0,0,0,0.08)',
                    }} />
                    <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)}
                      style={{ position: 'absolute', top: 0, left: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, flexShrink: 0 }}>Size</span>
            <input
              type="range"
              min={2} max={100} value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={{ width: '72px', accentColor: 'var(--blue)', cursor: 'pointer' }}
            />
            {isEditingSize ? (
              <input
                type="number"
                value={tempSizeInput}
                autoFocus
                onChange={(e) => setTempSizeInput(e.target.value)}
                onBlur={() => {
                  setIsEditingSize(false);
                  const parsed = parseInt(tempSizeInput, 10);
                  if (!isNaN(parsed) && parsed >= 2 && parsed <= 500) {
                    setBrushSize(parsed);
                  } else {
                    setTempSizeInput(String(brushSize));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const parsed = parseInt(tempSizeInput, 10);
                    if (!isNaN(parsed) && parsed >= 2 && parsed <= 500) {
                      setBrushSize(parsed);
                    } else {
                      setTempSizeInput(String(brushSize));
                    }
                    setIsEditingSize(false);
                  } else if (e.key === 'Escape') {
                    setTempSizeInput(String(brushSize));
                    setIsEditingSize(false);
                  }
                }}
                style={{
                  width: '36px',
                  border: '1.5px solid var(--blue)',
                  borderRadius: '4px',
                  padding: '2px 4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  textAlign: 'right',
                  outline: 'none',
                  background: 'white',
                }}
              />
            ) : (
              <span
                onClick={() => {
                  setTempSizeInput(String(brushSize));
                  setIsEditingSize(true);
                }}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  minWidth: '22px',
                  textAlign: 'right',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.05)',
                  transition: 'background 0.15s',
                }}
                title="Click to enter a specific size"
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)'}
              >
                {brushSize}
              </span>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.1)', margin: '0 6px', flexShrink: 0 }} />

          {/* Zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            <button
              onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))}
              style={{ padding: '7px 9px', borderRadius: '100px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Minus size={15} />
            </button>
            <button
              onClick={handleFitZoom}
              style={{
                padding: '5px 10px', borderRadius: '100px', border: 'none',
                background: 'transparent', cursor: 'pointer',
                fontSize: '12.5px', fontWeight: 600, color: '#374151',
                minWidth: '48px', textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                transition: 'background 0.15s',
              }}
              title="Fit image"
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <ZoomIn size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom(z => Math.min(z + 0.25, 4))}
              style={{ padding: '7px 9px', borderRadius: '100px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', display: 'flex', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '22px', background: 'rgba(0,0,0,0.1)', margin: '0 4px', flexShrink: 0 }} />

          {/* Undo */}
          <button
            onClick={handleRevert}
            disabled={!isDirty}
            title="Undo"
            style={{
              padding: '8px 10px', borderRadius: '100px', border: 'none', background: 'transparent',
              cursor: isDirty ? 'pointer' : 'not-allowed', color: '#6b7280',
              opacity: isDirty ? 1 : 0.3, display: 'flex', transition: 'background 0.15s, opacity 0.2s',
            }}
            onMouseEnter={e => isDirty && (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <Undo2 size={17} />
          </button>
          <button
            disabled={true}
            title="Redo"
            style={{
              padding: '8px 10px', borderRadius: '100px', border: 'none', background: 'transparent',
              cursor: 'not-allowed', color: '#6b7280', opacity: 0.3, display: 'flex',
            }}
          >
            <Redo2 size={17} />
          </button>

          {/* Save CTA */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            style={{
              marginLeft: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              padding: '8px 20px',
              borderRadius: '100px',
              border: 'none',
              cursor: !isDirty || isSaving ? 'not-allowed' : 'pointer',
              fontSize: '13.5px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'white',
              background: justSaved
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : 'linear-gradient(135deg, var(--blue), var(--blue2))',
              boxShadow: isDirty && !isSaving
                ? '0 2px 12px rgba(34,82,228,0.35), 0 1px 0 rgba(255,255,255,0.2) inset'
                : 'none',
              opacity: !isDirty || isSaving ? 0.55 : 1,
              transition: 'all 0.25s ease',
              transform: isDirty && !isSaving ? 'scale(1)' : 'scale(0.98)',
            }}
          >
            <Save size={15} style={{ strokeWidth: 2.5 }} />
            {isSaving ? 'Saving…' : justSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};