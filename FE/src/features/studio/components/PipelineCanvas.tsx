import React, { useEffect, useState } from 'react';
import {
  Blend,
  CheckCircle2,
  ImageIcon,
  Languages,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { imageUrl } from '../../../api';
import type { UploadResult } from '../../../api';

const STAGES = [
  {
    key: 'input',
    label: 'Input',
    detail: 'Image loaded',
    icon: <ImageIcon size={17} />,
    color: '#2252e4',
    progressAt: 0,
  },
  {
    key: 'separate',
    label: 'Inpaint',
    detail: 'Clean background',
    icon: <ScanLine size={17} />,
    color: '#7c3aed',
    progressAt: 25,
  },
  {
    key: 'translate',
    label: 'Translate',
    detail: 'Text EN → VI',
    icon: <Languages size={17} />,
    color: '#059669',
    progressAt: 45,
  },
  {
    key: 'compose',
    label: 'Compose',
    detail: 'Final image',
    icon: <Blend size={17} />,
    color: '#d97706',
    progressAt: 93,
  },
] as const;

interface PipelineCanvasProps {
  isProcessing: boolean;
  progress: number;
  result: UploadResult | null;
  previewUrl?: string;
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

const getActiveStageIndex = (progress: number) => {
  const safeProgress = clampProgress(progress);
  let index = 0;
  STAGES.forEach((stage, stageIndex) => {
    if (safeProgress >= stage.progressAt) index = stageIndex;
  });
  return index;
};

// ─── Main canvas during processing ────────────────────────────────────────────
const ProcessingView: React.FC<{
  progress: number;
  previewUrl?: string;
}> = ({ progress, previewUrl }) => {
  const activeStageIndex = getActiveStageIndex(progress);
  const activeStage = STAGES[activeStageIndex];
  const safeProgress = clampProgress(progress);
  const displaySrc = previewUrl || '';

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto auto',
        gap: 10,
      }}
    >
      {/* ── Main canvas ── */}
      <div
        style={{
          minHeight: 0,
          borderRadius: 12,
          border: `1px solid color-mix(in srgb, ${activeStage.color} 30%, var(--ln-raw))`,
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--paper) 96%, white 4%), var(--bg))',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(34,82,228,0.06) 0 1px, transparent 1px 36px), linear-gradient(0deg, rgba(34,82,228,0.05) 0 1px, transparent 1px 36px)',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            width: 'min(700px, 100%)',
            maxHeight: '100%',
            aspectRatio: '16/10',
            borderRadius: 10,
            background: 'var(--paper)',
            border: `1px solid color-mix(in srgb, ${activeStage.color} 28%, transparent)`,
            boxShadow: `0 20px 60px color-mix(in srgb, ${activeStage.color} 12%, transparent), 0 12px 30px rgba(0,0,0,0.08)`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Processing preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transition: 'filter 0.35s ease',
              }}
              // Force re-render when URL changes (same base URL with ?t= timestamp)
              key={displaySrc}
            />
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink4)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
              }}
            >
              Preparing image preview
            </div>
          )}

          {/* Scan line animation */}
          <div
            style={{
              position: 'absolute',
              left: `${Math.max(7, Math.min(92, safeProgress))}%`,
              top: 0,
              bottom: 0,
              width: 2,
              background: activeStage.color,
              boxShadow: `0 0 20px ${activeStage.color}`,
              transition: 'left 0.5s ease',
            }}
          />

          {/* Shimmer animation */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(115deg, transparent 0%, rgba(34,82,228,0.10) 48%, transparent 78%)',
              animation: 'process-scan 1.6s ease-in-out infinite',
            }}
          />

          {/* Status badge */}
          <div
            style={{
              position: 'absolute',
              left: 10,
              right: 10,
              bottom: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              borderRadius: 7,
              padding: '7px 10px',
              background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ink) 8%, transparent)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minWidth: 0,
                flex: 1,
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeStage.color,
                  background: `color-mix(in srgb, ${activeStage.color} 12%, transparent)`,
                  flexShrink: 0,
                }}
              >
                {activeStage.icon}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ink3)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontFamily: 'var(--mono)',
                }}
              >
                {activeStage.detail}
              </span>
            </span>
            <span
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12,
                fontWeight: 800,
                color: activeStage.color,
                fontVariantNumeric: 'tabular-nums',
                flexShrink: 0,
              }}
            >
              {safeProgress}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Stage thumbnails row ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '2px 2px 4px',
        }}
      >
        {STAGES.map((stage, index) => {
          const isComplete = index < activeStageIndex;
          const isActive = index === activeStageIndex;
          return (
            <div
              key={stage.key}
              style={{
                minWidth: 120,
                borderRadius: 8,
                border: `1px solid ${
                  isActive || isComplete
                    ? `color-mix(in srgb, ${stage.color} 40%, transparent)`
                    : 'var(--ln-raw)'
                }`,
                background: 'var(--paper)',
                overflow: 'hidden',
                opacity: isComplete || isActive ? 1 : 0.45,
                transform: isActive ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'transform 0.2s ease, opacity 0.2s ease',
                boxShadow: isActive
                  ? `0 8px 22px color-mix(in srgb, ${stage.color} 18%, transparent)`
                  : '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div
                style={{
                  height: 54,
                  background: isActive
                    ? `color-mix(in srgb, ${stage.color} 8%, var(--bg2))`
                    : 'var(--bg2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 80%)',
                      animation: 'process-scan 1.4s ease-in-out infinite',
                    }}
                  />
                )}
                <span style={{ color: isComplete ? '#059669' : stage.color }}>
                  {isComplete ? <CheckCircle2 size={18} /> : stage.icon}
                </span>
              </div>
              <div style={{ padding: '6px 8px' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 800,
                    color: isActive || isComplete ? 'var(--ink)' : 'var(--ink4)',
                    fontFamily: 'var(--mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {stage.label}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: 9,
                    color: 'var(--ink4)',
                  }}
                >
                  {stage.detail}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Final result view ──────────────────────────────────────────────────────────────
const FinalView: React.FC<{ result: UploadResult }> = ({ result }) => {
  const finalImage = imageUrl(result.stages.fuse);

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        borderRadius: 12,
        border: '1px solid var(--ln-raw)',
        background: 'var(--bg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          minHeight: 44,
          padding: '0 14px',
          borderBottom: '1px solid var(--ln-raw)',
          background: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <CheckCircle2 size={16} style={{ color: '#059669', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            color: 'var(--ink)',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Translation complete
        </span>
      </div>

      {/* Image */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <img
          src={finalImage}
          alt="Translated result"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: 10,
            border: '1px solid var(--ln-raw)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.10)',
            background: 'var(--paper)',
          }}
        />
      </div>
    </div>
  );
};

// ─── Root export ──────────────────────────────────────────────────────────────
export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  isProcessing,
  progress,
  result,
  previewUrl,
}) => {
  const [displayProgress, setDisplayProgress] = useState(progress);

  useEffect(() => {
    setDisplayProgress(clampProgress(progress));
  }, [progress]);

  if (!isProcessing && result) {
    return <FinalView result={result} />;
  }

  return (
    <>
      <style>{`
        @keyframes process-scan {
          0%   { transform: translateX(-110%); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateX(110%); opacity: 0; }
        }
        @keyframes line-appear {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>

      <div
        style={{
          minHeight: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--blueG)',
                color: 'var(--blue)',
                flexShrink: 0,
              }}
            >
              <Sparkles size={16} />
            </span>
            <span>
              <span
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--ink)',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Translating image
              </span>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--ink4)' }}>
                Processing image pipeline…
              </span>
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: 200,
              maxWidth: '100%',
              height: 7,
              borderRadius: 99,
              background: 'var(--bg2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${displayProgress}%`,
                height: '100%',
                borderRadius: 99,
                background: 'linear-gradient(90deg, var(--blue), #059669, #d97706)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        <ProcessingView
          progress={displayProgress}
          previewUrl={previewUrl}
        />
      </div>
    </>
  );
};

export default PipelineCanvas;
