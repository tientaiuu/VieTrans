import React from 'react';
import { Bell, MoonStar, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { AccountSidebarNav } from './AccountSidebarNav';

export const SettingsPage: React.FC = () => {
  const {
    logout,
    isLoggedIn,
    theme,
    emailNotifications,
    autoSaveHistory,
    defaultOutputFormat,
    updateSettings,
  } = useAppStore();
  const navigate = useNavigate();
  const [draftTheme, setDraftTheme] = React.useState(theme);
  const [draftEmailNotifications, setDraftEmailNotifications] = React.useState(emailNotifications);
  const [draftAutoSaveHistory, setDraftAutoSaveHistory] = React.useState(autoSaveHistory);
  const [draftDefaultOutputFormat, setDraftDefaultOutputFormat] = React.useState(defaultOutputFormat);

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  React.useEffect(() => {
    setDraftTheme(theme);
    setDraftEmailNotifications(emailNotifications);
    setDraftAutoSaveHistory(autoSaveHistory);
    setDraftDefaultOutputFormat(defaultOutputFormat);
  }, [theme, emailNotifications, autoSaveHistory, defaultOutputFormat]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSaveSettings = () => {
    updateSettings({
      theme: draftTheme,
      emailNotifications: draftEmailNotifications,
      autoSaveHistory: draftAutoSaveHistory,
      defaultOutputFormat: draftDefaultOutputFormat,
    });
  };

  return (
    <div className="account-page fup">
      <div className="account-shell">
        <div className="account-layout">
          <AccountSidebarNav activeSection="settings" onLogout={handleLogout} />

          <div className="account-main">
            <section className="account-hero">
              <div className="account-hero-grid">
                <div className="account-profile-copy">
                  <div className="account-pill-row">
                    <span className="account-eyebrow">Workspace settings</span>
                    <span className="account-status-pill">
                      <ShieldCheck size={14} />
                      Saved locally
                    </span>
                  </div>

                  <h1 className="account-title">Settings</h1>
                </div>

                <div className="account-hero-note">
                  <span className="account-note-label">Control</span>
                  <p>Manage appearance, notifications, and default studio behavior for your account.</p>
                </div>
              </div>
            </section>

            <section className="account-content-wrap">
              <div className="account-settings-grid">
                <div className="account-panel account-panel-main account-panel-unified">
                  <div className="account-panel-head">
                    <div>
                      <h2>Experience</h2>
                    </div>
                  </div>

                  <div className="account-settings-list">
                    <div className="account-setting-item">
                      <div className="account-setting-copy">
                        <span className="account-setting-icon"><MoonStar size={16} /></span>
                        <div>
                          <div className="account-setting-title">Theme</div>
                          <p className="account-setting-desc">Choose how the interface looks while working in VieTrans.</p>
                        </div>
                      </div>
                      <select
                        className="account-setting-select"
                        value={draftTheme}
                        onChange={(event) => setDraftTheme(event.target.value as 'light' | 'dark')}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>

                    <div className="account-setting-item">
                      <div className="account-setting-copy">
                        <span className="account-setting-icon"><Sparkles size={16} /></span>
                        <div>
                          <div className="account-setting-title">Default output format</div>
                          <p className="account-setting-desc">Set the format used when you export or save translated results.</p>
                        </div>
                      </div>
                      <select
                        className="account-setting-select"
                        value={draftDefaultOutputFormat}
                        onChange={(event) => setDraftDefaultOutputFormat(event.target.value as 'png' | 'jpg' | 'webp')}
                      >
                        <option value="png">PNG</option>
                        <option value="jpg">JPG</option>
                        <option value="webp">WebP</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="account-panel account-panel-main account-panel-unified">
                  <div className="account-panel-head">
                    <div>
                      <h2>Notifications & History</h2>
                    </div>
                  </div>

                  <div className="account-settings-list">
                    <label className="account-setting-item is-toggle">
                      <div className="account-setting-copy">
                        <span className="account-setting-icon"><Bell size={16} /></span>
                        <div>
                          <div className="account-setting-title">Email notifications</div>
                          <p className="account-setting-desc">Receive updates when processing batches or account events change.</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="account-setting-checkbox"
                        checked={draftEmailNotifications}
                        onChange={(event) => setDraftEmailNotifications(event.target.checked)}
                      />
                    </label>

                    <label className="account-setting-item is-toggle">
                      <div className="account-setting-copy">
                        <span className="account-setting-icon"><ShieldCheck size={16} /></span>
                        <div>
                          <div className="account-setting-title">Auto-save translation history</div>
                          <p className="account-setting-desc">Keep processed images and their metadata available in your account history.</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="account-setting-checkbox"
                        checked={draftAutoSaveHistory}
                        onChange={(event) => setDraftAutoSaveHistory(event.target.checked)}
                      />
                    </label>
                  </div>

                  <div className="account-save-row">
                    <button className="account-save-btn" type="button" onClick={handleSaveSettings}>
                      Save settings
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
