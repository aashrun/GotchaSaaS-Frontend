import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowUpRight,
  X,
  Orbit,
  ChevronDown,
  TriangleAlert,
  Sun,
  Moon,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTheme } from './theme/ThemeProvider';
import api from '../lib/api';
export function Logo({ compact = false }) {
  return (
    <Link
      className={'logo gotcha-wordmark' + (compact ? ' logo-compact' : '')}
      to="/"
      aria-label="Gotcha SaaS home"
    >
      <span>Gotcha </span>
      <small className="saas-brand">SaaS</small>
    </Link>
  );
}
export function ThemeSwitch({ asSelect = false, onChange }) {
  const { theme, setTheme } = useTheme();
  if (asSelect)
    return (
      <select
        aria-label="Color theme"
        className="theme-select"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
      >
        <option value="dark">Dark mode</option>
        <option value="light">Light mode</option>
      </select>
    );
  const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  return (
    <button
      type="button"
      className="theme-icon-button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        onChange ? onChange(next) : setTheme(next);
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export function useData(url) {
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  async function reload() {
    setError('');
    try {
      const result = await api.get(url);
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    setData(null);
    api
      .get(url)
      .then((r) => live && setData(r.data))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [url]);
  return { data, error, loading, reload };
}
export function ErrorState({ message, retry }) {
  return (
    <div className="error-state" role="alert">
      <TriangleAlert size={20} />
      <p>{message}</p>
      {retry && (
        <button className="text-button" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function EmptyState({ icon: Icon = Orbit, title, children, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({ open, onOpenChange, title, description, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>
            {description || 'Manage your Gotcha SaaS workspace.'}
          </Dialog.Description>
          <Dialog.Close aria-label="Close dialog" className="dialog-close">
            <X size={18} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{eyebrow || 'YOUR WORKSPACE'}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function TemplateArt({ type }) {
  return (
    <div className={'template-art ' + type}>
      {type === 'portfolio' ? (
        <>
          <span className="art-label">FOLIO / 01</span>
          <div className="art-portfolio">
            Made with
            <br />
            <i>intention.</i>
          </div>
          <div className="art-circle" />
        </>
      ) : type === 'landing' ? (
        <>
          <span className="art-label">FIELDNOTES</span>
          <div className="art-landing">
            Less noise.
            <br />
            More possibility.
          </div>
          <div className="art-pill">Find your flow ↗</div>
        </>
      ) : (
        <>
          <div className="art-sidebar">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="art-dashboard">
            <div className="art-heading">
              {type === 'crm' ? 'Your customer universe' : 'A little space to focus'}
            </div>
            <div className="art-stats">
              <span />
              <span />
              <span />
            </div>
            <div className="art-rows">
              {[1, 2, 3].map((x) => (
                <div key={x}>
                  <i />
                  <span />
                  <b />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-grid">
      {[1, 2, 3].map((i) => (
        <div className="skeleton" key={i} />
      ))}
    </div>
  );
}
