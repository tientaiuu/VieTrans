import React from 'react';
import {
  Download, X, Layers, RefreshCw, Trash2, Copy, Check,
  Sparkles, ScanLine, Languages, Blend, ImageIcon, Play,
  PanelLeft, GitBranch, Eye,
} from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { UploadZone } from './components/UploadZone';
import { ComparisonSlider } from './components/ComparisonSlider';
import { CanvasEditor } from './components/CanvasEditor';
import { PipelineCanvas } from './components/PipelineCanvas';
import { imageUrl, updateFuseImage, buildDownloadUrl, downloadDataUriAsFile, getSample } from '../../api';

// ─── Responsive hook ──────────────────────────────────────────────────────────
function useWindowWidth() {
  const [width, setWidth] = React.useState(() => window.innerWidth);
  React.useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false;

  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back below for browsers that deny clipboard permissions.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

// ─── Pipeline stages definition ───────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'input',   label: 'Input',       icon: <ImageIcon size={15} />,   desc: 'Original image loaded' },
  { key: 'back',    label: 'Separation',  icon: <ScanLine size={15} />,    desc: 'Text & background split' },
  { key: 'text_vi', label: 'Translation', icon: <Languages size={15} />,   desc: 'EN → VI rendering' },
  { key: 'fuse',    label: 'Fusion',      icon: <Blend size={15} />,       desc: 'Layers composited' },
];

// ─── Spinner ─────────────────────────────────────────────────────────────────
const Spinner: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = '#fff' }) => (
  <span style={{
    width: `${size}px`, height: `${size}px`, borderRadius: '50%',
    border: `2px solid rgba(255,255,255,0.25)`,
    borderTopColor: color,
    animation: 'spin 0.7s linear infinite',
    display: 'inline-block',
    flexShrink: 0,
  }} />
);

export const StudioPage: React.FC = () => {
  const {
    queue,
    activeId,
    isProcessingAll,
    removeItem,
    setActiveId,
    setEditedImage,
    processAll,
  } = useStudioStore();

  const activeItem = queue.find((q) => q.id === activeId) ?? null;

  const [activeTab, setActiveTab] = React.useState<'single' | 'original' | 'comparison' | 'pipeline' | 'json'>('single');
  const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);
  const [downloadFilename, setDownloadFilename] = React.useState('translated_image');
  const [downloadFormat, setDownloadFormat] = React.useState<'jpg' | 'png' | 'webp'>('png');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [canvasKey, setCanvasKey] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const [copiedText, setCopiedText] = React.useState(false);
  const [copyTextFailed, setCopyTextFailed] = React.useState(false);
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // ── Responsive ────────────────────────────────────────────────────────────
  const windowWidth = useWindowWidth();
  const isMobile  = windowWidth < 768;
  const isTablet  = windowWidth >= 768 && windowWidth < 1024;
  const isDesktop = windowWidth >= 1024;
  // On mobile: show either 'queue' pane or 'editor' pane
  const [mobilePane, setMobilePane] = React.useState<'queue' | 'editor'>('queue');
  // On tablet: queue panel can be collapsed
  const [queueOpen, setQueueOpen] = React.useState(true);

  // Reset canvas key when activeId changes
  React.useEffect(() => {
    setCanvasKey((k) => k + 1);
  }, [activeId]);

  // Update download filename when activeItem result changes
  React.useEffect(() => {
    if (activeItem?.result) {
      setDownloadFilename(`vietrans_${String(activeItem.result.matched_id).slice(-8)}`);
    }
  }, [activeItem?.result]);

  React.useEffect(() => {
    if (activeItem?.status === 'done') {
      setActiveTab('single');
    }
    setCopied(false);
    setCopiedText(false);
    setCopyTextFailed(false);
  }, [activeItem?.id, activeItem?.status]);

  const handleCopyUrl = async () => {
    if (!activeItem?.result) return;
    const ok = await copyTextToClipboard(imageUrl(activeItem.result.stages.fuse));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyImageText = async () => {
    if (!activeItem?.result) return;

    let text = (activeItem.result.ocr || activeItem.result.tit || '').trim();
    if (!text.trim()) {
      try {
        const fresh = await getSample(activeItem.result.matched_id);
        text = (fresh.ocr || fresh.tit || '').trim();
      } catch (err) {
        console.warn('Failed to refresh image text before copy', err);
      }
    }

    const ok = await copyTextToClipboard(text);
    setCopyTextFailed(!ok);
    if (ok) {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
      setTimeout(() => setCopyTextFailed(false), 2000);
    } else {
      setTimeout(() => setCopyTextFailed(false), 2400);
    }
  };

  const handleDownload = async () => {
    if (!activeItem?.result) return;
    setIsDownloading(true);
    try {
      if (activeItem.editedImage) {
        await downloadDataUriAsFile(activeItem.editedImage, downloadFilename, downloadFormat);
      } else {
        const url = buildDownloadUrl('fuse', String(activeItem.result.matched_id), downloadFilename, downloadFormat);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${downloadFilename}.${downloadFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
      setShowDownloadDialog(false);
    }
  };

  const idleCount = queue.filter((q) => q.status === 'idle').length;
  const canTranslateAll = idleCount > 0 && !isProcessingAll;
  const hasImageText = !!activeItem?.result;
  const copyImageTextLabel = copiedText
    ? 'Text Copied!'
    : copyTextFailed
      ? 'No Text'
      : 'Copy Image Text';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      paddingTop: '66px',
      background: 'var(--bg)',
    }}>

      {/* ── Top Status Bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: '40px', flexShrink: 0,
        background: 'var(--paper)',
        borderBottom: '1px solid var(--ln)',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px', minWidth: 0 }}>
          <span style={{
            background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
            color: '#fff', fontSize: '9px', fontWeight: 700,
            letterSpacing: '0.12em', padding: '2px 8px', borderRadius: '3px',
            flexShrink: 0,
          }}>STUDIO BETA</span>
          {!isMobile && <span style={{ color: 'var(--ink4)' }}>Production · SEA-West</span>}
          {activeItem?.result && (
            <span style={{ color: 'var(--ink3)', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {!isMobile && `Session #${String(activeItem.result.matched_id).slice(-6)}`}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {/* Mobile: queue/editor toggle */}
          {isMobile && (
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--ln)' }}>
              {(['queue', 'editor'] as const).map(pane => (
                <button
                  key={pane}
                  onClick={() => setMobilePane(pane)}
                  style={{
                    padding: '4px 12px', border: 'none', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                    background: mobilePane === pane ? 'var(--blue)' : 'transparent',
                    color: mobilePane === pane ? '#fff' : 'var(--ink4)',
                    transition: 'all 0.15s',
                  }}
                >{pane}</button>
              ))}
            </div>
          )}
          {/* Tablet: toggle queue panel */}
          {isTablet && (
            <button
              onClick={() => setQueueOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '7px', border: '1px solid var(--ln)',
                background: 'transparent', cursor: 'pointer',
                fontSize: '11px', color: 'var(--ink3)',
              }}
            >
              <PanelLeft size={13} />
              {queueOpen ? 'Hide Queue' : 'Show Queue'}
            </button>
          )}
          <span style={{ color: 'var(--ink4)' }}>
            {isMobile
              ? <b style={{ color: 'var(--ink2)' }}>{queue.length} imgs</b>
              : <><b style={{ color: 'var(--ink2)' }}>{queue.length}</b> imgs · <b style={{ color: idleCount > 0 ? 'var(--blue)' : 'var(--ink2)' }}>{idleCount}</b> idle</>}
          </span>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Queue Panel ── */}
        {/* Desktop: always visible | Tablet: toggleable | Mobile: shown as full pane */}
        <aside style={{
          width: isMobile ? '100%' : (isTablet && !queueOpen) ? '0' : '300px',
          flexShrink: 0,
          display: isMobile ? (mobilePane === 'queue' ? 'flex' : 'none') : 'flex',
          flexDirection: 'column',
          background: 'var(--paper)',
          borderRight: isMobile ? 'none' : '1px solid var(--ln)',
          overflow: 'hidden',
          transition: 'width 0.2s ease',
          minWidth: (!isMobile && isTablet && !queueOpen) ? 0 : undefined,
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid var(--ln)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Sparkles size={14} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink3)', fontFamily: 'var(--mono)',
              flex: 1,
            }}>
              Queue ({queue.length})
            </span>
          </div>

          {/* Upload Zone */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--ln)' }}>
            <UploadZone />
          </div>

          {/* Queue List */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {queue.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '40px 20px', textAlign: 'center', gap: '8px',
              }}>
                <div style={{ fontSize: '26px', opacity: 0.3 }}>📂</div>
                <div style={{ fontSize: '12.5px', color: 'var(--ink4)', lineHeight: 1.5 }}>
                  Add images above to start batch translation
                </div>
              </div>
            ) : (
              queue.map((item) => {
                const isActive = item.id === activeId;
                const isHovered = item.id === hoveredId;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveId(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background: isActive ? 'var(--blueG)' : isHovered ? 'var(--bg)' : 'transparent',
                      borderLeft: `4px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                      transition: 'background 0.12s, border-color 0.12s',
                      minHeight: '76px',
                      position: 'relative',
                    }}
                  >
                    {/* Thumbnail */}
                    <img
                      src={item.previewUrl}
                      alt={item.file.name}
                      style={{
                        width: '50px', height: '50px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        flexShrink: 0,
                        border: '1px solid var(--ln)',
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '13px', fontWeight: 600, color: 'var(--ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: '4px',
                      }}>
                        {item.file.name}
                      </div>
                      {/* Status badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {item.status === 'idle' && (
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--ink4)', flexShrink: 0,
                          }} />
                        )}
                        {item.status === 'uploading' && (
                          <Spinner size={12} color="var(--blue)" />
                        )}
                        {item.status === 'done' && (
                          <Check size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                        )}
                        {item.status === 'error' && (
                          <X size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: '11px',
                          color: item.status === 'done' ? '#22c55e'
                            : item.status === 'error' ? '#ef4444'
                            : item.status === 'uploading' ? 'var(--blue)'
                            : 'var(--ink4)',
                          fontFamily: 'var(--mono)',
                        }}>
                          {item.status === 'idle' ? 'Idle'
                            : item.status === 'uploading' ? `${item.progress}%`
                            : item.status === 'done' ? 'Done'
                            : item.error || 'Error'}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    {isHovered && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                        style={{
                          width: '28px', height: '28px', borderRadius: '8px',
                          border: 'none', background: 'var(--bg2)',
                          color: 'var(--ink4)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'background 0.1s, color 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                          e.currentTarget.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg2)';
                          e.currentTarget.style.color = 'var(--ink4)';
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Translate All button */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid var(--ln)' }}>
            <button
              onClick={processAll}
              disabled={!canTranslateAll}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                fontSize: '12.5px', fontWeight: 700, letterSpacing: '-0.01em',
                cursor: canTranslateAll ? 'pointer' : 'not-allowed',
                color: 'white',
                background: canTranslateAll
                  ? 'linear-gradient(135deg, var(--blue) 0%, var(--blue2) 100%)'
                  : 'color-mix(in srgb, var(--blue) 35%, transparent)',
                boxShadow: canTranslateAll ? '0 4px 14px rgba(34,82,228,0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {isProcessingAll ? (
                <>
                  <Spinner size={13} color="#fff" />
                  Translating…
                </>
              ) : (
                <>
                  <Play size={13} style={{ strokeWidth: 2.5 }} />
                  Translate All {idleCount > 0 ? `(${idleCount})` : ''}
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ── CENTER: Result Viewer ── */}
        <div style={{
          flex: 1, minWidth: 0,
          display: isMobile ? (mobilePane === 'editor' ? 'flex' : 'none') : 'flex',
          flexDirection: 'column',
          background: 'var(--bg)',
        }}>



          {/* Content area */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '10px', display: 'flex', flexDirection: 'column' }}>

            {/* Empty state */}
            {!activeItem && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '16px',
                padding: '40px', textAlign: 'center',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '18px',
                  background: 'var(--paper)', border: '1px solid var(--ln)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                }}>
                  ❖
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
                    Ready to Translate
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--ink4)', lineHeight: 1.6, maxWidth: '280px' }}>
                    Add images to the queue on the left and click <b style={{ color: 'var(--ink3)' }}>Translate All</b>.
                  </div>
                </div>
              </div>
            )}

            {/* Uploading state — Pipeline Canvas Visualization */}
            {activeItem?.status === 'uploading' && (
              <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                <PipelineCanvas
                  isProcessing={true}
                  progress={activeItem.progress}
                  result={null}
                  previewUrl={activeItem.previewUrl}
                />
              </div>
            )}

            {/* Error state */}
            {activeItem?.status === 'error' && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px',
                textAlign: 'center', padding: '40px',
              }}>
                <div style={{ fontSize: '32px' }}>⚠️</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444' }}>
                  Translation Failed
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink4)', maxWidth: '260px' }}>
                  {activeItem.error || 'An unknown error occurred.'}
                </div>
              </div>
            )}

            {/* Idle state */}
            {activeItem?.status === 'idle' && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: '12px',
                textAlign: 'center', padding: isMobile ? '20px' : '40px',
              }}>
                <img
                  src={activeItem.previewUrl}
                  alt="Preview"
                  style={{
                    maxWidth: isMobile ? '90%' : '320px',
                    maxHeight: isMobile ? '200px' : '280px',
                    objectFit: 'contain', borderRadius: '12px',
                    border: '1px solid var(--ln)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  }}
                />
                <div style={{ fontSize: '12px', color: 'var(--ink4)' }}>
                  {isMobile
                    ? <>Tap <b style={{ color: 'var(--ink3)' }}>Translate All</b> button below.</>  
                    : <>Click <b style={{ color: 'var(--ink3)' }}>Translate All</b> to process this image.</>}
                </div>
              </div>
            )}

            {/* Done state — result views */}
            {activeItem?.status === 'done' && activeItem.result && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

                {/* ── Tab bar ── */}
                <div style={{
                  display: 'flex',
                  borderBottom: '1px solid var(--ln)',
                  background: 'var(--paper)',
                  flexShrink: 0,
                  overflowX: 'auto',
                }}>
                  {([
                    { key: 'single',     label: 'Editor',   icon: <ImageIcon size={12} /> },
                    { key: 'original',   label: 'Original', icon: <Eye size={12} /> },
                    { key: 'pipeline',   label: 'Pipeline', icon: <GitBranch size={12} /> },
                    { key: 'comparison', label: 'Compare',  icon: <ScanLine  size={12} /> },
                    { key: 'json',       label: 'JSON',     icon: <Languages size={12} /> },
                  ] as const).map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: `2px solid ${activeTab === tab.key ? 'var(--blue)' : 'transparent'}`,
                        background: 'transparent',
                        color: activeTab === tab.key ? 'var(--blue)' : 'var(--ink4)',
                        fontSize: '12px', fontWeight: activeTab === tab.key ? 700 : 500,
                        cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                        whiteSpace: 'nowrap',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Canvas Editor */}
                <div style={{ display: activeTab === 'single' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <CanvasEditor
                    key={canvasKey}
                    imageUrl={activeItem.editedImage || imageUrl(activeItem.result.stages.fuse)}
                    onSave={async (imgData) => {
                      setEditedImage(activeItem.id, imgData);
                      try {
                        await updateFuseImage(String(activeItem.result!.matched_id), imgData);
                      } catch (e) {
                        console.error('Failed to update image', e);
                      }
                    }}
                  />
                </div>

                {/* Original Image */}
                <div style={{
                  display: activeTab === 'original' ? 'flex' : 'none',
                  flex: 1,
                  minHeight: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '12px' : '20px',
                  background: 'var(--bg)',
                  overflow: 'auto',
                }}>
                  <img
                    src={imageUrl(activeItem.result.stages.input)}
                    alt="Original input"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      border: '1px solid var(--ln)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.10)',
                    }}
                  />
                </div>

                {/* Pipeline Canvas — shows after done */}
                {activeTab === 'pipeline' && (
                  <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
                    <PipelineCanvas
                      isProcessing={false}
                      progress={100}
                      result={activeItem.result}
                      previewUrl={activeItem.previewUrl}
                    />
                  </div>
                )}

                {/* Comparison Slider */}
                <div style={{ display: activeTab === 'comparison' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0 }}>
                  <ComparisonSlider
                    original={imageUrl(activeItem.result.stages.input)}
                    translated={activeItem.editedImage || imageUrl(activeItem.result.stages.fuse)}
                  />
                </div>

                {activeTab === 'json' && (
                  <div style={{
                    flex: 1, borderRadius: '12px', overflow: 'auto',
                    background: 'var(--paper)', border: '1px solid var(--ln)',
                    padding: '20px',
                  }}>
                    <pre style={{
                      color: 'var(--blue)', fontFamily: 'var(--mono)',
                      fontSize: '12px', lineHeight: 1.7, whiteSpace: 'pre-wrap',
                    }}>
                      {JSON.stringify({ ...activeItem.result, edited: !!activeItem.editedImage }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info Panel — hidden on mobile & tablet ── */}
        <aside style={{
          width: isDesktop ? '260px' : '0',
          flexShrink: 0,
          display: isDesktop ? 'flex' : 'none',
          flexDirection: 'column',
          background: 'var(--paper)',
          borderLeft: '1px solid var(--ln)',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px 10px',
            borderBottom: '1px solid var(--ln)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <Layers size={14} style={{ color: 'var(--ink4)', flexShrink: 0 }} />
            <span style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink3)', fontFamily: 'var(--mono)',
            }}>
              Pipeline
            </span>
          </div>

          {/* Pipeline stages */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--ln)' }}>
            {PIPELINE_STAGES.map((stage, idx) => {
              const isDone = activeItem?.status === 'done';
              return (
                <div key={stage.key} style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isDone ? 'var(--blueG)' : 'var(--bg2)',
                      color: isDone ? 'var(--blue)' : 'var(--ink4)',
                      border: isDone
                        ? '1px solid color-mix(in srgb, var(--blue) 25%, transparent)'
                        : '1px solid var(--ln)',
                      transition: 'all 0.3s ease',
                    }}>
                      {isDone ? <Check size={15} strokeWidth={2.5} /> : stage.icon}
                    </div>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <div style={{
                        width: '1.5px', height: '28px',
                        background: isDone
                          ? 'linear-gradient(to bottom, var(--blue), color-mix(in srgb, var(--blue) 30%, transparent))'
                          : 'var(--bg2)',
                        margin: '3px 0',
                        transition: 'background 0.4s ease',
                      }} />
                    )}
                  </div>
                  <div style={{ paddingTop: '5px', paddingBottom: idx < PIPELINE_STAGES.length - 1 ? '16px' : '0' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: isDone ? 'var(--ink)' : 'var(--ink4)', letterSpacing: '-0.01em' }}>
                      {stage.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink4)', lineHeight: 1.4, marginTop: '1px' }}>
                      {stage.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{ padding: '14px 16px', flex: 1 }}>
            <div style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--ink4)', fontFamily: 'var(--mono)',
              marginBottom: '8px',
            }}>
              Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activeItem?.status === 'done' && activeItem.result ? (
                <>
                  {[
                    {
                      icon: <Download size={16} />,
                      label: 'Export Image',
                      onClick: () => setShowDownloadDialog(true),
                    },
                    {
                      icon: copied ? <Check size={16} /> : <Copy size={16} />,
                      label: copied ? 'Copied!' : 'Copy URL',
                      onClick: handleCopyUrl,
                    },
                    {
                      icon: <Eye size={16} />,
                      label: 'Original Image',
                      onClick: () => setActiveTab('original'),
                    },
                    {
                      icon: copiedText ? <Check size={16} /> : <Copy size={16} />,
                      label: copyImageTextLabel,
                      onClick: handleCopyImageText,
                      disabled: !hasImageText,
                    },
                    {
                      icon: <RefreshCw size={16} />,
                      label: activeTab === 'comparison' ? 'Editor View' : 'Compare View',
                      onClick: () => setActiveTab(activeTab === 'comparison' ? 'single' : 'comparison'),
                    },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--ln)',
                        background: 'transparent', fontSize: '14px', fontWeight: 500,
                        color: action.disabled ? 'var(--ink4)' : 'var(--ink3)',
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        opacity: action.disabled ? 0.55 : 1,
                        textAlign: 'left',
                        transition: 'background 0.12s, color 0.12s',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        if (action.disabled) return;
                        e.currentTarget.style.background = 'var(--bg2)';
                        e.currentTarget.style.color = 'var(--ink)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = action.disabled ? 'var(--ink4)' : 'var(--ink3)';
                      }}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  ))}

                  {activeItem.editedImage && (
                    <button
                      onClick={() => {
                        setEditedImage(activeItem.id, null);
                        setCanvasKey((k) => k + 1);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '12px 16px', borderRadius: '10px',
                        border: '1px solid rgba(239,68,68,0.2)',
                        background: 'rgba(239,68,68,0.04)',
                        fontSize: '14px', fontWeight: 500,
                        color: '#ef4444', cursor: 'pointer', textAlign: 'left',
                        transition: 'background 0.12s',
                        width: '100%',
                      }}
                    >
                      <Trash2 size={16} />
                      Revert Edits
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '12px', color: 'var(--ink4)', lineHeight: 1.6 }}>
                  Process an image to see actions.
                </div>
              )}
            </div>
          </div>

          {/* Empty info panel */}
          {!activeItem && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px', opacity: 0.35 }}>🔍</div>
              <div style={{ fontSize: '11px', color: 'var(--ink4)', lineHeight: 1.6 }}>
                Select an item in the queue to see pipeline details.
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ── Mobile bottom quick-action bar ── */}
      {isMobile && activeItem?.status === 'done' && activeItem.result && mobilePane === 'editor' && (
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          padding: '8px 12px',
          background: 'var(--paper)',
          borderTop: '1px solid var(--ln)',
          gap: '6px',
        }}>
          <button
            onClick={() => setShowDownloadDialog(true)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '9px 0', borderRadius: '10px', border: 'none',
              background: 'var(--blue)', color: '#fff',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => setActiveTab('original')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '9px 0', borderRadius: '10px', border: '1px solid var(--ln)',
              background: 'var(--bg2)', color: 'var(--ink3)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Eye size={14} /> Original
          </button>
          <button
            onClick={handleCopyImageText}
            disabled={!hasImageText}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '9px 0', borderRadius: '10px', border: '1px solid var(--ln)',
              background: 'var(--bg2)', color: hasImageText ? 'var(--ink3)' : 'var(--ink4)',
              fontSize: '12px', fontWeight: 600, cursor: hasImageText ? 'pointer' : 'not-allowed',
              opacity: hasImageText ? 1 : 0.55,
            }}
          >
            {copiedText ? <Check size={14} /> : <Copy size={14} />}
            {copiedText ? 'Copied' : copyTextFailed ? 'No Text' : 'Text'}
          </button>
          <button
            onClick={() => setActiveTab(t => t === 'comparison' ? 'single' : 'comparison')}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
              padding: '9px 0', borderRadius: '10px', border: '1px solid var(--ln)',
              background: 'var(--bg2)', color: 'var(--ink3)',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Compare
          </button>
        </div>
      )}

      {/* ── Mobile: translate button sticky at bottom of queue pane ── */}
      {isMobile && mobilePane === 'queue' && (
        <div style={{ flexShrink: 0, padding: '10px 12px', background: 'var(--paper)', borderTop: '1px solid var(--ln)' }}>
          <button
            onClick={() => { processAll(); setMobilePane('editor'); }}
            disabled={!canTranslateAll}
            style={{
              width: '100%', padding: '11px 16px', borderRadius: '10px', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
              fontSize: '13px', fontWeight: 700, color: 'white',
              background: canTranslateAll
                ? 'linear-gradient(135deg, var(--blue) 0%, var(--blue2) 100%)'
                : 'color-mix(in srgb, var(--blue) 35%, transparent)',
              boxShadow: canTranslateAll ? '0 4px 14px rgba(34,82,228,0.25)' : 'none',
              cursor: canTranslateAll ? 'pointer' : 'not-allowed',
            }}
          >
            {isProcessingAll ? <><Spinner size={13} color="#fff" /> Translating…</> : <><Play size={13} /> Translate All {idleCount > 0 ? `(${idleCount})` : ''}</>}
          </button>
        </div>
      )}

      {/* ── Export Dialog ── */}
      {showDownloadDialog && (
        <div
          onClick={() => setShowDownloadDialog(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(440px, calc(100vw - 32px))',
              background: 'var(--paper)',
              borderRadius: '20px',
              border: '1px solid var(--ln)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              overflow: 'hidden',
            }}
          >
            {/* Dialog header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 20px 0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--blueG)',
                  border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Download size={16} style={{ color: 'var(--blue)' }} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    Export Image
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--ink4)' }}>Choose format and filename</div>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadDialog(false)}
                style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--ln)',
                  background: 'var(--bg2)', color: 'var(--ink3)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Dialog body */}
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  color: 'var(--ink3)', marginBottom: '6px', letterSpacing: '-0.01em',
                }}>
                  File Name
                </label>
                <div style={{
                  display: 'flex', alignItems: 'center', borderRadius: '10px',
                  overflow: 'hidden', border: '1px solid var(--ln)', background: 'var(--bg)',
                }}>
                  <input
                    type="text"
                    value={downloadFilename}
                    onChange={(e) => setDownloadFilename(e.target.value)}
                    autoFocus
                    placeholder="Enter filename…"
                    style={{
                      flex: 1, padding: '10px 14px', border: 'none', background: 'transparent',
                      fontSize: '13px', color: 'var(--ink)', fontFamily: 'var(--mono)', outline: 'none',
                    }}
                  />
                  <span style={{
                    padding: '0 14px', fontSize: '12px', color: 'var(--ink4)',
                    fontFamily: 'var(--mono)', borderLeft: '1px solid var(--ln)',
                  }}>
                    .{downloadFormat}
                  </span>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '12px', fontWeight: 600,
                  color: 'var(--ink3)', marginBottom: '8px', letterSpacing: '-0.01em',
                }}>
                  Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {([
                    { fmt: 'jpg',  name: 'JPG',  desc: 'Lossy · Small' },
                    { fmt: 'png',  name: 'PNG',  desc: 'Lossless · Best' },
                    { fmt: 'webp', name: 'WebP', desc: 'Modern · Balanced' },
                  ] as const).map(({ fmt, name, desc }) => (
                    <button
                      key={fmt}
                      onClick={() => setDownloadFormat(fmt)}
                      style={{
                        padding: '12px 8px', borderRadius: '10px', cursor: 'pointer',
                        border: downloadFormat === fmt
                          ? '1.5px solid var(--blue)'
                          : '1px solid var(--ln)',
                        background: downloadFormat === fmt ? 'var(--blueG)' : 'var(--bg)',
                        textAlign: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        fontSize: '14px', fontWeight: 700,
                        color: downloadFormat === fmt ? 'var(--blue)' : 'var(--ink)',
                        fontFamily: 'var(--mono)',
                      }}>
                        {name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--ink4)', marginTop: '2px' }}>{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dialog footer */}
            <div style={{
              display: 'flex', gap: '10px', justifyContent: 'flex-end',
              padding: '0 20px 20px',
            }}>
              <button
                onClick={() => setShowDownloadDialog(false)}
                style={{
                  padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--ln)',
                  background: 'var(--bg2)', color: 'var(--ink)', fontSize: '13px',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={isDownloading || !downloadFilename.trim()}
                style={{
                  padding: '10px 24px', borderRadius: '10px', border: 'none',
                  background: isDownloading || !downloadFilename.trim()
                    ? 'color-mix(in srgb, var(--blue) 40%, transparent)'
                    : 'linear-gradient(135deg, var(--blue), var(--blue2))',
                  color: 'white', fontSize: '13px', fontWeight: 700,
                  cursor: isDownloading || !downloadFilename.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '7px',
                  boxShadow: !isDownloading && downloadFilename.trim() ? '0 4px 14px rgba(34,82,228,0.25)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {isDownloading ? (
                  <>
                    <Spinner size={13} color="#fff" />
                    Exporting…
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Download .{downloadFormat}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
