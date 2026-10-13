import { lazy, Suspense, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { Modal } from './Common';
import AgentTools from './AgentTools';
import PublishTools from './PublishTools';
const CodeEditor = lazy(() => import('./CodeEditor'));
export default function ProjectTools({ data, reload, canEdit, initialTab = 'source' }) {
  const [tab, setTab] = useState(initialTab),
    [selected, setSelected] = useState('src/App.tsx'),
    [drafts, setDrafts] = useState({}),
    [name, setName] = useState(''),
    [restore, setRestore] = useState(null),
    [busy, setBusy] = useState(false);
  const project = data.project,
    file = data.files.find((f) => f.path === selected) || data.files[0];
  const dirty = file && drafts[file.path] !== undefined && drafts[file.path] !== file.content;
  async function perform(action) {
    setBusy(true);
    try {
      await action();
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="project-tools">
      <div className="project-tools-tabs" role="tablist" aria-label="Project tools">
        {[
          ['source', 'Code'],
          ['versions', 'Checkpoints'],
          ['tests', 'Checks'],
          ['agent', 'Memory & GitHub'],
          ['publish', 'Publish'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
        <a href={'/v1/projects/' + project.id + '/export'} download title="Download source">
          <Download size={16} />
          <span>Export</span>
        </a>
      </div>
      {tab === 'source' && (
        <div className="project-source-tools">
          <div className="source-file-toolbar">
            <select
              aria-label="Source file"
              value={file?.path || ''}
              onChange={(e) => setSelected(e.target.value)}
            >
              {data.files.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                  {f.protected ? ' · protected' : ''}
                </option>
              ))}
            </select>
            <button
              className="secondary-button"
              disabled={!canEdit || !dirty || file.protected || busy}
              onClick={() =>
                perform(async () => {
                  await api.put('/projects/' + project.id + '/files', {
                    path: file.path,
                    content: drafts[file.path],
                    revision: project.revision,
                  });
                  setDrafts((v) => {
                    const next = { ...v };
                    delete next[file.path];
                    return next;
                  });
                  toast.success('Source saved. Ask Gotcha to rebuild the preview.');
                })
              }
            >
              Save file
            </button>
          </div>
          <div className="project-source-editor">
            <Suspense fallback={<p>Opening source…</p>}>
              {file && (
                <CodeEditor
                  path={file.path}
                  value={drafts[file.path] ?? file.content}
                  readOnly={!canEdit || file.protected || busy}
                  onChange={(value) => setDrafts((v) => ({ ...v, [file.path]: value }))}
                />
              )}
            </Suspense>
          </div>
          <p className="muted">
            Protected runtime files stay read-only. Manual changes require a new build before
            previewing.
          </p>
        </div>
      )}
      {tab === 'versions' && (
        <div className="form-stack">
          {canEdit && (
            <form
              className="checkpoint-form"
              onSubmit={(e) => {
                e.preventDefault();
                perform(async () => {
                  await api.post('/projects/' + project.id + '/checkpoints', { name });
                  setName('');
                });
              }}
            >
              <input
                aria-label="Checkpoint name"
                placeholder="Name this checkpoint…"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="secondary-button" disabled={busy}>
                Save checkpoint
              </button>
            </form>
          )}
          {data.versions.map((v) => (
            <div className="checkpoint-row" key={v.id}>
              <span>
                <strong>{v.name}</strong>
                <small>
                  Revision {v.revision} · {new Date(v.createdAt).toLocaleString()}
                </small>
              </span>
              <button
                className="text-button"
                disabled={!canEdit || busy}
                onClick={() => setRestore(v)}
              >
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
      {tab === 'tests' && (
        <div>
          {!data.tests.length && (
            <p className="muted">Build and browser checks appear here after a run.</p>
          )}
          {data.tests.map((t) => (
            <details key={t.id}>
              <summary>
                {t.status} · {new Date(t.createdAt).toLocaleString()}
              </summary>
              {t.results.map((r, i) => (
                <p key={i}>
                  {r.name}: {r.status}
                </p>
              ))}
            </details>
          ))}
        </div>
      )}
      {tab === 'publish' && <PublishTools project={project} />}
      {tab === 'agent' && <AgentTools projectId={project.id} canEdit={canEdit} />}
      <Modal
        open={!!restore}
        onOpenChange={(open) => !open && setRestore(null)}
        title="Restore this checkpoint?"
        description="This restores source files. Database contents and external resources keep their current state."
      >
        <button
          className="primary-button"
          disabled={busy}
          onClick={() =>
            perform(async () => {
              await api.post('/projects/' + project.id + '/versions/' + restore.id + '/restore', {
                confirmation: 'RESTORE SOURCE ONLY',
              });
              setRestore(null);
              setDrafts({});
            })
          }
        >
          Restore source
        </button>
      </Modal>
    </div>
  );
}
