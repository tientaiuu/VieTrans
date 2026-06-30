import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getFirstName } from '../../utils/user';
import { AccountSidebarNav } from './AccountSidebarNav';
import { changePassword } from '../../api';
import { toast } from '../../stores/useToastStore';

export const AccountPage: React.FC = () => {
  const { logout, userFullName, userEmail, userUsername, userAvatar, setUserAvatar, updateProfile, isLoggedIn, token } = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const displayName = userFullName || 'Guest User';
  const shortDisplayName = getFirstName(userFullName, 'Guest');
  const displayEmail = userEmail || 'No email available';
  const avatarInitial = shortDisplayName.trim().charAt(0).toUpperCase() || 'U';
  const username = userUsername || (userEmail ? userEmail.split('@')[0] : 'guest');
  const [draftFullName, setDraftFullName] = React.useState(displayName);
  const [draftUsername, setDraftUsername] = React.useState(username);

  // Change password form
  const [showChangePw, setShowChangePw] = React.useState(false);
  const [currentPw, setCurrentPw] = React.useState('');
  const [newPw, setNewPw] = React.useState('');
  const [confirmPw, setConfirmPw] = React.useState('');
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [pwLoading, setPwLoading] = React.useState(false);
  const [pwError, setPwError] = React.useState('');

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  React.useEffect(() => {
    setDraftFullName(displayName);
    setDraftUsername(username);
  }, [displayName, username]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAvatarPicker = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      setUserAvatar(result);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSaveProfile = () => {
    updateProfile({
      fullName: draftFullName.trim() || 'Guest User',
      username: draftUsername.trim().replace(/^@+/, '') || 'guest',
    });
    toast.success('Profile saved successfully');
  };

  const handleChangePassword = async () => {
    setPwError('');
    if (!currentPw) { setPwError('Please enter your current password'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    if (!token) { setPwError('Not authenticated'); return; }

    setPwLoading(true);
    try {
      await changePassword(token, currentPw, newPw);
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setShowChangePw(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Change password failed';
      setPwError(msg);
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-shell">
        <div className="account-layout">
          <AccountSidebarNav activeSection="profile" onLogout={handleLogout} />

          <div className="account-main">
            <section className="account-hero">
              <div className="account-hero-grid">
                <div className="account-profile-block">
                  <div className="account-avatar-stack">
                    <div className="account-avatar">
                      {userAvatar ? (
                        <img src={userAvatar} alt={`${displayName} avatar`} className="account-avatar-image" />
                      ) : (
                        avatarInitial
                      )}
                    </div>
                    <button
                      type="button"
                      className="account-avatar-upload"
                      onClick={handleAvatarPicker}
                      aria-label="Upload avatar"
                      title="Upload avatar"
                    >
                      <Plus size={16} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="account-avatar-input"
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="account-profile-copy">
                    <div className="account-pill-row">
                      <span className="account-eyebrow">VieTrans account</span>
                      <span className="account-status-pill">
                        <BadgeCheck size={14} />
                        Active session
                      </span>
                    </div>

                    <h1 className="account-title">{shortDisplayName}</h1>
                  </div>
                </div>

                <div className="account-hero-note">
                  <span className="account-note-label">Overview</span>
                  <p>
                    Welcome to account page, {shortDisplayName}!
                  </p>
                </div>
              </div>
            </section>

            <section className="account-content-wrap">
              <div className="account-panel account-panel-main account-panel-unified">
                <div className="account-panel-head">
                  <div>
                    <h2>Account details</h2>
                  </div>
                </div>

                <div className="account-info-grid">
                  <div className="account-info-item">
                    <span className="account-info-label">Full name</span>
                    <div className="account-info-card is-editable">
                      <input
                        className="account-info-input"
                        value={draftFullName}
                        onChange={(event) => setDraftFullName(event.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                  </div>

                  <div className="account-info-item">
                    <span className="account-info-label">Email</span>
                    <div className="account-info-card is-disabled">
                      <strong title={displayEmail}>{displayEmail}</strong>
                    </div>
                  </div>

                  <div className="account-info-item">
                    <span className="account-info-label">Username</span>
                    <div className="account-info-card is-editable">
                      <input
                        className="account-info-input"
                        value={draftUsername}
                        onChange={(event) => setDraftUsername(event.target.value.replace(/^@+/, ''))}
                        placeholder="Username"
                      />
                    </div>
                  </div>

                  <div className="account-info-item">
                    <span className="account-info-label">Status</span>
                    <div className="account-info-card is-disabled">
                      <strong title="Signed in">Signed in</strong>
                    </div>
                  </div>
                </div>

                <div className="account-actions">
                  {/* Change password section */}
                  {!showChangePw ? (
                    <div
                      className="account-inline-line"
                      role="button"
                      tabIndex={0}
                      aria-label="Change password"
                      onClick={() => setShowChangePw(true)}
                      onKeyDown={e => e.key === 'Enter' && setShowChangePw(true)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>Change password</span>
                      <span style={{ fontSize: '11px', color: 'var(--blue)', fontWeight: 600, marginLeft: 'auto' }}>Change →</span>
                    </div>
                  ) : (
                    <div style={{
                      borderRadius: '12px',
                      border: '1px solid var(--ln)',
                      background: 'var(--bg)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>Change Password</div>

                      {/* Current password */}
                      <div>
                        <label className="account-info-label" style={{ display: 'block', marginBottom: '6px' }}>Current password</label>
                        <div className="auth-input-wrap">
                          <input
                            className="auth-input account-info-input"
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            placeholder="Enter current password"
                            disabled={pwLoading}
                          />
                          <button type="button" className="auth-visibility" onClick={() => setShowCurrent(v => !v)} aria-label="Toggle">
                            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* New password */}
                      <div>
                        <label className="account-info-label" style={{ display: 'block', marginBottom: '6px' }}>New password</label>
                        <div className="auth-input-wrap">
                          <input
                            className="auth-input account-info-input"
                            type={showNew ? 'text' : 'password'}
                            value={newPw}
                            onChange={e => setNewPw(e.target.value)}
                            placeholder="Min. 8 characters"
                            disabled={pwLoading}
                          />
                          <button type="button" className="auth-visibility" onClick={() => setShowNew(v => !v)} aria-label="Toggle">
                            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm password */}
                      <div>
                        <label className="account-info-label" style={{ display: 'block', marginBottom: '6px' }}>Confirm new password</label>
                        <input
                          className="auth-input account-info-input"
                          type="password"
                          value={confirmPw}
                          onChange={e => setConfirmPw(e.target.value)}
                          placeholder="Repeat new password"
                          disabled={pwLoading}
                        />
                      </div>

                      {pwError && (
                        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>{pwError}</div>
                      )}

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="account-save-btn"
                          onClick={handleChangePassword}
                          disabled={pwLoading}
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          {pwLoading ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
                          {pwLoading ? 'Saving...' : 'Update Password'}
                        </button>
                        <button
                          type="button"
                          style={{
                            padding: '10px 16px', borderRadius: '10px',
                            border: '1px solid var(--ln)', background: 'transparent',
                            color: 'var(--ink4)', cursor: 'pointer', fontSize: '13px',
                          }}
                          onClick={() => { setShowChangePw(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="account-save-row">
                  <button className="account-save-btn" type="button" onClick={handleSaveProfile}>
                    Save
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
