import React from 'react';
import { CalendarDays, Clock3, Download, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { AccountSidebarNav } from './AccountSidebarNav';
import { getHistory, deleteHistory, type HistoryItem, imageUrl } from '../../api';
import { toast } from '../../stores/useToastStore';

export const ActivityHistoryPage: React.FC = () => {
  const { logout, isLoggedIn, token } = useAppStore();
  const navigate = useNavigate();
  const [histories, setHistories] = React.useState<HistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isLoggedIn || !token) {
      navigate('/login');
    } else {
      getHistory(token)
        .then(data => setHistories(data))
        .catch((err) => {
          console.error(err);
          // If token is expired/unauthorized
          if (err.message.includes('history')) {
            logout();
            navigate('/login');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isLoggedIn, navigate, token, logout]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDownload = (url: string, filename: string) => {
    // Append download=true to the URL to trigger Content-Disposition: attachment
    const downloadUrl = url + (url.includes('?') ? '&' : '?') + 'download=true';
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDelete = async () => {
    if (!token || !itemToDelete) return;
    try {
      await deleteHistory(itemToDelete, token);
      setHistories(prev => prev.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
      toast.success('Translation deleted');
    } catch (err) {
      console.error('Failed to delete history:', err);
      toast.error('Failed to delete — please try again');
      setItemToDelete(null);
    }
  };

  return (
    <div className="account-page activity-history-page relative">
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
                {loading ? (
                  // Skeleton UI
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                    {[1,2,3].map(i => (
                      <div key={i} style={{
                        borderRadius: '14px', border: '1px solid var(--ln)',
                        background: 'var(--paper)', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '12px',
                      }}>
                        <div style={{ height: '12px', width: '40%', borderRadius: '6px', background: 'var(--bg2)', animation: 'sk-pulse 1.4s ease infinite' }} />
                        <div style={{ height: '140px', borderRadius: '10px', background: 'var(--bg2)', animation: 'sk-pulse 1.4s ease infinite 0.1s' }} />
                        <div style={{ height: '36px', width: '60%', borderRadius: '8px', background: 'var(--bg2)', animation: 'sk-pulse 1.4s ease infinite 0.2s' }} />
                      </div>
                    ))}
                    <style>{`@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                  </div>
                ) : histories.length === 0 ? (
                  <div className="p-8 text-center text-white/50">No translation history found.</div>
                ) : histories.map((item) => {
                  const date = new Date(item.created_at);
                  const formattedDate = date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                  return (
                    <article className="activity-card" key={item.id}>
                      <div className="activity-card-top">
                        <div className="activity-card-meta">
                          <span className="activity-language-pill">English → Vietnamese</span>
                          <span className="activity-meta-dot" aria-hidden="true" />
                          <span className="activity-meta-time">
                            <Clock3 size={14} />
                            {formattedDate}
                          </span>
                        </div>
                      </div>

                      <div className="activity-card-media" style={{ height: '160px', padding: '0', display: 'flex', gap: '8px' }}>
                        <div className="flex-1 rounded-lg overflow-hidden bg-black/20 flex flex-col relative">
                          <img src={imageUrl(item.stages.input)} className="w-full h-full object-cover opacity-80" alt="Original" />
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 text-white text-xs rounded">Original</span>
                        </div>
                        <div className="flex-1 rounded-lg overflow-hidden bg-black/20 flex flex-col relative border border-[#0A84FF]/20">
                          <img src={imageUrl(item.stages.fuse)} className="w-full h-full object-cover" alt="Translated" />
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-[#0A84FF] text-white text-xs rounded font-medium">Translated</span>
                        </div>
                      </div>

                      <div className="activity-card-actions">
                        <button type="button" className="activity-primary-action" onClick={() => window.open(imageUrl(item.stages.fuse), '_blank')}>
                          <Eye size={16} />
                          <span>View Image</span>
                        </button>

                        <div className="activity-secondary-actions">
                          <button type="button" className="activity-secondary-action" onClick={() => handleDownload(imageUrl(item.stages.fuse), `vietrans-${item.id}.jpg`)}>
                            <Download size={16} />
                            <span>Download</span>
                          </button>
                          <button type="button" className="activity-icon-action" aria-label="Delete restoration log" onClick={() => handleDeleteClick(item.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Premium Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
            onClick={() => setItemToDelete(null)}
          ></div>
          <div className="relative bg-[#1C1C1E]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-[360px] shadow-[0_0_50px_rgba(0,0,0,0.5)] transform scale-100 opacity-100 transition-all duration-300 animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Trash2 className="text-red-500" size={26} />
              </div>
              <h3 className="text-[17px] font-medium text-white/90 mb-8 tracking-tight leading-relaxed">
                Are you sure you want to delete this history item?
              </h3>
              
              <div className="flex gap-3 w-full">
                <button 
                  type="button"
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all duration-200 border border-white/5 hover:border-white/10"
                  onClick={() => setItemToDelete(null)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 font-medium transition-all duration-200 shadow-[0_4px_14px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_20px_rgba(239,68,68,0.4)]"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityHistoryPage;
