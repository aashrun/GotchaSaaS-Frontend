import { useState } from 'react';
import { toast } from 'sonner';
import api from '../lib/api';
import { useData, Modal } from './Common';
export default function AgentTools({ projectId, canEdit }) {
  const base = '/agent/' + projectId,
    { data, reload } = useData(base + '/memory'),
    { data: evidence } = useData(base + '/evidence'),
    { data: connections, reload: reloadConnections } = useData(base + '/connections'),
    { data: actions, reload: reloadActions } = useData(base + '/actions');
  const [key, setKey] = useState(''),
    [value, setValue] = useState(''),
    [owner, setOwner] = useState(''),
    [repo, setRepo] = useState(''),
    [token, setToken] = useState(''),
    [review, setReview] = useState(null),
    [busy, setBusy] = useState(false);
  async function perform(operation) {
    setBusy(true);
    try {
      await operation();
      await Promise.all([reload(), reloadActions(), reloadConnections()]);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-section">
      <h3>Project memory</h3>
      <p className="muted">
        Requirements and decisions persist across builds. Never add credentials here.
      </p>
      {data?.memory.map((note) => (
        <div className="agent-memory-note" key={note.id}>
          <strong>{note.key}</strong>
          <p>{note.value}</p>
          <small>
            {note.category} · revision {note.revision}
          </small>
          {canEdit && (
            <button
              className="text-button"
              disabled={busy}
              onClick={() => perform(() => api.delete(base + '/memory/' + note.id))}
            >
              Remove
            </button>
          )}
        </div>
      ))}
      {canEdit && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            perform(async () => {
              await api.put(base + '/memory', { key, value, category: 'requirement' });
              setKey('');
              setValue('');
            });
          }}
        >
          <label>
            Memory title
            <input required maxLength={80} value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
          <label>
            Requirement
            <textarea
              required
              maxLength={2000}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <button className="secondary-button" disabled={busy}>
            Save memory
          </button>
        </form>
      )}
      <h3>Agent evidence</h3>
      {!evidence?.steps.length && (
        <p className="muted">Tool results and browser screenshots appear after an agent run.</p>
      )}
      {evidence?.steps.map((step) => (
        <details key={step.id}>
          <summary>
            Step {step.sequence + 1} · {step.state}
          </summary>
          {step.activities.length ? (
            <ul>
              {step.activities.map((activity, i) => (
                <li key={i}>{activity}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">No actions recorded in this step.</p>
          )}
        </details>
      ))}
      {evidence?.artifacts.map((a) => (
        <a key={a.id} href={'/v1' + base + '/artifacts/' + a.id} target="_blank" rel="noreferrer">
          {a.name}
        </a>
      ))}
      <h3>GitHub repository</h3>
      {connections?.connections.map((c) => (
        <p key={c.id}>
          {c.config.owner}/{c.config.repo}
          {canEdit && (
            <button
              className="text-button"
              onClick={() => perform(() => api.delete(base + '/connections/github'))}
            >
              Disconnect
            </button>
          )}
        </p>
      ))}
      {canEdit && !connections?.connections.length && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            perform(async () => {
              await api.post(base + '/connections/github', { owner, repo, token });
              setToken('');
            });
          }}
        >
          <label>
            Repository owner
            <input required value={owner} onChange={(e) => setOwner(e.target.value)} />
          </label>
          <label>
            Repository name
            <input required value={repo} onChange={(e) => setRepo(e.target.value)} />
          </label>
          <label>
            Fine-grained repository token
            <input
              required
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <button className="secondary-button" disabled={busy}>
            Connect repository
          </button>
        </form>
      )}
      {canEdit && !!connections?.connections.length && (
        <button
          className="secondary-button"
          onClick={() =>
            perform(() =>
              api.post(base + '/actions', {
                title: 'Update application from Gotcha SaaS',
                description: 'Review the exported application source.',
              }),
            )
          }
        >
          Prepare source pull request
        </button>
      )}
      <h3>External actions</h3>
      {actions?.actions.map((a) => (
        <div className="agent-memory-note" key={a.id}>
          <strong>{a.request.title}</strong>
          <p>{a.state}</p>
          {a.error && <p className="muted">{a.error}</p>}
          {canEdit && ['unknown', 'executing'].includes(a.state) && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => perform(() => api.post(base + '/actions/' + a.id + '/reconcile'))}
            >
              Check repository outcome
            </button>
          )}
          {a.result.url && (
            <a href={a.result.url} target="_blank" rel="noreferrer">
              Open pull request
            </a>
          )}
          {a.state === 'pending' && canEdit && (
            <button
              className="secondary-button"
              onClick={async () => {
                try {
                  setReview((await api.get(base + '/actions/' + a.id)).data.action);
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Review source & action
            </button>
          )}
        </div>
      ))}
      <Modal
        open={!!review}
        onOpenChange={(open) => !open && setReview(null)}
        title="Review draft pull request"
      >
        <p>
          {review?.request.repository?.owner}/{review?.request.repository?.repo} · base{' '}
          {review?.request.repository?.defaultBranch}
        </p>
        <p>{review?.request.description}</p>
        <p className="muted">
          This creates a branch and a draft pull request in the connected repository.
        </p>
        {review?.request.files?.map((file) => (
          <details key={file.path}>
            <summary>{file.path}</summary>
            <pre style={{ maxHeight: 220, overflow: 'auto', fontSize: 11 }}>{file.content}</pre>
          </details>
        ))}
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            perform(async () => {
              await api.post(base + '/actions/' + review.id + '/approve', {
                confirmation: 'CREATE DRAFT PULL REQUEST',
              });
              setReview(null);
            })
          }
        >
          Create draft pull request
        </button>
        <button
          className="text-button"
          disabled={busy}
          onClick={() =>
            perform(async () => {
              await api.post(base + '/actions/' + review.id + '/reject');
              setReview(null);
            })
          }
        >
          Reject action
        </button>
      </Modal>
    </div>
  );
}
