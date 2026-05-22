import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { resetPassword } from '../../api';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // API state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsOpen(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      navigate('/login');
    }, 300);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      setSuccess(res.message);
      // Wait a moment then redirect to login
      setTimeout(() => {
        close();
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-overlay ${isOpen ? 'open' : ''}`}>
      <div className="auth-box" role="dialog" aria-modal="true">
        <button
          type="button"
          className="auth-close"
          aria-label="Close"
          onClick={close}
          disabled={loading}
        >
          <X size={24} />
        </button>

        <div className="auth-head">
          <div className="logo-wrap auth-logo" aria-label="Vie Trans">
            <span className="lw-vie">VIE</span>
            <span className="lw-trans">TRANS</span>
          </div>

          <div className="auth-copy">
            <h3>Reset Password</h3>
            <p>Enter your new password below</p>
          </div>
        </div>

        {/* Status messages */}
        {error && (
          <div className="auth-message auth-message-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="auth-message auth-message-success">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {/* If no token is provided, show an error early instead of the form */}
        {!token ? (
          <div className="auth-message auth-message-error" style={{ marginBottom: '24px' }}>
            <AlertCircle size={16} />
            <span>Missing reset token. Please use the link from your email.</span>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-label">New Password</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-visibility"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <label className="auth-label">Confirm New Password</label>
            <div className="auth-input-wrap">
              <input
                className="auth-input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="auth-visibility"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Resetting Password...</span>
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
