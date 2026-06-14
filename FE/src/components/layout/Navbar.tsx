import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Bell, ChevronDown, Heart, LogOut, MessageSquare,
  Settings, Sparkles, UserRound, Info, ImageIcon, AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { getFirstName } from '../../utils/user';
import { getHistory, type HistoryItem } from '../../api';

// ─── Types ───────────────────────────────────────────────────────────────────
type NotifAccent = 'green' | 'coral' | 'violet' | 'gold' | 'lavender';
type NotifType   = 'generated' | 'comment' | 'like' | 'alert' | 'image';

interface Notification {
  id: string;
  title: string;
  time: string;
  message: string;
  detail?: string;
  accent: NotifAccent;
  type: NotifType;
  read?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now  = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60)           return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)           return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)           return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)            return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function accentForIndex(i: number): NotifAccent {
  const palette: NotifAccent[] = ['green', 'violet', 'gold', 'lavender', 'coral'];
  return palette[i % palette.length];
}

function historyToNotif(item: HistoryItem, index: number): Notification {
  const hasOcr = !!item.ocr && item.ocr.trim().length > 0;
  return {
    id:      `hist-${item.id}`,
    title:   'Translation completed',
    time:    timeAgo(item.created_at),
    message: hasOcr
      ? `"${item.ocr.substring(0, 50).trim()}${item.ocr.length > 50 ? '…' : ''}" was translated successfully.`
      : 'Your image was processed and translated successfully.',
    detail:  'Result saved to your history. You can download it from the Dashboard.',
    accent:  accentForIndex(index),
    type:    'image',
    read:    false,
  };
}

// Fallback notifications shown when user is not logged in
const GUEST_NOTIFICATIONS: Notification[] = [
  {
    id: 'guest-1',
    title: 'Welcome to VieTrans',
    time: 'just now',
    message: 'AI-powered in-image translation — sign in to start translating.',
    accent: 'violet',
    type: 'generated',
  },
  {
    id: 'guest-2',
    title: 'New: Batch API',
    time: '2h ago',
    message: 'Process thousands of images in parallel with our gRPC streaming API.',
    detail: 'See the API Docs for integration guides and code samples.',
    accent: 'gold',
    type: 'generated',
  },
  {
    id: 'guest-3',
    title: '98.2% OCR accuracy',
    time: '1d ago',
    message: 'VieTrans now detects vertical, rotated and handwritten text with 98.2% accuracy.',
    accent: 'green',
    type: 'generated',
  },
];

// ─── Icon helpers ─────────────────────────────────────────────────────────────
const getNotificationIcon = (type: NotifType) => {
  switch (type) {
    case 'comment':   return <MessageSquare size={12} />;
    case 'generated': return <Sparkles      size={12} />;
    case 'like':      return <Heart         size={12} />;
    case 'alert':     return <AlertCircle   size={12} />;
    case 'image':     return <ImageIcon     size={12} />;
    default:          return <Bell          size={12} />;
  }
};

// ─── Navbar ───────────────────────────────────────────────────────────────────
export const Navbar: React.FC = () => {
  const { isLoggedIn, userFullName, userAvatar, token, logout } = useAppStore();
  const navigate = useNavigate();

  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [accountMenuOpen,   setAccountMenuOpen]   = React.useState(false);
  const [notifications,     setNotifications]     = React.useState<Notification[]>([]);
  const [notifsLoading,     setNotifsLoading]     = React.useState(false);

  const notificationsRef = React.useRef<HTMLDivElement | null>(null);
  const accountMenuRef   = React.useRef<HTMLDivElement | null>(null);
  const fetchedRef       = React.useRef(false);

  const displayName  = getFirstName(userFullName, 'User');
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

  // ── Fetch real notifications from history when panel opens ────────────────
  React.useEffect(() => {
    if (!notificationsOpen) return;
    if (!isLoggedIn || !token) {
      setNotifications(GUEST_NOTIFICATIONS);
      return;
    }
    // Only fetch once per mount (re-fetch on explicit refresh not needed here)
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setNotifsLoading(true);
    getHistory(token, { tzOffsetMinutes: new Date().getTimezoneOffset() })
      .then((items: HistoryItem[]) => {
        const recent = items
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 6)
          .map((item, i) => historyToNotif(item, i));

        if (recent.length === 0) {
          // No history yet — show a helpful empty state notification
          setNotifications([{
            id: 'empty-1',
            title: 'No translations yet',
            time: 'just now',
            message: 'Head to Studio and upload your first image to get started.',
            accent: 'violet',
            type: 'generated',
          }]);
        } else {
          setNotifications(recent);
        }
      })
      .catch(() => {
        // If API fails, show a polite error notification
        setNotifications([{
          id: 'err-1',
          title: 'Could not load notifications',
          time: 'just now',
          message: 'Unable to fetch your translation history. Please try again later.',
          accent: 'coral',
          type: 'alert',
        }]);
      })
      .finally(() => setNotifsLoading(false));
  }, [notificationsOpen, isLoggedIn, token]);

  // Reset fetch cache when user logs out / logs in
  React.useEffect(() => {
    fetchedRef.current = false;
    setNotifications([]);
  }, [isLoggedIn, token]);

  // ── Click-outside / Escape handling ──────────────────────────────────────
  React.useEffect(() => {
    if (!accountMenuOpen && !notificationsOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!notificationsRef.current?.contains(t)) setNotificationsOpen(false);
      if (!accountMenuRef.current?.contains(t))   setAccountMenuOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNotificationsOpen(false); setAccountMenuOpen(false); }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown',   handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown',   handleEscape);
    };
  }, [accountMenuOpen, notificationsOpen]);

  const handleAccountAction = (path: string) => {
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    setNotificationsOpen(false);
    setAccountMenuOpen(false);
    navigate('/');
  };

  const handleNotificationToggle = () => {
    setNotificationsOpen(o => !o);
    setAccountMenuOpen(false);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <nav>
      <Link to="/" className="logo-wrap">
        <span className="lw-vie">VIE</span>
        <span className="lw-trans">TRANS</span>
      </Link>

      <div className="nl">
        <NavLink to="/"         end className={({ isActive }) => isActive ? 'on' : ''}>Overview</NavLink>
        <NavLink to="/studio"       className={({ isActive }) => isActive ? 'on' : ''}>Studio</NavLink>
        <NavLink to="/dashboard"    className={({ isActive }) => isActive ? 'on' : ''}>Dashboard</NavLink>
        <NavLink to="/docs"         className={({ isActive }) => isActive ? 'on' : ''}>API Docs</NavLink>
      </div>

      <div className="nr">
        <div className="nr-sig">System Operational</div>

        {isLoggedIn ? (
          <div className={`account-menu-wrap ${accountMenuOpen ? 'open' : ''}`} ref={accountMenuRef}>
            <button
              type="button"
              className="account-trigger"
              onClick={() => { setNotificationsOpen(false); setAccountMenuOpen(o => !o); }}
              title="Account menu"
              aria-label="Account menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="account-trigger-avatar">
                {userAvatar
                  ? <img src={userAvatar} alt={`${displayName} avatar`} className="account-menu-avatar-image" />
                  : avatarInitial}
              </span>
              <ChevronDown size={14} className="account-trigger-chevron" />
            </button>

            {accountMenuOpen && (
              <div className="account-dropdown" role="menu">
                <div className="account-dropdown-head">
                  <span className="account-dropdown-avatar">
                    {userAvatar
                      ? <img src={userAvatar} alt={`${displayName} avatar`} className="account-menu-avatar-image" />
                      : avatarInitial}
                  </span>
                  <span className="account-dropdown-name">{displayName}</span>
                </div>

                <div className="account-dropdown-list">
                  <button type="button" className="account-dropdown-item" onClick={() => handleAccountAction('/account')}>
                    <span className="account-dropdown-item-main">
                      <UserRound size={15} className="account-dropdown-icon" />
                      <span>Personal Information</span>
                    </span>
                  </button>
                  <button className="account-dropdown-item" type="button" onClick={() => handleAccountAction('/account/information')}>
                    <span className="account-dropdown-item-main">
                      <Info size={15} className="account-dropdown-icon" />
                      <span>Information</span>
                    </span>
                  </button>
                </div>

                <div className="account-dropdown-foot">
                  <button type="button" className="account-dropdown-item logout" onClick={handleLogout}>
                    <span className="account-dropdown-item-main">
                      <LogOut size={15} className="account-dropdown-icon" />
                      <span>Logout</span>
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button className="nr-ghost" onClick={() => navigate('/login')} title="Sign up / Login">
            Sign up / Login
          </button>
        )}

        {/* ── Notification bell ── */}
        <div className={`notification-wrap ${notificationsOpen ? 'open' : ''}`} ref={notificationsRef}>
          <button
            type="button"
            className="thm-btn"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            onClick={handleNotificationToggle}
          >
            <Bell size={22} />
            {/* Badge — only show when there are unread items */}
            {(isLoggedIn || notifications.length > 0) && (
              <span className="notification-badge" aria-hidden="true" />
            )}
          </button>

          {notificationsOpen && (
            <div className="notification-panel" role="dialog" aria-label="Notifications">
              {/* Header */}
              <div className="notification-panel-head">
                <h2>Notifications</h2>
                <div className="notification-filter-group" role="tablist" aria-label="Notification filters">
                  <button type="button" className="notification-filter-chip is-active">All</button>
                  {unreadCount > 0 && (
                    <span style={{
                      fontSize: '10px',
                      fontFamily: 'var(--mono)',
                      letterSpacing: '0.08em',
                      color: 'var(--blue)',
                      background: 'var(--blueG)',
                      padding: '2px 7px',
                      borderRadius: '99px',
                      fontWeight: 600,
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="notification-list">
                {notifsLoading ? (
                  /* Loading skeleton */
                  [1, 2, 3].map(i => (
                    <div key={i} className="notification-item" style={{ opacity: 0.5 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'var(--bg2)',
                        animation: 'notif-pulse 1.4s ease infinite',
                        flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ height: 12, width: '60%', borderRadius: 4, background: 'var(--bg2)', animation: 'notif-pulse 1.4s ease infinite' }} />
                        <div style={{ height: 10, width: '90%', borderRadius: 4, background: 'var(--bg2)', animation: 'notif-pulse 1.4s ease infinite 0.2s' }} />
                        <div style={{ height: 10, width: '75%', borderRadius: 4, background: 'var(--bg2)', animation: 'notif-pulse 1.4s ease infinite 0.4s' }} />
                      </div>
                    </div>
                  ))
                ) : (
                  notifications.map(item => (
                    <article className="notification-item" key={item.id}>
                      <div className={`notification-avatar notification-avatar-${item.accent}`}>
                        {item.type === 'image' ? <ImageIcon size={20} /> : <UserRound size={20} />}
                        <span className={`notification-avatar-mark notification-avatar-mark-${item.accent}`}>
                          {getNotificationIcon(item.type)}
                        </span>
                      </div>

                      <div className="notification-copy">
                        <div className="notification-copy-top">
                          <div className="notification-copy-head">
                            <strong>{item.title}</strong>
                            <span>{item.time}</span>
                          </div>
                          {!item.read && (
                            <span className="notification-status-dot" aria-hidden="true" />
                          )}
                        </div>
                        <p className="notification-message">{item.message}</p>
                        {item.detail && <p className="notification-detail">{item.detail}</p>}
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* Skeleton keyframe (scoped) */}
              <style>{`
                @keyframes notif-pulse {
                  0%,100% { opacity: 1; }
                  50% { opacity: 0.4; }
                }
              `}</style>
            </div>
          )}
        </div>

        <button
          type="button"
          className="thm-btn"
          title="Settings"
          aria-label="Settings"
          onClick={() => navigate('/account/settings')}
        >
          <Settings size={22} />
        </button>
      </div>
    </nav>
  );
};
