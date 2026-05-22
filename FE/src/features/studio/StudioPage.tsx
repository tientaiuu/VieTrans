import React from 'react';
import { SquarePen, Download, X, Info, Layers, Zap, RefreshCw, Trash2, Copy, Clock } from 'lucide-react';
import { useStudioStore } from '../../stores/useStudioStore';
import { UploadZone } from './components/UploadZone';
import { ComparisonSlider } from './components/ComparisonSlider';
import { CanvasEditor } from './components/CanvasEditor';
import { imageUrl, updateFuseImage, buildDownloadUrl, downloadDataUriAsFile } from '../../api';

export const StudioPage: React.FC = () => {
  const { status, progress, result, processTranslation, file, previewUrl } = useStudioStore();
  const [isCropMode, setIsCropMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'single' | 'comparison' | 'json'>('single');
  const [editedImage, setEditedImage] = React.useState<string | null>(null);

  // Download dialog state
  const [showDownloadDialog, setShowDownloadDialog] = React.useState(false);
  const [downloadFilename, setDownloadFilename] = React.useState('translated_image');
  const [downloadFormat, setDownloadFormat] = React.useState<'jpg' | 'png' | 'webp'>('png');
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [editHistory, setEditHistory] = React.useState<{ icon: string; text: string; time: string }[]>([]);
  const [canvasKey, setCanvasKey] = React.useState(0);

  React.useEffect(() => {
    if (!previewUrl) {
      setIsCropMode(false);
    }
  }, [previewUrl]);

  React.useEffect(() => {
    setEditedImage(null);
    setEditHistory([]);
  }, [result]);

  // Reset filename when result changes
  React.useEffect(() => {
    if (result) {
      setDownloadFilename(`translated_${result.matched_id || 'image'}`);
    }
  }, [result]);

  const handleOpenDownloadDialog = () => {
    setShowDownloadDialog(true);
  };

  const handleDownload = async () => {
    if (!result) return;
    setIsDownloading(true);

    try {
      if (editedImage) {
        // Client-side conversion for edited images
        await downloadDataUriAsFile(editedImage, downloadFilename, downloadFormat);
      } else {
        // Server-side conversion via API
        const url = buildDownloadUrl('fuse', String(result.matched_id), downloadFilename, downloadFormat);
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

  return (
    <div className="studio-wrap fup">
      <div className="studio-bar">
        <div className="flex items-center gap-4">
          <span className="sb-badge">STUDIO BETA</span>
          <span className="sb-info">Environment: Production · Region: SEA-West</span>
        </div>
        <div className="sb-quota">Daily Quota: <b>14 / 250</b></div>
      </div>

      <div className="studio-split">
        {/* LEFT: Controls & Upload */}
        <aside className="sp-left">
          <div className="spl-header">
            <h3 className="spl-title">Source Configuration</h3>
          </div>

          <UploadZone isCropMode={isCropMode} onCropModeChange={setIsCropMode} />

          <div className="spl-bottom">
            <div className="opts-row">
              <span className="opt-label">Detailed Segmentation (OCR)</span>
              <button className="tog on"></button>
            </div>
            <div className="opts-row">
              <span className="opt-label">Inpaint Context Reconstruction</span>
              <button className="tog on"></button>
            </div>
            <div className="opts-row">
              <span className="opt-label">Preserve Original Font Weight</span>
              <button className="tog"></button>
            </div>

            <button
              className="proc-btn"
              onClick={processTranslation}
              disabled={!file || isCropMode || status === 'uploading' || status === 'processing'}
            >
              {status === 'uploading' ? 'Processing...' : 'Process Image →'}
            </button>
          </div>
        </aside>

        {/* RIGHT: Result Viewer */}
        <div className="sp-right">
          <div className="spr-tabs">
            <button className={`spr-tab ${activeTab === 'single' ? 'on' : ''}`} onClick={() => setActiveTab('single')}>Single View</button>
            <button className={`spr-tab ${activeTab === 'comparison' ? 'on' : ''}`} onClick={() => setActiveTab('comparison')}>Comparison</button>
            <button className={`spr-tab ${activeTab === 'json' ? 'on' : ''}`} onClick={() => setActiveTab('json')}>JSON Schema</button>
            {result && (
              <button
                className="spr-dl"
                onClick={handleOpenDownloadDialog}
              >
                <Download size={14} />
                Download
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col relative overflow-auto min-h-0 px-1.5 py-1 md:px-2 md:py-1 max-w-[1500px] mx-auto w-full">
            {/* Loader Overlay */}
            {(status === 'uploading' || status === 'processing') && (
              <div className="res-proc show">
                <div className="pspin"></div>
                <div className="plbl font-mono">Running Neural Pipeline...</div>
                <div className="ptrack">
                  <div className="pfill transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="plbl text-[10px] opacity-50">{progress}% Complete</div>
              </div>
            )}

            {/* Empty State */}
            {!result && status === 'idle' && (
              <div className="result-empty">
                <div className="re-circle">❖</div>
                <div className="re-title">No Image Processed</div>
                <div className="re-sub">Upload an image and click "Process" to see the in-image translation results.</div>
              </div>
            )}

            {/* Result Content */}
            {result && (
              <div className="result-content flex flex-col gap-6 h-full">

                {activeTab === 'comparison' && (
                  <ComparisonSlider
                    original={imageUrl(result.stages.input)}
                    translated={editedImage || imageUrl(result.stages.fuse)}
                  />
                )}

                {activeTab === 'single' && (
                  <CanvasEditor
                    key={canvasKey}
                    imageUrl={editedImage || imageUrl(result.stages.fuse)}
                    onSave={async (imgData) => {
                      setEditedImage(imgData);
                      try {
                        await updateFuseImage(String(result.matched_id), imgData);
                      } catch (e) {
                        console.error('Failed to update image on server', e);
                      }
                    }}
                  />
                )}

                {activeTab === 'json' && (
                  <div className="flex-1 bg-[var(--bg)] border border-[var(--ln)] rounded-xl p-4 overflow-auto min-h-[400px] text-left">
                    <pre className="text-[var(--blue)] font-mono text-sm whitespace-pre-wrap">
                      {JSON.stringify({ ...result, edited: !!editedImage }, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Info Panel */}
        <aside className="sp-info">
          <div className="spi-header">
            <Info size={12} style={{ color: 'var(--ink4)', flexShrink: 0 }} />
            <span className="spi-header-title">Details &amp; Info</span>
          </div>

          {!result ? (
            <div className="spi-empty">
              <div className="spi-empty-icon">🔍</div>
              <div className="spi-empty-text">Process an image to see details, pipeline stages, and quick actions here.</div>
            </div>
          ) : (
            <>
              {/* Image Info */}
              <div className="spi-section">
                <div className="spi-section-title">Image Info</div>
                <div className="spi-stat-row">
                  <span className="spi-stat-label">Session ID</span>
                  <span className="spi-stat-val">#{String(result.matched_id).slice(-6)}</span>
                </div>
                <div className="spi-stat-row">
                  <span className="spi-stat-label">Status</span>
                  <span className="spi-stat-val" style={{ color: '#22c55e' }}>✓ Done</span>
                </div>
                <div className="spi-stat-row">
                  <span className="spi-stat-label">Mode</span>
                  <span className="spi-stat-val">{editedImage ? 'Edited' : 'Original'}</span>
                </div>
                <div className="spi-stat-row">
                  <span className="spi-stat-label">View</span>
                  <span className="spi-stat-val">{activeTab === 'single' ? 'Single' : activeTab === 'comparison' ? 'Compare' : 'JSON'}</span>
                </div>
              </div>

              {/* Pipeline Stages */}
              <div className="spi-section">
                <div className="spi-section-title"><Layers size={9} style={{display:'inline', marginRight:4}} />Pipeline Stages</div>
                {[
                  { name: 'Text Detection', key: 'det' },
                  { name: 'OCR Recognition', key: 'ocr' },
                  { name: 'Inpainting', key: 'inp' },
                  { name: 'Translation', key: 'trans' },
                  { name: 'Image Fusion', key: 'fuse' },
                ].map(stage => {
                  const isDone = !!(result.stages as Record<string, string>)[stage.key];
                  return (
                    <div key={stage.key} className="spi-stage-item">
                      <div className={`spi-stage-dot ${isDone ? 'done' : ''}`} />
                      <span className="spi-stage-name">{stage.name}</span>
                      <span className="spi-stage-badge">{isDone ? 'OK' : '—'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="spi-actions">
                <div className="spi-section-title" style={{padding: '2px 0 6px'}}><Zap size={9} style={{display:'inline', marginRight:4}} />Quick Actions</div>
                <button className="spi-action-btn" onClick={handleOpenDownloadDialog}>
                  <Download size={13} /> Export Image
                </button>
                <button
                  className="spi-action-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(imageUrl(result.stages.fuse));
                    setEditHistory(h => [{ icon: '📋', text: 'Image URL copied to clipboard', time: 'just now' }, ...h.slice(0, 9)]);
                  }}
                >
                  <Copy size={13} /> Copy Image URL
                </button>
                <button
                  className="spi-action-btn"
                  onClick={() => {
                    setActiveTab('comparison');
                    setEditHistory(h => [{ icon: '🔄', text: 'Switched to Comparison view', time: 'just now' }, ...h.slice(0, 9)]);
                  }}
                >
                  <RefreshCw size={13} /> Toggle Compare
                </button>
                {editedImage && (
                  <button
                    className="spi-action-btn danger"
                    onClick={() => {
                      setEditedImage(null);
                      setCanvasKey(k => k + 1);
                      setEditHistory(h => [{ icon: '🗑️', text: 'Edits cleared, reverted to original', time: 'just now' }, ...h.slice(0, 9)]);
                    }}
                  >
                    <Trash2 size={13} /> Revert to Original
                  </button>
                )}
              </div>

              {/* Edit History */}
              <div className="spi-section" style={{ flex: 1, borderBottom: 'none' }}>
                <div className="spi-section-title"><Clock size={9} style={{display:'inline', marginRight:4}} />Activity Log</div>
                {editHistory.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>No activity yet. Start editing to track changes.</div>
                ) : (
                  editHistory.map((h, i) => (
                    <div key={i} className="spi-history-item">
                      <span className="spi-history-icon">{h.icon}</span>
                      <div>
                        <div className="spi-history-text">{h.text}</div>
                        <div className="spi-history-time">{h.time}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ─── Download Dialog Modal ─── */}
      {showDownloadDialog && (
        <div className="dl-dialog-overlay" onClick={() => setShowDownloadDialog(false)}>
          <div className="dl-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dl-dialog-header">
              <h3 className="dl-dialog-title">
                <Download size={18} />
                Export Image
              </h3>
              <button className="dl-dialog-close" onClick={() => setShowDownloadDialog(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="dl-dialog-body">
              <div className="dl-field">
                <label className="dl-label">File Name</label>
                <div className="dl-input-wrap">
                  <input
                    type="text"
                    className="dl-input"
                    value={downloadFilename}
                    onChange={(e) => setDownloadFilename(e.target.value)}
                    placeholder="Enter file name..."
                    autoFocus
                  />
                  <span className="dl-ext">.{downloadFormat}</span>
                </div>
              </div>

              <div className="dl-field">
                <label className="dl-label">Format</label>
                <div className="dl-formats">
                  {(['jpg', 'png', 'webp'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      className={`dl-fmt-btn ${downloadFormat === fmt ? 'active' : ''}`}
                      onClick={() => setDownloadFormat(fmt)}
                    >
                      <span className="dl-fmt-name">{fmt.toUpperCase()}</span>
                      <span className="dl-fmt-desc">
                        {fmt === 'jpg' && 'Lossy · Small size'}
                        {fmt === 'png' && 'Lossless · Best quality'}
                        {fmt === 'webp' && 'Modern · Best balance'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="dl-dialog-footer">
              <button className="dl-cancel-btn" onClick={() => setShowDownloadDialog(false)}>
                Cancel
              </button>
              <button
                className="dl-confirm-btn"
                onClick={handleDownload}
                disabled={isDownloading || !downloadFilename.trim()}
              >
                {isDownloading ? (
                  <>
                    <span className="dl-spinner"></span>
                    Exporting...
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
    </div>
  );
};
