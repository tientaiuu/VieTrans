import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Info, LogOut, Settings, UserRound } from 'lucide-react';

type AccountSection = 'profile' | 'history';

type AccountSidebarNavProps = {
  activeSection: AccountSection;
  onLogout: () => void;
};

export const AccountSidebarNav: React.FC<AccountSidebarNavProps> = ({ activeSection, onLogout }) => {
  const navigate = useNavigate();

  return (
    <aside className="account-sidebar">
      <div className="account-sidebar-panel">
        <div className="account-sidebar-head">
          <span className="account-sidebar-title">Account panel</span>
        </div>

        <div className="account-sidebar-list">
          <button
            type="button"
            className={`account-sidebar-item ${activeSection === 'profile' ? 'is-active' : ''}`}
            onClick={() => navigate('/account')}
          >
            <span className="account-sidebar-item-main">
              <UserRound size={15} />
              <span>Personal information</span>
            </span>
          </button>

          <button
            type="button"
            className={`account-sidebar-item ${activeSection === 'history' ? 'is-active' : ''}`}
            onClick={() => navigate('/account/activity-history')}
          >
            <span className="account-sidebar-item-main">
              <History size={15} />
              <span>Activity history</span>
            </span>
          </button>

          <button type="button" className="account-sidebar-item">
            <span className="account-sidebar-item-main">
              <Settings size={15} />
              <span>Settings</span>
            </span>
          </button>

          <button type="button" className="account-sidebar-item">
            <span className="account-sidebar-item-main">
              <Info size={15} />
              <span>Information</span>
            </span>
          </button>

          <button type="button" className="account-sidebar-item account-sidebar-item-logout" onClick={onLogout}>
            <span className="account-sidebar-item-main">
              <LogOut size={15} />
              <span>Logout</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AccountSidebarNav;
