import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Shuffle, Layers, Languages, Combine, CheckCircle2, Loader2, ImageIcon, ZoomIn, AlertCircle } from 'lucide-react';
import {
  uploadImage, getSample, getRandomSample, listSamples,
  imageUrl, thumbUrl,
  type SampleDetail, type UploadResult, type SamplesPage,
  type PipelineStages
} from '../../api';

const PIPELINE_STAGES = [
  { key: 'separate', label: 'Separation', icon: Layers, duration: 500 },
  { key: 'translate', label: 'Translation', icon: Languages, duration: 600 },
  { key: 'fuse', label: 'Fusion', icon: Combine, duration: 400 },
] as const;

type ViewMode = 'upload' | 'processing' | 'result' | 'gallery';

export default function TranslatorPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Pipeline state
  const [currentStage, setCurrentStage] = useState(-1);
  const [stagesComplete, setStagesComplete] = useState<boolean[]>([false, false, false]);

  // Result state
  const [resultData, setResultData] = useState<(SampleDetail & { match_quality?: string }) | null>(null);
  const [activeCompare, setActiveCompare] = useState<keyof PipelineStages>('fuse');

  const [galleryData, setGalleryData] = useState<SamplesPage | null>(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryPage, setGalleryPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid format. Acceptable: PNG, JPG, WEBP.');
      return;
    }
    setError(null);
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const startProcessing = useCallback(async () => {
    if (!uploadedFile) return;
    setViewMode('processing');
    setCurrentStage(0);
    setStagesComplete([false, false, false]);
    setError(null);

    try {
      const uploadResult: UploadResult = await uploadImage(uploadedFile);
      const sample = await getSample(uploadResult.matched_id);

      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        setCurrentStage(i);
        await new Promise(r => setTimeout(r, PIPELINE_STAGES[i].duration));
        setStagesComplete(prev => {
          const next = [...prev]; next[i] = true; return next;
        });
      }

      await new Promise(r => setTimeout(r, 200));
      setResultData({ ...sample, match_quality: uploadResult.match_quality });
      setViewMode('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Processing failed.');
      setViewMode('upload');
    }
  }, [uploadedFile]);

  const loadGallery = useCallback(async (page: number) => {
    setGalleryLoading(true);
    setViewMode('gallery');
    try {
      const data = await listSamples(page, 24);
      setGalleryData(data);
      setGalleryPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gallery failed.');
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  const handleGallerySelect = useCallback(async (id: number) => {
    setError(null); setViewMode('processing');
    setCurrentStage(0); setStagesComplete([false, false, false]);
    setUploadPreview(null); setUploadedFile(null);

    try {
      const sample = await getSample(id);
      setUploadPreview(imageUrl(sample.stages.input));

      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        setCurrentStage(i);
        await new Promise(r => setTimeout(r, PIPELINE_STAGES[i].duration));
        setStagesComplete(prev => {
          const next = [...prev]; next[i] = true; return next;
        });
      }

      await new Promise(r => setTimeout(r, 200));
      setResultData({ ...sample, match_quality: 'exact' });
      setViewMode('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend unreachable.');
      setViewMode('gallery');
    }
  }, []);

  const handleRandomDemo = useCallback(async () => {
    setError(null); setViewMode('processing');
    setCurrentStage(0); setStagesComplete([false, false, false]);
    setUploadPreview(null); setUploadedFile(null);

    try {
      const sample = await getRandomSample();
      setUploadPreview(imageUrl(sample.stages.input));

      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        setCurrentStage(i);
        await new Promise(r => setTimeout(r, PIPELINE_STAGES[i].duration));
        setStagesComplete(prev => {
          const next = [...prev]; next[i] = true; return next;
        });
      }

      await new Promise(r => setTimeout(r, 200));
      setResultData({ ...sample, match_quality: 'demo' });
      setViewMode('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backend unreachable.');
      setViewMode('upload');
    }
  }, []);

  const resetAll = () => {
    setViewMode('upload'); setUploadedFile(null); setUploadPreview(null);
    setResultData(null); setCurrentStage(-1); setStagesComplete([false, false, false]);
    setError(null); setActiveCompare('fuse');
  };

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-[400px_1fr] gap-6 items-start h-full pb-8">

      {/* LEFT COLUMN: Control Panel */}
      <div className="brutalist-block flex flex-col h-auto min-h-[600px] sticky top-[100px]">
        <div className="border-b-[1.5px] border-border bg-text text-bg px-4 py-3 flex justify-between items-center">
          <h2 className="text-xl m-0 font-display">COMMAND CENTER</h2>
          <span className="font-mono text-xs font-bold tracking-widest">ACT.01</span>
        </div>

        <div className="p-4 flex flex-col gap-6 flex-1">
          {/* UPLOAD TARGET */}
          <div
            className="border-2 border-dashed border-border p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-[rgba(128,128,128,0.1)] transition-colors min-h-[250px] relative"
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileSelect(f); }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadPreview ? (
              <img src={uploadPreview} alt="Target" className="w-full h-full object-contain absolute p-2" />
            ) : (
              <div className="flex flex-col items-center opacity-60 text-center gap-2">
                <Upload size={32} />
                <span className="font-mono text-sm font-bold uppercase">Mount Target Image</span>
                <span className="font-mono text-xs">JPG / PNG / WEBP</span>
              </div>
            )}
            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
          </div>

          {error && (
            <div className="bg-accent text-black font-mono text-xs p-3 flex gap-2 items-center font-bold">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* CONTROLS */}
          <div className="mt-auto flex flex-col gap-3">
            {uploadPreview && viewMode === 'upload' && (
              <button onClick={startProcessing} className="brutalist-btn brutalist-btn-primary w-full text-sm">
                EXECUTE SEQUENCE
              </button>
            )}
            {viewMode !== 'upload' && (
              <button onClick={resetAll} className="brutalist-btn w-full text-sm">
                ABORT / CLEAR TARGET
              </button>
            )}
            <button onClick={handleRandomDemo} className="brutalist-btn w-full text-sm border-dashed">
              <Shuffle size={16} /> ENGAGE RANDOM DEMO
            </button>
            <button onClick={() => loadGallery(1)} className="brutalist-btn w-full text-sm">
              <ImageIcon size={16} /> OPEN DATABASE
            </button>
          </div>
        </div>
      </div>


      {/* RIGHT COLUMN: Output Stream */}
      <div className="flex flex-col gap-6 h-full">

        {/* STANDBY MODE */}
        {viewMode === 'upload' && (
          <div className="brutalist-block h-full min-h-[600px] flex items-center justify-center relative overflow-hidden">
            <span className="font-mono text-[10rem] opacity-5 absolute font-black pointer-events-none select-none">STANDBY</span>
            <div className="text-center font-mono text-muted uppercase tracking-widest text-sm z-10 flex flex-col items-center gap-4">
              <div className="w-16 h-1 bg-border drop-shadow"></div>
              Awaiting Target Input Matrix
            </div>
          </div>
        )}

        {/* PROCESSING MODE */}
        {viewMode === 'processing' && (
          <div className="brutalist-block p-6 min-h-[600px] flex flex-col">
            <div className="mb-8 border-b-[1.5px] border-border pb-4">
              <h3 className="text-2xl mb-1">PIPELINE EXECUTION</h3>
              <p className="font-mono text-xs text-muted">Running neural isolation and translation algorithms...</p>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-xl mx-auto my-auto">
              {PIPELINE_STAGES.map((stage, i) => {
                const Icon = stage.icon;
                const isActive = currentStage === i;
                const isDone = stagesComplete[i];
                const isPending = currentStage < i;

                return (
                  <div key={stage.key} className={`flex items-center gap-6 p-4 border ${isActive ? 'border-text bg-text text-bg shadow-[4px_4px_0_var(--color-text)] -translate-x-1 -translate-y-1' : isDone ? 'border-border opacity-70' : 'border-dashed border-border opacity-30'} transition-all`}>
                    <div className="w-12 h-12 flex items-center justify-center bg-bg text-text border border-border">
                      {isDone ? <CheckCircle2 size={20} /> : isActive ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono font-bold text-sm tracking-widest uppercase">[{isActive ? 'EXECUTING' : isDone ? 'COMPLETED' : 'PENDING'}]</span>
                      <span className="font-display font-bold text-xl uppercase leading-none mt-1">{stage.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULT MODE */}
        {viewMode === 'result' && resultData && (
          <div className="flex flex-col gap-6">

            {/* UPPER AREA: Result Preview */}
            <div className="brutalist-block h-auto overflow-hidden flex flex-col">
              <div className="bg-border text-bg flex justify-between px-4 py-2">
                <span className="font-mono text-xs font-bold tracking-widest">OUTPUT_MATRIX</span>
                <span className="font-mono text-xs font-bold tracking-widest text-accent">[FUSE_OK]</span>
              </div>
              <div className="p-4 bg-[var(--color-surface)] flex justify-center grow items-center relative aspect-video">
                <img src={imageUrl(resultData.stages[activeCompare])} alt="Output" className="max-h-[600px] w-auto border border-border shadow-[8px_8px_0_var(--color-border)]" />
              </div>
            </div>

            {/* LOWER AREA: Layers Control + Metadata */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Layers */}
              <div className="brutalist-block p-4 flex flex-col gap-3">
                <div className="font-mono text-xs font-bold tracking-widest mb-2 border-b-[1.5px] border-border pb-2">VIEWPORT SELECTION</div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { k: 'input', l: 'Original' },
                    { k: 'back', l: 'Background' },
                    { k: 'text_en', l: 'Extract (EN)' },
                    { k: 'text_vi', l: 'Transl (VI)' },
                    { k: 'fuse', l: 'Final Fuse' }
                  ].map(tab => (
                    <button
                      key={tab.k}
                      className={`font-mono text-xs px-3 py-2 border border-border uppercase tracking-wide transition-colors ${activeCompare === tab.k ? 'bg-text text-bg border-text' : 'bg-surface hover:bg-[rgba(128,128,128,0.2)]'}`}
                      onClick={() => setActiveCompare(tab.k as keyof PipelineStages)}
                    >
                      {tab.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data streams */}
              <div className="brutalist-block p-4 flex flex-col gap-3">
                <div className="font-mono text-xs font-bold tracking-widest mb-2 border-b-[1.5px] border-border pb-2">DATA STREAM EXPORT</div>
                <div className="flex flex-col gap-2">
                  <div className="font-mono text-xs tracking-wide"><span className="text-muted mr-2">OCR:</span> "{resultData.ocr || '...'}"</div>
                  <div className="font-mono text-xs tracking-wide"><span className="text-muted mr-2">OUT:</span> "{resultData.tit || '...'}"</div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* GALLERY MODE */}
        {viewMode === 'gallery' && (
          <div className="brutalist-block p-6 flex flex-col min-h-[600px]">
            <div className="mb-6 border-b-[1.5px] border-border pb-4 flex justify-between items-center">
              <div>
                <h3 className="text-2xl mb-1">SYSTEM DATABASE</h3>
                <p className="font-mono text-xs text-muted">Test samples available in storage ({galleryData?.total || 0})</p>
              </div>
              {galleryData && (
                <div className="font-mono text-xs flex gap-4">
                  <button onClick={() => loadGallery(galleryPage - 1)} disabled={galleryPage <= 1} className="hover:text-accent disabled:opacity-30">PREV</button>
                  <span>PAGE {galleryPage} / {galleryData.total_pages}</span>
                  <button onClick={() => loadGallery(galleryPage + 1)} disabled={galleryPage >= galleryData.total_pages} className="hover:text-accent disabled:opacity-30">NEXT</button>
                </div>
              )}
            </div>

            {galleryLoading ? (
              <div className="flex items-center justify-center grow">
                <Loader2 size={32} className="animate-spin opacity-50" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
                {galleryData?.samples.map(sample => (
                  <button key={sample.id} onClick={() => handleGallerySelect(sample.id)} className="aspect-[4/3] border border-border relative group overflow-hidden bg-bg">
                    <img src={thumbUrl('input', sample.id)} alt={`ID ${sample.id}`} className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform" loading="lazy" />
                    <div className="absolute top-0 left-0 bg-text text-bg font-mono text-[10px] font-bold px-2 py-0.5 border-b-[1.5px] border-r-[1.5px] border-border">
                      {sample.id}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
