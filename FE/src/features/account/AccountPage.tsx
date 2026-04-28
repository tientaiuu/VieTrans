import React from 'react';
import { useAppStore } from '../../stores/useAppStore';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, History, Info, LogOut, Plus, Settings, UserRound } from 'lucide-react';
import { getFirstName } from '../../utils/user';

export const AccountPage: React.FC = () => {
  const { logout, userFullName, userEmail, userUsername, userAvatar, setUserAvatar, updateProfile, isLoggedIn } = useAppStore();
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const displayName = userFullName || 'Guest User';
  const shortDisplayName = getFirstName(userFullName, 'Guest');
  const displayEmail = userEmail || 'No email available';
  const avatarInitial = shortDisplayName.trim().charAt(0).toUpperCase() || 'U';
  const username = userUsername || (userEmail ? userEmail.split('@')[0] : 'guest');
  const [draftFullName, setDraftFullName] = React.useState(displayName);
  const [draftUsername, setDraftUsername] = React.useState(username);

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
  };

  return (
    <div className="account-page fup">
      <div className="account-shell">
        <div className="account-layout">
          <aside className="account-sidebar">
            <div className="account-sidebar-panel">
              <div className="account-sidebar-head">
                <span className="account-sidebar-title">Account menu</span>
              </div>

              <div className="account-sidebar-list">
                <button type="button" className="account-sidebar-item is-active">
                  <span className="account-sidebar-item-main">
                    <UserRound size={15} />
                    <span>Personal information</span>
                  </span>
                </button>

                <button type="button" className="account-sidebar-item">
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

                <button type="button" className="account-sidebar-item account-sidebar-item-logout" onClick={handleLogout}>
                  <span className="account-sidebar-item-main">
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </span>
                </button>
              </div>
            </div>
          </aside>

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
                  <div className="account-inline-line" aria-label="Change password">
                    <span>Change password</span>
                  </div>
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
