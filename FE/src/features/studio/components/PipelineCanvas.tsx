import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Blend,
  CheckCircle2,
  Clock3,
  FileText,
  ImageIcon,
  Languages,
  ScanLine,
  Sparkles,
} from 'lucide-react';
import { imageUrl } from '../../../api';
import type { PipelineStep, PipelineTranslationRecord, UploadResult } from '../../../api';

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

const resolveStageImageUrl = (src?: string | null) => {
  if (!src) return '';
  if (/^(blob:|data:|https?:\/\/)/i.test(src)) return src;
  return imageUrl(src);
};

const formatSeconds = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  if (value < 1) return `${Math.max(1, Math.round(value * 1000))} ms`;
  return `${value.toFixed(value < 10 ? 2 : 1)} s`;
};

const formatMetric = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'n/a';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
};

const stepAccent = (step: PipelineStep) => {
  if (step.status === 'warning') return '#d97706';
  if (step.status === 'error') return '#dc2626';
  if (step.status === 'skipped') return '#64748b';
  if (step.key === 'translate') return '#059669';
  if (step.key === 'fuse') return '#d97706';
  if (step.key === 'ocr') return '#2252e4';
  return '#7c3aed';
};

const stepIcon = (step: PipelineStep) => {
  const color = stepAccent(step);
  if (step.status === 'warning' || step.status === 'error') return <AlertTriangle size={17} color={color} />;
  if (step.key === 'input') return <ImageIcon size={17} color={color} />;
  if (step.key === 'ocr' || step.key === 'inpaint') return <ScanLine size={17} color={color} />;
  if (step.key === 'translate') return <Languages size={17} color={color} />;
  if (step.key === 'render') return <FileText size={17} color={color} />;
  if (step.key === 'fuse') return <Blend size={17} color={color} />;
  return <Sparkles size={17} color={color} />;
};

const fallbackSteps = (result: UploadResult): PipelineStep[] => [
  {
    key: 'input',
    label: 'Input',
    detail: 'Uploaded image',
    image: result.stages.input,
    status: 'complete',
  },
  {
    key: 'ocr',
    label: 'OCR',
    detail: 'Detected text regions',
    image: result.stages.text_en,
    status: 'complete',
  },
  {
    key: 'translate',
    label: 'Translate',
    detail: 'Vietnamese text image',
    image: result.stages.text_vi,
    status: 'complete',
  },
  {
    key: 'inpaint',
    label: 'Inpaint',
    detail: 'Cleaned background',
    image: result.stages.back,
    status: 'complete',
  },
  {
    key: 'fuse',
    label: 'Fuse',
    detail: 'Final composition',
    image: result.stages.fuse,
    status: 'complete',
  },
];

const InfoTile: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: string;
}> = ({ icon, label, value, tone = 'var(--ink)' }) => (
  <div
    style={{
      minWidth: 0,
      border: '1px solid var(--ln-raw)',
      background: 'var(--paper)',
      borderRadius: 8,
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}
  >
    <span
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid var(--ln-raw)',
        background: 'var(--bg)',
        display: 'grid',
        placeItems: 'center',
        color: tone,
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <span style={{ minWidth: 0 }}>
      <span
        style={{
          display: 'block',
          fontSize: 10,
          fontFamily: 'var(--mono)',
          fontWeight: 800,
          color: 'var(--ink4)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'block',
          marginTop: 3,
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </span>
  </div>
);

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
  const steps = result.pipeline?.steps?.length ? result.pipeline.steps : fallbackSteps(result);
  const lastStep = steps[steps.length - 1];
  const [selectedKey, setSelectedKey] = useState(lastStep?.key || 'fuse');

  const selectedStep = steps.find((step) => step.key === selectedKey) || lastStep;
  const selectedImage = resolveStageImageUrl(selectedStep?.image || result.stages.fuse);
  const timings = result.pipeline?.timings || result.latency || {};
  const counts = result.pipeline?.counts || {};
  const qa = result.pipeline?.qa || {};
  const records: PipelineTranslationRecord[] = result.pipeline?.translation_records || [];
  const recordCount = result.pipeline?.translation_record_count ?? records.length;
  const rawQaIssueCount = qa.issue_count;
  const qaIssueCount =
    typeof rawQaIssueCount === 'number'
      ? rawQaIssueCount
      : typeof rawQaIssueCount === 'string'
        ? Number(rawQaIssueCount)
        : 0;
  const qaWarning = qa.has_leftover_english === true || qaIssueCount > 0 || qa.status === 'warning';
  const qaSkipped = qa.skipped === true;
  const qaLabel = qaSkipped ? 'Skipped' : qaWarning ? 'Needs review' : 'Passed';

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
      <div
        style={{
          padding: '12px 14px',
          borderBottom: '1px solid var(--ln-raw)',
          background: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <CheckCircle2 size={17} style={{ color: '#059669', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 900,
                color: 'var(--ink)',
                fontFamily: 'var(--mono)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Pipeline complete
            </span>
            <span
              style={{
                display: 'block',
                marginTop: 2,
                fontSize: 11,
                color: 'var(--ink3)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {result.tit || `Sample ${result.matched_id}`}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--ink3)',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {result.match_quality || 'translated'}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          padding: 14,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <InfoTile
            icon={<Clock3 size={16} />}
            label="Total time"
            value={formatSeconds(timings.total_seconds ?? timings.total)}
            tone="#2252e4"
          />
          <InfoTile
            icon={<ScanLine size={16} />}
            label="OCR regions"
            value={formatMetric(counts.ocr_regions ?? counts.regions ?? counts.total_regions)}
            tone="#7c3aed"
          />
          <InfoTile
            icon={<Languages size={16} />}
            label="Translated"
            value={formatMetric(counts.translatable_regions ?? counts.translated_regions ?? recordCount)}
            tone="#059669"
          />
          <InfoTile
            icon={qaWarning ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            label="QA"
            value={qaLabel}
            tone={qaWarning ? '#d97706' : '#059669'}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
            alignItems: 'stretch',
          }}
        >
          <section
            style={{
              minWidth: 0,
              minHeight: 360,
              border: '1px solid var(--ln-raw)',
              borderRadius: 10,
              background: 'var(--paper)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                minHeight: 42,
                padding: '0 12px',
                borderBottom: '1px solid var(--ln-raw)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                {selectedStep ? stepIcon(selectedStep) : <ImageIcon size={17} />}
                <span
                  style={{
                    minWidth: 0,
                    fontSize: 12,
                    fontWeight: 900,
                    color: 'var(--ink)',
                    fontFamily: 'var(--mono)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedStep?.label || 'Result'}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ink4)',
                  fontFamily: 'var(--mono)',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatSeconds(selectedStep?.duration_seconds)}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 14,
                background:
                  'linear-gradient(45deg, rgba(0,0,0,0.025) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.025) 75%), linear-gradient(45deg, rgba(0,0,0,0.025) 25%, transparent 25%, transparent 75%, rgba(0,0,0,0.025) 75%)',
                backgroundPosition: '0 0, 10px 10px',
                backgroundSize: '20px 20px',
              }}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={selectedStep?.label || 'Pipeline stage'}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 8,
                    border: '1px solid var(--ln-raw)',
                    background: 'var(--paper)',
                    boxShadow: '0 14px 36px rgba(0,0,0,0.10)',
                  }}
                />
              ) : (
                <span style={{ color: 'var(--ink4)', fontSize: 12 }}>No preview available</span>
              )}
            </div>

            <div
              style={{
                padding: 10,
                borderTop: '1px solid var(--ln-raw)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(82px, 1fr))',
                gap: 8,
              }}
            >
              {steps.map((step) => {
                const isSelected = step.key === selectedStep?.key;
                const accent = stepAccent(step);
                return (
                  <button
                    key={step.key}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedKey(step.key)}
                    style={{
                      minWidth: 0,
                      height: 54,
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? accent : 'var(--ln-raw)'}`,
                      background: isSelected ? 'var(--bg)' : 'var(--paper)',
                      cursor: 'pointer',
                      padding: 7,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      color: isSelected ? accent : 'var(--ink3)',
                    }}
                  >
                    {stepIcon(step)}
                    <span
                      style={{
                        width: '100%',
                        fontSize: 9,
                        fontWeight: 900,
                        fontFamily: 'var(--mono)',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            style={{
              minWidth: 0,
              border: '1px solid var(--ln-raw)',
              borderRadius: 10,
              background: 'var(--paper)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                minHeight: 42,
                padding: '0 12px',
                borderBottom: '1px solid var(--ln-raw)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  color: 'var(--ink)',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Stages
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>
                {steps.length} steps
              </span>
            </div>

            <div style={{ padding: 10, display: 'grid', gap: 8 }}>
              {steps.map((step, index) => {
                const accent = stepAccent(step);
                const metrics = Object.entries(step.metrics || {}).filter(([, value]) => value !== null && value !== undefined);
                return (
                  <button
                    key={`${step.key}-${index}`}
                    type="button"
                    onClick={() => setSelectedKey(step.key)}
                    style={{
                      minWidth: 0,
                      border: `1px solid ${step.key === selectedStep?.key ? accent : 'var(--ln-raw)'}`,
                      background: step.key === selectedStep?.key ? 'var(--bg)' : 'transparent',
                      borderRadius: 8,
                      padding: 10,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--paper)',
                          border: '1px solid var(--ln-raw)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {stepIcon(step)}
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          <strong
                            style={{
                              minWidth: 0,
                              fontSize: 12,
                              color: 'var(--ink)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {step.label}
                          </strong>
                          <span
                            style={{
                              fontSize: 10,
                              color: 'var(--ink4)',
                              fontFamily: 'var(--mono)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatSeconds(step.duration_seconds)}
                          </span>
                        </span>
                        <span
                          style={{
                            display: 'block',
                            marginTop: 3,
                            fontSize: 11,
                            lineHeight: 1.45,
                            color: 'var(--ink3)',
                          }}
                        >
                          {step.detail}
                        </span>
                        {metrics.length > 0 && (
                          <span
                            style={{
                              display: 'flex',
                              gap: 6,
                              flexWrap: 'wrap',
                              marginTop: 8,
                            }}
                          >
                            {metrics.slice(0, 3).map(([name, value]) => (
                              <span
                                key={name}
                                style={{
                                  maxWidth: '100%',
                                  border: '1px solid var(--ln-raw)',
                                  borderRadius: 999,
                                  padding: '3px 7px',
                                  fontSize: 10,
                                  color: 'var(--ink3)',
                                  fontFamily: 'var(--mono)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {name}: {formatMetric(value)}
                              </span>
                            ))}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {records.length > 0 && (
          <section
            style={{
              marginTop: 12,
              border: '1px solid var(--ln-raw)',
              borderRadius: 10,
              background: 'var(--paper)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                minHeight: 42,
                padding: '0 12px',
                borderBottom: '1px solid var(--ln-raw)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 900,
                  color: 'var(--ink)',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <Languages size={16} />
                Translation records
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>
                {records.length}/{recordCount}
              </span>
            </div>

            <div style={{ display: 'grid' }}>
              {records.map((record, index) => (
                <div
                  key={`${record.index ?? index}-${record.source_text.slice(0, 16)}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                    gap: 12,
                    padding: '10px 12px',
                    borderTop: index === 0 ? 'none' : '1px solid var(--ln-raw)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        marginBottom: 4,
                        fontSize: 9,
                        fontWeight: 900,
                        color: 'var(--ink4)',
                        fontFamily: 'var(--mono)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Source
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink2)', lineHeight: 1.45 }}>
                      {record.source_text || 'n/a'}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        marginBottom: 4,
                        fontSize: 9,
                        fontWeight: 900,
                        color: 'var(--ink4)',
                        fontFamily: 'var(--mono)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Vietnamese
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--ink)', lineHeight: 1.45 }}>
                      {record.translated_text || 'n/a'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
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
    return <FinalView key={String(result.matched_id)} result={result} />;
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
