import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { registerUser, loginUser, forgotPassword, loginWithGoogle, type AuthResponse } from '../../api';

type TabType = 'login' | 'signup' | 'forgot';

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            ux_mode?: 'popup' | 'redirect';
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              type?: 'standard' | 'icon';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

const DEFAULT_GOOGLE_CLIENT_ID = '49147050548-0h30og1tgnkp2k0q8eqjc90uojqsn5bv.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = (
  (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim()
  || DEFAULT_GOOGLE_CLIENT_ID
);
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const SHOW_LOCAL_RESET_TOKEN = import.meta.env.DEV
  && import.meta.env.VITE_SHOW_RESET_TOKEN === 'true';

export const AuthPage: React.FC = () => {
  const { login } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const referrerPath = (location.state as { from?: string } | null)?.from || '/';
  const initialTab: TabType = location.pathname === '/signup' ? 'signup' : 'login';

  const [tab, setTab] = useState<TabType>(initialTab);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

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

  useEffect(() => {
    setTab(location.pathname === '/signup' ? 'signup' : 'login');
    setIsOpen(true);
  }, [location.pathname]);

  // Clear messages when switching tabs
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [tab]);

  const close = () => {
    setIsOpen(false);
    setTimeout(() => {
      navigate(referrerPath);
    }, 300);
  };

  const completeLogin = useCallback((res: AuthResponse) => {
    login(res.user.fullName, res.user.email, res.token, res.user.avatar);
    setIsOpen(false);
    setTimeout(() => {
      navigate(referrerPath);
    }, 300);
  }, [login, navigate, referrerPath]);

  const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential) {
      setError('Google did not return a sign-in credential.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await loginWithGoogle(response.credential, rememberMe);
      completeLogin(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setGoogleLoading(false);
    }
  }, [completeLogin, rememberMe]);

  useEffect(() => {
    if (tab !== 'login' || !GOOGLE_CLIENT_ID) {
      setGoogleReady(false);
      return;
    }

    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'signin_with',
        width: Math.min(424, googleButtonRef.current.clientWidth || 424),
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => { cancelled = true; };
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    script.addEventListener('load', renderGoogleButton);
    script.addEventListener('error', () => {
      if (!cancelled) setError('Could not load Google sign-in. Please try again.');
    });

    return () => {
      cancelled = true;
      script?.removeEventListener('load', renderGoogleButton);
    };
  }, [handleGoogleCredential, tab]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Client-side validation
    if (tab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (tab === 'forgot') {
      if (!email) {
        setError('Please enter your email');
        return;
      }
      setLoading(true);
      try {
        const res = await forgotPassword(email);
        const localResetUrl = SHOW_LOCAL_RESET_TOKEN && res.resetToken
          ? `${window.location.origin}/reset-password?token=${encodeURIComponent(res.resetToken)}`
          : '';
        setSuccess(localResetUrl ? `${res.message} Local reset link: ${localResetUrl}` : res.message);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (tab === 'signup') {
      if (!fullName || !email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }
      setLoading(true);
      try {
        const res = await registerUser(fullName, email, password, confirmPassword);
        setSuccess(res.message);
        // Switch to login tab after successful registration
        setTimeout(() => {
          setTab('login');
          setSuccess('Account created! Please log in.');
          setPassword('');
          setConfirmPassword('');
        }, 1500);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Registration failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Login
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await loginUser(email, password, rememberMe);
      completeLogin(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const headingText = () => {
    switch (tab) {
      case 'login': return 'Nice to see you again';
      case 'signup': return 'Welcome to VieTrans';
      case 'forgot': return 'Reset your password';
    }
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
            <h3>{headingText()}</h3>
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
                disabled={loading}
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
            disabled={loading}
          />

          {tab !== 'forgot' && (
            <>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
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
            </>
          )}

          {tab === 'signup' && (
            <>
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <input
                  className="auth-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
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
                <button
                  type="button"
                  className="link-like"
                  onClick={() => setTab('forgot')}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`auth-submit ${tab === 'signup' ? 'auth-submit-signup' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={20} className="auth-spinner" />
            ) : tab === 'login' ? (
              'Sign in'
            ) : tab === 'signup' ? (
              'Create account'
            ) : (
              'Send reset link'
            )}
          </button>

          {tab === 'login' && (
            <>
              <div className="auth-sep" aria-hidden="true" />

              {GOOGLE_CLIENT_ID ? (
                <div className="auth-google-shell">
                  <div
                    ref={googleButtonRef}
                    className={`auth-google-native ${googleReady ? 'is-ready' : ''}`}
                    aria-busy={googleLoading}
                  />
                  {googleLoading && (
                    <div className="auth-google-loading">
                      <Loader2 size={16} className="auth-spinner" />
                      <span>Signing in with Google...</span>
                    </div>
                  )}
                </div>
              ) : (
                <button type="button" className="auth-google" disabled>
                  <span>Google sign-in is not configured</span>
                </button>
              )}
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

          {tab === 'forgot' && (
            <div className="auth-bottom">
              <span>Remember your password?</span>
              <button
                type="button"
                className="link-like"
                onClick={() => setTab('login')}
              >
                Back to login
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
