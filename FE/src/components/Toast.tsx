import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../stores/useToastStore';
import type { Toast, ToastType } from '../stores/useToastStore';

// ─── Toast icon ───────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error:   <AlertCircle  size={16} />,
  info:    <Info         size={16} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; bar: string }> = {
  success: { bg: 'var(--paper)', border: 'rgba(34,197,94,0.35)',  icon: '#22c55e', bar: '#22c55e' },
  error:   { bg: 'var(--paper)', border: 'rgba(239,68,68,0.35)',  icon: '#ef4444', bar: '#ef4444' },
  info:    { bg: 'var(--paper)', border: 'color-mix(in srgb, var(--blue) 30%, transparent)', icon: 'var(--blue)', bar: 'var(--blue)' },
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
const ToastItem: React.FC<{ toast: Toast }> = ({ toast: t }) => {
  const { dismissToast } = useToastStore();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const c = COLORS[t.type];
  const dur = t.duration ?? 4000;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        backdropFilter: 'blur(12px)',
        minWidth: '280px',
        maxWidth: '380px',
        overflow: 'hidden',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        transition: 'opacity 0.25s ease, transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        cursor: 'default',
      }}
    >
      {/* Icon */}
      <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
        {ICONS[t.type]}
      </span>

      {/* Message */}
      <span style={{
        fontSize: '13.5px',
        fontWeight: 500,
        color: 'var(--ink)',
        lineHeight: 1.45,
        flex: 1,
        paddingRight: '4px',
      }}>
        {t.message}
      </span>

      {/* Close button */}
      <button
        onClick={() => dismissToast(t.id)}
        aria-label="Close notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink4)',
          padding: '2px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ink)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ink4)')}
      >
        <X size={14} />
      </button>

      {/* Progress bar */}
      {dur > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2.5px',
          background: c.bar,
          borderRadius: '0 0 12px 12px',
          animation: `toast-progress ${dur}ms linear forwards`,
          opacity: 0.6,
        }} />
      )}
    </div>
  );
};

// ─── Toast Container ──────────────────────────────────────────────────────────
export const ToastContainer: React.FC = () => {
  const { toasts } = useToastStore();

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: toasts.length ? 'auto' : 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </>
  );
};
