import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { resetPassword } from '../../api';

const MIN_PASSWORD_LENGTH = 8;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const passwordReady = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = Boolean(confirmPassword) && newPassword === confirmPassword;
  const canSubmit = passwordReady && passwordsMatch && !isLoading;

  const helperText = useMemo(() => {
    if (!newPassword) return `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`;
    if (!passwordReady) return `Password needs at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirmPassword && !passwordsMatch) return 'Passwords do not match yet.';
    return 'Password is ready to update.';
  }, [confirmPassword, newPassword, passwordReady, passwordsMatch]);

  useEffect(() => {
    const id = requestAnimationFrame(() => setIsOpen(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const goToLogin = () => navigate('/login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordReady) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
      window.setTimeout(() => navigate('/login'), 1800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password. The link may have expired.';
      setError(
        message.toLowerCase().includes('invalid or expired')
          ? 'This reset link has expired or was already used. Please request a new reset link.'
          : message
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-overlay open" style={{ pointerEvents: 'auto' }}>
      <div
        className={`auth-panel ${isOpen ? 'open' : 'closed'}`}
        style={{ width: 'min(460px, 100%)' }}
        role="dialog"
        aria-modal="true"
      >
        <button className="auth-close" onClick={goToLogin} aria-label="Back to login">
          <ArrowLeft size={18} strokeWidth={2.4} />
        </button>

        <div className="auth-head">
          <div className="logo-wrap auth-logo" aria-label="Vie Trans">
            <span className="lw-vie">VIE</span>
            <span className="lw-trans">TRANS</span>
          </div>

          <div className="auth-copy">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: 'var(--blueG)',
                color: 'var(--blue)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {success ? <CheckCircle2 size={23} /> : token ? <KeyRound size={23} /> : <AlertCircle size={23} />}
            </div>
            <h3>{success ? 'Password updated' : token ? 'Create a new password' : 'Reset link unavailable'}</h3>
          </div>
        </div>

        {!token ? (
          <>
            <div className="auth-message auth-message-error">
              <AlertCircle size={16} />
              <span>This password reset link is invalid or has expired.</span>
            </div>
            <button className="auth-submit" onClick={goToLogin}>
              Back to login
            </button>
          </>
        ) : success ? (
          <>
            <div className="auth-message auth-message-success">
              <CheckCircle2 size={16} />
              <span>Your password has been updated successfully.</span>
            </div>
            <p className="auth-alt-copy">
              You can now sign in with your new password. Redirecting to login in a moment.
            </p>
            <button className="auth-submit" onClick={goToLogin}>
              Sign in now
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <p className="auth-alt-copy" style={{ marginTop: 0 }}>
              Choose a password you have not used before. The reset link can only be used once.
            </p>

            <label className="auth-label">New password</label>
            <div className="auth-input-wrap">
              <input
                type={showNewPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                disabled={isLoading}
              />
              <button
                type="button"
                className="auth-visibility"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowNewPassword((value) => !value)}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label className="auth-label">Confirm password</label>
            <div className="auth-input-wrap">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Repeat the new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="auth-visibility"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div
              className={canSubmit ? 'auth-message auth-message-success' : 'auth-alt-copy'}
              style={{ marginBottom: error ? 0 : 8 }}
            >
              {canSubmit ? <ShieldCheck size={16} /> : null}
              <span>{helperText}</span>
            </div>

            {error && (
              <div className="auth-message auth-message-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={!canSubmit}>
              {isLoading ? <Loader2 size={20} className="auth-spinner" /> : 'Update password'}
            </button>

            <div className="auth-bottom">
              <span>Remember your password?</span>
              <button type="button" className="link-like" onClick={goToLogin}>
                Back to login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
