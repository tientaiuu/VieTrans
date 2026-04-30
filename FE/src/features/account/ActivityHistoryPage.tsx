import React from 'react';
import { CalendarDays, Clock3, Download, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { AccountSidebarNav } from './AccountSidebarNav';

type ArchiveItem = {
  id: string;
  language: string;
  timestamp: string;
  originalClassName: string;
  restoredClassName: string;
};

const archiveItems: ArchiveItem[] = [
  {
    id: 'manual-page-42',
    language: 'English → Vietnamese',
    timestamp: 'Oct 24, 2024 · 14:22 PM',
    originalClassName: 'activity-thumb-manual-original',
    restoredClassName: 'activity-thumb-manual-restored',
  },
  {
    id: 'shinjuku-wayfinding',
    language: 'English → Vietnamese',
    timestamp: 'Oct 22, 2024 · 09:10 AM',
    originalClassName: 'activity-thumb-sign-original',
    restoredClassName: 'activity-thumb-sign-restored',
  },
];

export const ActivityHistoryPage: React.FC = () => {
  const { logout, isLoggedIn } = useAppStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="account-page activity-history-page fup">
      <div className="account-shell">
        <div className="account-layout">
          <AccountSidebarNav activeSection="history" onLogout={handleLogout} />

          <div className="account-main">
            <section className="activity-archive">
              <div className="activity-archive-head">
                <div className="activity-archive-copy">
                  <h1 className="activity-archive-title">Translation History</h1>
                </div>

                <div className="activity-archive-tools">
                  <div className="activity-filter-group" role="tablist" aria-label="Archive type">
                    <button type="button" className="activity-filter-chip is-active">All</button>
                    <button type="button" className="activity-filter-chip">
                      <span>Filter</span>
                      <CalendarDays size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="activity-archive-list">
                {archiveItems.map((item) => (
                  <article className="activity-card" key={item.id}>
                    <div className="activity-card-top">
                      <div className="activity-card-meta">
                        <span className="activity-language-pill">{item.language}</span>
                        <span className="activity-meta-dot" aria-hidden="true" />
                        <span className="activity-meta-time">
                          <Clock3 size={14} />
                          {item.timestamp}
                        </span>
                      </div>
                    </div>

                    <div className="activity-card-media">
                      <div className={`activity-thumb ${item.originalClassName}`}>
                        <span className="activity-thumb-label">Original</span>
                      </div>
                      <div className={`activity-thumb ${item.restoredClassName}`}>
                        <span className="activity-thumb-label is-restored">Translated</span>
                      </div>
                    </div>

                    <div className="activity-card-actions">
                      <button type="button" className="activity-primary-action">
                        <Eye size={16} />
                        <span>View Details</span>
                      </button>

                      <div className="activity-secondary-actions">
                        <button type="button" className="activity-secondary-action">
                          <Download size={16} />
                          <span>Download</span>
                        </button>
                        <button type="button" className="activity-icon-action" aria-label="Delete restoration log">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistoryPage;
