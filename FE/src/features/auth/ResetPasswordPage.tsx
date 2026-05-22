import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!token) {
    return (
      <div className="auth-wrap fup" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="auth-card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2 className="auth-title">Invalid Link</h2>
          <p style={{ color: 'var(--ink4)', marginBottom: 24 }}>
            This password reset link is invalid or has expired.
          </p>
          <button className="auth-submit" onClick={() => navigate('/login')}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrap fup" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className={`auth-card ${isOpen ? 'open' : ''}`} style={{ maxWidth: 420, width: '100%' }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 className="auth-title">Password Reset!</h2>
            <p style={{ color: 'var(--ink4)', marginBottom: 8 }}>
              Your password has been updated successfully.
            </p>
            <p style={{ color: 'var(--ink4)', fontSize: 13 }}>
              Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
              <h2 className="auth-title">Set New Password</h2>
              <p style={{ color: 'var(--ink4)', fontSize: 14 }}>
                Enter your new password below.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-field">
                <label className="auth-label">New Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="auth-error">{error}</div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Reset Password'}
              </button>

              <button
                type="button"
                className="auth-link-btn"
                onClick={() => navigate('/login')}
                style={{ marginTop: 12 }}
              >
                ← Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
