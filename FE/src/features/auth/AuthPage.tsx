import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const AuthPage: React.FC = () => {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  const referrerPath = (location.state as { from?: string } | null)?.from || '/';
  const initialTab = location.pathname === '/signup' ? 'signup' : 'login';

  const [tab, setTab] = useState<'login' | 'signup'>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    setTab(location.pathname === '/signup' ? 'signup' : 'login');
    setIsOpen(true);
  }, [location.pathname]);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      navigate(referrerPath);
    }, 300);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(tab === 'login' ? 'Signing in' : 'Signing up', email, rememberMe);

    if (tab === 'signup') {
      setIsOpen(false);
      setTimeout(() => {
        navigate('/login', { state: { from: referrerPath }, replace: true });
      }, 300);
      return;
    }

    login(fullName || 'User', email);
    setIsOpen(false);
    setTimeout(() => {
      navigate(referrerPath);
    }, 300);
  };

  return (
    <div className={`auth-overlay ${isOpen ? 'open' : 'closed'}`} onClick={close}>
      <div
        className={`auth-panel ${isOpen ? 'open' : 'closed'}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="auth-close" onClick={close} aria-label="Close">
          <X size={20} strokeWidth={2.4} />
        </button>

        <div className="auth-head">
          <div className="logo-wrap auth-logo" aria-label="Vie Trans">
            <span className="lw-vie">VIE</span>
            <span className="lw-trans">TRANS</span>
          </div>

          <div className="auth-copy">
            <h3>{tab === 'login' ? 'Nice to see you again' : 'Welcome to VieTrans'}</h3>
          </div>
        </div>

        <form className="auth-form" onSubmit={submit} noValidate>
          {tab === 'signup' && (
            <>
              <label className="auth-label">Full Name</label>
              <input
                className="auth-input"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </>
          )}

          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="auth-error" aria-hidden>
            {!email ? '' : ''}
          </div>

          <label className="auth-label">Password</label>
          <div className="auth-input-wrap">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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

          {tab === 'signup' && (
            <>
              <label className="auth-label">Confirm Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </>
          )}

          {tab === 'login' && (
            <div className="auth-actions-row">
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="auth-toggle" aria-hidden />
                <span>Remember me</span>
              </label>

              <div className="auth-forgot">
                <button type="button" className="link-like">
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          <button type="submit" className={`auth-submit ${tab === 'signup' ? 'auth-submit-signup' : ''}`}>
            {tab === 'login' ? 'Sign in' : 'Create account'}
          </button>

          {tab === 'login' && (
            <>
              <div className="auth-sep" aria-hidden="true" />

              <button type="button" className="auth-google">
                <svg
                  className="auth-google-mark"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.195 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.052 6.053 29.277 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.052 6.053 29.277 4 24 4c-7.682 0-14.417 4.337-17.694 10.691"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.176 0 9.861-1.977 13.409-5.192l-6.19-5.238C29.143 35.091 26.715 36 24 36c-5.174 0-9.625-3.328-11.287-7.946l-6.522 5.025C9.428 39.556 16.227 44 24 44"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303c-.793 2.28-2.254 4.244-4.087 5.57c.001-.001 6.191 5.238 6.191 5.238C36.971 39.203 44 34 44 24c0-1.341-.138-2.65-.389-3.917"
                  />
                </svg>
                <span>Or sign in with Google</span>
              </button>
            </>
          )}

          {tab === 'login' && (
            <div className="auth-bottom">
              <span>Don't have an account?</span>
              <button
                type="button"
                className="link-like"
                onClick={() => navigate('/signup', { state: { from: referrerPath }, replace: true })}
              >
                Sign up now
              </button>
            </div>
          )}

          {tab === 'signup' && (
            <div className="auth-bottom">
              <span>Already have an account?</span>
              <button
                type="button"
                className="link-like"
                onClick={() => navigate('/login', { state: { from: referrerPath }, replace: true })}
              >
                Log in
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
