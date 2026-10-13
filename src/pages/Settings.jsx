import { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Mail,
  Download,
  Trash2,
  Monitor,
  LogOut,
  Palette,
  ArrowUpRight,
} from 'lucide-react';
import { PageHeader, useData, Modal, ThemeSwitch } from '../components/Common';
import { useAuth } from '../auth/AuthProvider';
import { useTheme } from '../components/theme/ThemeProvider';
import api from '../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
export default function SettingsPage() {
  const { user, refresh, clearSession } = useAuth(),
    { theme } = useTheme(),
    navigate = useNavigate();
  const [firstName, setFirstName] = useState(user.firstName),
    [lastName, setLastName] = useState(user.lastName),
    [password, setPassword] = useState(''),
    [current, setCurrent] = useState(''),
    [mail, setMail] = useState(null),
    [mailBusy, setMailBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [confirmation, setConfirmation] = useState('');
  const { data: configuration } = useData('/config');
  const { data: sessions, reload } = useData('/auth/sessions');
  async function save(e) {
    e.preventDefault();
    try {
      await api.patch('/user/me', { firstName, lastName, theme });
      await refresh();
      toast.success('Your profile is saved');
    } catch (e) {
      toast.error(e.message);
    }
  }
  return (
    <main className="page-content settings-page">
      <PageHeader
        eyebrow="MAKE THIS SPACE YOURS"
        title="Your corner of the universe."
        description="Profile, appearance, and the security of your account."
      />
      <section className="panel">
        <h3>Profile</h3>
        <form className="form-stack" onSubmit={save}>
          <div className="two-fields">
            <label>
              First name
              <input
                required
                maxLength={60}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </label>
            <label>
              Last name
              <input
                maxLength={60}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </label>
          </div>
          <label>
            Email address
            <input disabled value={user.email} />
          </label>
          <div className="stack">
            <button className="primary-button">Save profile</button>
            <span className={'capability-badge ' + (user.emailVerified ? 'configured' : '')}>
              {user.emailVerified ? 'Email verified' : 'Verification required'}
            </span>
          </div>
        </form>
        {!user.emailVerified && (
          <div className="verification-notice">
            <Mail size={19} />
            <p>Verify your email before AI generation, team changes, or paid resource creation.</p>
            <button
              className="text-link"
              disabled={mailBusy}
              onClick={async () => {
                setMailBusy(true);
                try {
                  const { data } = await api.post('/auth/resend-verification');
                  toast.success(
                    data.delivery === 'local'
                      ? 'Link created in your development mailbox'
                      : 'Verification email sent. Check your inbox and spam folder.',
                  );
                } catch (e) {
                  toast.error(e.message);
                } finally {
                  setMailBusy(false);
                }
              }}
            >
              {mailBusy ? 'Sending…' : 'Resend verification'}
            </button>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await refresh();
                  toast.info('Verification status refreshed');
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Check status
            </button>
          </div>
        )}
        {configuration?.mailMode === 'local' && (
          <button
            className="text-button local-mail-button"
            onClick={async () => {
              try {
                const { data } = await api.get('/auth/local-mail');
                setMail(data.mail);
                if (!data.mail) toast.info('No local development message found');
              } catch (e) {
                toast.error(e.message);
              }
            }}
          >
            Open local development mailbox
          </button>
        )}
        {mail && (
          <div className="notice">
            <Mail size={19} />
            <div>
              <strong>Local development message · email was not sent externally</strong>
              <p>{mail.subject}</p>
              <a href={mail.url} className="text-link">
                Open secure link
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
        )}
      </section>
      <section className="panel">
        <h3>
          <Palette size={18} />
          Appearance
        </h3>
        <p className="muted">
          Choose light or dark mode. Save your profile to use it across your sessions.
        </p>
        <ThemeSwitch asSelect />
      </section>
      <section className="panel">
        <h3>Change password</h3>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post('/auth/change-password', { currentPassword: current, password });
              setCurrent('');
              setPassword('');
              await reload();
              toast.success('Password changed. Other sessions revoked.');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          <label>
            Current password
            <input
              required
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            New password
            <input
              required
              type="password"
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="secondary-button">Update password</button>
        </form>
      </section>
      <section className="panel">
        <h3>Active sessions</h3>
        {sessions?.sessions.map((s) => (
          <div className="session-row" key={s.id}>
            <Monitor size={20} />
            <div>
              <strong>{s.id === sessions.currentId ? 'This session' : 'Another session'}</strong>
              <small>{s.userAgent || 'Unknown device'}</small>
            </div>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api.delete('/auth/sessions/' + s.id);
                  if (s.id === sessions.currentId) {
                    await refresh();
                    navigate('/auth/login');
                  } else await reload();
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Revoke
            </button>
          </div>
        ))}
      </section>
      <section className="panel">
        <h3>Privacy & ownership</h3>
        <p className="muted">Take your data with you. Projects have separate source ZIP exports.</p>
        <a className="secondary-button" href="/v1/user/export">
          <Download size={16} />
          Export account data
        </a>
      </section>
      <section className="panel danger-panel">
        <h3>Delete account</h3>
        <p>
          Permanent deletion is blocked until subscriptions, active jobs, and external resources are
          resolved.
        </p>
        <button className="danger-button" onClick={() => setConfirm(true)}>
          <Trash2 size={16} />
          Delete my account
        </button>
      </section>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete your account permanently?"
        description="This removes account data, source files, conversations, and checkpoints. Export your work first."
      >
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.delete('/auth/account', { data: { confirmation } });
              clearSession();
              toast.success('Account deleted');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          <label>
            Type DELETE MY ACCOUNT
            <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </label>
          <button disabled={confirmation !== 'DELETE MY ACCOUNT'} className="danger-button">
            Permanently delete account
          </button>
        </form>
      </Modal>
    </main>
  );
}
