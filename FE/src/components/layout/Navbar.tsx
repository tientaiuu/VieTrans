import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, ChevronDown, LogOut, UserRound, History, Settings, Info } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { getFirstName } from '../../utils/user';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme, isLoggedIn, userFullName, userAvatar, logout } = useAppStore();
  const navigate = useNavigate();
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const accountMenuRef = React.useRef<HTMLDivElement | null>(null);
  const displayName = getFirstName(userFullName, 'User');
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || 'U';

  React.useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [accountMenuOpen]);

  const handleAccountAction = (path: string) => {
    setAccountMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    setAccountMenuOpen(false);
    navigate('/');
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
        <button 
          className="thm-btn" 
          onClick={toggleTheme} 
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {isLoggedIn ? (
          <div className={`account-menu-wrap ${accountMenuOpen ? 'open' : ''}`} ref={accountMenuRef}>
            <button
              type="button"
              className="account-trigger"
              onClick={() => setAccountMenuOpen((open) => !open)}
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
                  <button className="account-dropdown-item" type="button">
                    <span className="account-dropdown-item-main">
                      <Settings size={15} className="account-dropdown-icon" />
                      <span>Settings</span>
                    </span>
                  </button>
                  <button className="account-dropdown-item" type="button">
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
        <Link to="/studio" className="nr-btn">Open Studio</Link>
      </div>
    </nav>
  );
};
