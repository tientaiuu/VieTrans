import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Heart, LogOut, MessageSquare, Settings, Sparkles, UserRound, History, Info } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { getFirstName } from '../../utils/user';

const notifications = [
  {
    id: 'notif-1',
    title: 'Account updated',
    time: '5m ago',
    message: 'Your account profile information was updated successfully.',
    detail: 'Full name and username changes have been saved to your local session.',
    accent: 'green',
    type: 'generated',
  },
  {
    id: 'notif-2',
    title: 'Translation failed',
    time: '12m ago',
    message: 'An error occurred while translating your uploaded image.',
    detail: 'Please try again or upload a clearer image to improve text detection.',
    accent: 'coral',
    type: 'comment',
  },
  {
    id: 'notif-3',
    title: 'Theme saved',
    time: '18m ago',
    message: 'The theme setting was updated successfully.',
    detail: 'Dark mode will now be applied across the workspace after saving settings.',
    accent: 'violet',
    type: 'generated',
  },
  {
    id: 'notif-4',
    title: 'History preference updated',
    time: '32m ago',
    message: 'Auto-save translation history was updated successfully.',
    detail: 'New translation results will follow your latest history preference.',
    accent: 'gold',
    type: 'generated',
  },
  {
    id: 'notif-5',
    title: 'Notification setting saved',
    time: '1h ago',
    message: 'Email notifications were updated successfully.',
    detail: 'You can return to Settings at any time to change delivery preferences.',
    accent: 'lavender',
    type: 'generated',
  },
];

export const Navbar: React.FC = () => {
  const { isLoggedIn, userFullName, userAvatar, logout } = useAppStore();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const notificationsRef = React.useRef<HTMLDivElement | null>(null);
  const accountMenuRef = React.useRef<HTMLDivElement | null>(null);
  const displayName = getFirstName(userFullName, 'User');
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

  React.useEffect(() => {
    if (!accountMenuOpen && !notificationsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedNotificationPanel = notificationsRef.current?.contains(target);
      const clickedAccountMenu = accountMenuRef.current?.contains(target);

      if (!clickedNotificationPanel) {
        setNotificationsOpen(false);
      }

      if (!clickedAccountMenu) {
        setAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
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
    setNotificationsOpen((open) => !open);
    setAccountMenuOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageSquare size={12} />;
      case 'generated':
        return <Sparkles size={12} />;
      case 'like':
        return <Heart size={12} />;
      default:
        return <Bell size={12} />;
    }
  };

  return (
    <nav>
      <Link to="/" className="logo-wrap">
        <span className="lw-vie">VIE</span>
        <span className="lw-trans">TRANS</span>
      </Link>

      <div className="nl">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'on' : ''}>Overview</NavLink>
        <NavLink to="/studio" className={({ isActive }) => isActive ? 'on' : ''}>Studio</NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'on' : ''}>Dashboard</NavLink>
        <NavLink to="/docs" className={({ isActive }) => isActive ? 'on' : ''}>API Docs</NavLink>
      </div>

      <div className="nr">
        <div className="nr-sig">System Operational</div>

        {isLoggedIn ? (
          <div className={`account-menu-wrap ${accountMenuOpen ? 'open' : ''}`} ref={accountMenuRef}>
            <button
              type="button"
              className="account-trigger"
              onClick={() => {
                setNotificationsOpen(false);
                setAccountMenuOpen((open) => !open);
              }}
              title="Account menu"
              aria-label="Account menu"
              aria-expanded={accountMenuOpen}
            >
              <span className="account-trigger-avatar">
                {userAvatar ? (
                  <img src={userAvatar} alt={`${displayName} avatar`} className="account-menu-avatar-image" />
                ) : (
                  avatarInitial
                )}
              </span>
              <ChevronDown size={14} className="account-trigger-chevron" />
            </button>

            {accountMenuOpen && (
              <div className="account-dropdown" role="menu">
                <div className="account-dropdown-head">
                  <span className="account-dropdown-avatar">
                    {userAvatar ? (
                      <img src={userAvatar} alt={`${displayName} avatar`} className="account-menu-avatar-image" />
                    ) : (
                      avatarInitial
                    )}
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
                  <button className="account-dropdown-item" type="button" onClick={() => handleAccountAction('/account/activity-history')}>
                    <span className="account-dropdown-item-main">
                      <History size={15} className="account-dropdown-icon" />
                      <span>Activity History</span>
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
          <button
            className="nr-ghost"
            onClick={() => navigate('/login')}
            title="Sign up / Login"
          >
            Sign up / Login
          </button>
        )}

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
            <span className="notification-badge" aria-hidden="true" />
          </button>

          {notificationsOpen && (
            <div className="notification-panel" role="dialog" aria-label="Notifications">
              <div className="notification-panel-head">
                <h2>Notifications</h2>
                <div className="notification-filter-group" role="tablist" aria-label="Notification filters">
                  <button type="button" className="notification-filter-chip is-active">All</button>
                </div>
              </div>

              <div className="notification-list">
                {notifications.map((item) => (
                  <article className="notification-item" key={item.id}>
                    <div className={`notification-avatar notification-avatar-${item.accent}`}>
                      <UserRound size={20} />
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
                        <span className="notification-status-dot" aria-hidden="true" />
                      </div>

                      <p className="notification-message">{item.message}</p>
                      {item.detail ? <p className="notification-detail">{item.detail}</p> : null}
                    </div>
                  </article>
                ))}
              </div>
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
