import { useEffect, useState } from 'react';
import { Github, ExternalLink } from 'lucide-react';
import api from '../lib/api';
import { useData, ErrorState } from './Common';
export default function GitHubConnection({ projectId, onConnected }) {
  const { data, error, reload } = useData('/integrations');
  const [repos, setRepos] = useState(null),
    [selection, setSelection] = useState(''),
    [installation, setInstallation] = useState(''),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState('');
  async function perform(action) {
    setBusy(true);
    setFailure('');
    try {
      await action();
    } catch (e) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function loadRepositories() {
    setRepos(null);
    setSelection('');
    const { data: list } = await api.get('/integrations/github/repositories', {
      params: { page, ...(installation ? { installationId: installation } : {}) },
    });
    setRepos(list);
  }
  useEffect(() => {
    if (projectId && data?.github.connected) perform(loadRepositories);
  }, [projectId, data?.github.connected, installation, page]);
  if (error) return <ErrorState message={error} retry={reload} />;
  if (!data) return <p className="muted">Checking GitHub connection…</p>;
  const github = data.github;
  return (
    <div className="form-stack github-connection">
      <p>
        {github.connected ? (
          <>
            Connected as <strong>{github.login}</strong>.
          </>
        ) : (
          'Connect your GitHub account, then choose which repositories Gotcha can access.'
        )}
      </p>
      {!github.configured && (
        <p className="muted">GitHub account connections need platform configuration.</p>
      )}
      {!github.connected ? (
        <button
          className="primary-button"
          disabled={busy || !github.configured}
          onClick={() =>
            perform(async () => {
              const { data } = await api.post('/integrations/github/authorize');
              window.location.assign(data.url);
            })
          }
        >
          <Github size={17} /> Connect GitHub
        </button>
      ) : (
        <>
          <a className="secondary-button" href={github.installUrl} target="_blank" rel="noreferrer">
            Choose repositories on GitHub <ExternalLink size={15} />
          </a>
          <p className="muted">
            After choosing repositories on GitHub, return here and refresh the list.
          </p>
          {projectId && (
            <>
              <a
                className="text-button"
                href="https://github.com/new"
                target="_blank"
                rel="noreferrer"
              >
                Create a repository on GitHub (include a README)
              </a>
              {!!repos?.installations.length && (
                <label>
                  GitHub account
                  <select
                    aria-label="GitHub account"
                    value={installation || repos.installationId || ''}
                    onChange={(e) => {
                      setInstallation(e.target.value);
                      setPage(1);
                    }}
                  >
                    {repos.installations.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.login}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Repository
                <select
                  aria-label="GitHub repository"
                  value={selection}
                  disabled={busy}
                  onChange={(e) => setSelection(e.target.value)}
                >
                  <option value="">Choose a repository</option>
                  {repos?.repositories.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.owner}/{r.name}
                      {r.private ? ' (private)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {repos && !repos.repositories.length && (
                <p className="muted">
                  No repositories are available yet. Choose repositories on GitHub, then refresh
                  this list.
                </p>
              )}
              <div className="github-connection-actions">
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => perform(loadRepositories)}
                >
                  Refresh repositories
                </button>
                {page > 1 && (
                  <button className="text-button" disabled={busy} onClick={() => setPage(page - 1)}>
                    Previous
                  </button>
                )}
                {page * 100 < (repos?.total || 0) && (
                  <button className="text-button" disabled={busy} onClick={() => setPage(page + 1)}>
                    Next
                  </button>
                )}
                <button
                  className="primary-button"
                  disabled={busy || !selection}
                  onClick={() =>
                    perform(async () => {
                      const r = repos.repositories.find((r) => String(r.id) === selection);
                      await api.post('/integrations/github/repository', {
                        projectId,
                        owner: r.owner,
                        repo: r.name,
                      });
                      await onConnected?.();
                    })
                  }
                >
                  Connect repository
                </button>
              </div>
            </>
          )}
          {!projectId && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() =>
                perform(async () => {
                  await api.delete('/integrations/github');
                  await reload();
                })
              }
            >
              Disconnect GitHub from Gotcha
            </button>
          )}
        </>
      )}
      {failure && <p role="alert">{failure}</p>}
    </div>
  );
}
