import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { ArrowUpRight, LockKeyhole, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Logo, ErrorState, ThemeSwitch } from '../components/Common';
import PlanetScene from '../components/PlanetScene';
import { useAuth } from '../auth/AuthProvider';
import { auth0Configured } from '../auth/Auth0Provider';
import api from '../lib/api';
import { toast } from 'sonner';
import './auth.css';
function OAuthButton() {
  const { loginWithRedirect } = useAuth0();
  return (
    <button
      type="button"
      className="oauth-button"
      onClick={() => loginWithRedirect({ appState: { returnTo: '/auth/callback' } })}
    >
      <span>G</span>Continue with Google / Auth0
    </button>
  );
}
function OAuthCallback() {
  const auth0 = useAuth0(),
    { accept } = useAuth(),
    navigate = useNavigate(),
    started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (auth0.isAuthenticated && !started.current) {
      started.current = true;
      (async () => {
        const token = await auth0.getAccessTokenSilently();
        const { data } = await api.post(
          '/auth/auth0',
          {},
          { headers: { Authorization: 'Bearer ' + token } },
        );
        accept(data);
        sessionStorage.setItem('gotcha-login-at', String(Date.now()));
        navigate('/projects', { replace: true });
      })().catch((e) => setError(e.message));
    }
  }, [auth0.isAuthenticated]);
  return error ? <ErrorState message={error} /> : <p>Verifying your identity…</p>;
}
export default function AuthPage() {
  const { mode } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    location = useLocation();
  const { signIn, user, refresh } = useAuth();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [firstName, setFirstName] = useState(''),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('');
  const verified = useRef(null);
  const register = mode === 'register';
  useEffect(() => {
    setError('');
    setSuccess('');
  }, [mode]);
  useEffect(() => {
    const token = params.get('token');
    if (mode === 'verify' && !token) {
      setError('This verification link is incomplete. Request a fresh link from Settings.');
      return;
    }
    if (mode === 'verify' && token && verified.current !== token) {
      verified.current = token;
      setError('');
      setSuccess('');
      api
        .post('/auth/verify', { token: params.get('token') })
        .then(async () => {
          setSuccess('Your email is verified. You’re ready to build.');
          await refresh();
        })
        .catch((e) => setError(e.message));
    }
  }, [mode, params.get('token')]);
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (['login', 'register'].includes(mode)) {
        const result = await signIn(mode, { email, password, ...(register ? { firstName } : {}) });
        if (result.verification?.delivery === 'failed')
          toast.error(
            'Your account is ready, but the verification email could not be sent. Retry from Settings.',
          );
        navigate(
          location.state?.from ||
            (sessionStorage.getItem('gotcha-prompt') || sessionStorage.getItem('gotcha-template')
              ? '/projects?new=true'
              : '/projects'),
          { replace: true },
        );
      } else if (mode === 'forgot') {
        const { data } = await api.post('/auth/forgot', { email });
        setSuccess(data.message);
      } else if (mode === 'reset') {
        await api.post('/auth/reset', { password, token: params.get('token') });
        setSuccess('Password reset. Sign in with your new password.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={'auth-page' + (mode === 'login' ? ' auth-login' : '')}>
      <aside className="auth-brand">
        <PlanetScene />
        <div className="auth-brand-copy">
          <div className="auth-brand-line" />
          <span className="eyebrow">A WORKSPACE FOR YOUR NEXT BIG IDEA</span>
          <h1>
            A little spark.
            <br />
            <span>A whole universe.</span>
          </h1>
          <p>
            Keep your apps, source code, and checkpoints in one workspace. Make space for what comes
            next.
          </p>
        </div>
      </aside>
      <main className="auth-form-panel">
        <div className="auth-theme">
          <ThemeSwitch />
        </div>
        <div className="auth-form">
          <Logo />
          <h1>
            {register
              ? 'Let’s make something.'
              : mode === 'login'
                ? 'Welcome to your workspace.'
                : mode === 'forgot'
                  ? 'Find your way back.'
                  : mode === 'reset'
                    ? 'A fresh start.'
                    : mode === 'verify'
                      ? 'Checking your email.'
                      : 'Opening your workspace.'}
          </h1>
          <p>
            {register
              ? 'Create your workspace. Give your ideas a home.'
              : mode === 'login'
                ? 'Sign in to pick up where you left off. Your next idea is waiting.'
                : mode === 'forgot'
                  ? 'We’ll send you a secure password reset link.'
                  : 'Keep your account secure.'}
          </p>
          {error && <ErrorState message={error} />}{' '}
          {success && (
            <div className="success-state" role="status">
              <ShieldCheck size={20} />
              {success}
              <Link className="text-link" to={user ? '/projects' : '/auth/login'}>
                {user ? 'Open workspace' : 'Sign in'}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          {mode === 'callback' ? (
            auth0Configured ? (
              <OAuthCallback />
            ) : (
              <ErrorState message="Auth0 is not configured." />
            )
          ) : (
            !['verify'].includes(mode) &&
            !success && (
              <form className="form-stack" onSubmit={submit}>
                {register && (
                  <label>
                    Your first name
                    <input
                      autoComplete="given-name"
                      required
                      maxLength={60}
                      placeholder="What should we call you?"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </label>
                )}
                {mode !== 'reset' && (
                  <label>
                    Email address
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </label>
                )}
                {mode !== 'forgot' && (
                  <label>
                    <span className="password-label">
                      Password{mode === 'login' && <Link to="/auth/forgot">Forgot password?</Link>}
                    </span>
                    <div className="password-input">
                      <input
                        aria-label="Password"
                        type={show ? 'text' : 'password'}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        required
                        minLength={12}
                        maxLength={72}
                        placeholder="At least 12 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        aria-label={show ? 'Hide password' : 'Show password'}
                        onClick={() => setShow(!show)}
                      >
                        {show ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </label>
                )}
                <button className="primary-button" disabled={busy}>
                  <span>
                    <LockKeyhole size={16} />
                    {busy
                      ? 'Just a moment…'
                      : register
                        ? 'Create my workspace'
                        : mode === 'login'
                          ? 'Open my workspace'
                          : mode === 'forgot'
                            ? 'Send reset link'
                            : 'Reset password'}
                  </span>
                  <ArrowUpRight size={18} />
                </button>
                {auth0Configured && ['login', 'register'].includes(mode) && (
                  <>
                    <span className="form-divider">or keep it simple</span>
                    <OAuthButton />
                  </>
                )}
              </form>
            )
          )}
          <p className="auth-switch">
            {register ? 'Already have a workspace? ' : 'New around here? '}
            <Link to={register ? '/auth/login' : '/auth/register'}>
              {register ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
          <div className="auth-security-note">
            <ShieldCheck size={16} />
            <p>
              Your projects and conversations stay saved in your workspace. Pick up where you left
              off whenever you sign in.
            </p>
          </div>
          <p className="legal-note">
            By creating an account, you accept the <Link to="/terms">Terms</Link> and{' '}
            <Link to="/privacy">Privacy Policy</Link>, both pending legal review.
          </p>
        </div>
      </main>
    </div>
  );
}
