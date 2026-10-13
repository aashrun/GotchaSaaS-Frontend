import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  Loader2,
  Plus,
  Search,
  Folder,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Download,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import { useData, Modal, ErrorState, Skeleton } from '../components/Common';
import api from '../lib/api';
import { submitPromptOnEnter } from '../lib/promptKeyboard';
import VoiceInput from '../components/VoiceInput';
import PromptReferences, { ReferenceChips } from '../components/PromptReferences';
import { useAuth } from '../auth/AuthProvider';
import { nextGreeting } from '../lib/greetings';
import { toast } from 'sonner';
import ProjectChat from '../components/ProjectChat';

export default function Dashboard({ library = false }) {
  const [params] = useSearchParams();
  const id = params.get('chat');
  return id && !library ? <ProjectChat key={id} id={id} /> : <ProjectHome library={library} />;
}
function ProjectHome({ library }) {
  const { user } = useAuth();
  const { folders, refreshNavigation } = useOutletContext();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const folderId = params.get('folderId') || '';
  const selectedFolder = folders.find((folder) => folder.id === folderId);
  const [prompt, setPrompt] = useState('');
  const [greeting, setGreeting] = useState(() => nextGreeting(user));
  const [references, setReferences] = useState([]);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [starter, setStarter] = useState('auto');
  const [destination, setDestination] = useState(folderId === 'none' ? '' : folderId);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [menu, setMenu] = useState(null);
  const [rename, setRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [moving, setMoving] = useState(null);
  const [moveTo, setMoveTo] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [blank, setBlank] = useState(false);
  const composer = useRef(null),
    creating = useRef(false);
  const { data, error, loading, reload } = useData(
    '/projects?' +
      new URLSearchParams({
        page: String(page),
        archived: String(archived),
        ...(folderId ? { folderId } : {}),
        ...(query ? { search: query } : {}),
      }),
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setDestination(folderId === 'none' ? '' : folderId);
    setPage(1);
  }, [folderId]);
  useEffect(() => {
    if (params.get('new') === 'true') {
      setPrompt('');
      setReferences([]);
      setGreeting((current) => nextGreeting(user, current));
      composer.current?.focus();
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    const saved = sessionStorage.getItem('nebula-prompt');
    if (saved) {
      setPrompt(saved);
      sessionStorage.removeItem('nebula-prompt');
    }
    const template = sessionStorage.getItem('nebula-template');
    if (template) {
      setStarter(template);
      composer.current?.focus();
      sessionStorage.removeItem('nebula-template');
    }
  }, [params]);
  async function create(event, empty = false) {
    event.preventDefault();
    if (voiceBusy || referenceBusy || creating.current || (!empty && prompt.trim().length < 5))
      return;
    creating.current = true;
    setBusy(true);
    try {
      const intent = empty ? '' : prompt.trim();
      const template = empty
        ? 'blank'
        : starter === 'auto'
          ? /backend|database|login|sign.?in|auth|persist|api\b/i.test(intent)
            ? 'fullstack'
            : intent.toLowerCase().includes('crm')
              ? 'crm'
              : intent.toLowerCase().includes('portfolio')
                ? 'portfolio'
                : intent.toLowerCase().includes('task')
                  ? 'tasks'
                  : 'blank'
          : starter;
      const { data } = await api.post('/projects', {
        name: empty ? newName.trim() : intent.split('\n')[0].slice(0, 80),
        description: intent,
        template,
        folderId: destination || null,
      });
      if (intent) sessionStorage.setItem('nebula-studio-prompt:' + data.project.id, intent);
      if (references.length && !empty)
        sessionStorage.setItem('gotcha-references:' + data.project.id, JSON.stringify(references));
      await refreshNavigation();
      navigate('/projects?chat=' + data.project.id + (intent ? '&build=true' : ''));
    } catch (error) {
      toast.error(error.message);
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }
  async function update(project, values, message) {
    try {
      await api.patch('/projects/' + project.id, values);
      setRename(null);
      setMoving(null);
      setMenu(null);
      await Promise.all([reload(), refreshNavigation()]);
      toast.success(message);
    } catch (error) {
      toast.error(error.message);
    }
  }
  return (
    <main className={'project-library page-content' + (library ? ' project-library-only' : '')}>
      {!library && (
        <section className="project-start">
          {selectedFolder && <span className="eyebrow">{selectedFolder.name}</span>}
          <h1>{greeting}</h1>
          <form className="project-composer" onSubmit={create}>
            <textarea
              ref={composer}
              aria-label="Describe your app idea"
              placeholder="Build a customer portal for my agency…"
              maxLength={12000}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={submitPromptOnEnter}
            />
            <ReferenceChips references={references} onChange={setReferences} disabled={busy} />
            <div className="project-composer-actions">
              <PromptReferences
                references={references}
                onChange={setReferences}
                onBusy={setReferenceBusy}
                disabled={busy}
              />
              <details className="composer-options">
                <summary aria-label="Project options">
                  <SlidersHorizontal size={15} />
                  <span>Options</span>
                </summary>
                <div className="composer-options-panel">
                  {!!folders.length && (
                    <label>
                      <Folder size={14} />
                      <select
                        aria-label="Save new project in folder"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                      >
                        <option value="">All projects</option>
                        {folders.map((folder) => (
                          <option key={folder.id} value={folder.id} disabled={!folder.writable}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Starter
                    <select
                      aria-label="Project starter"
                      value={starter}
                      onChange={(event) => setStarter(event.target.value)}
                    >
                      <option value="auto">Auto starter</option>
                      <option value="blank">Blank app</option>
                      <option value="fullstack">App with login & database</option>
                      <option value="crm">CRM</option>
                      <option value="tasks">Tasks</option>
                      <option value="portfolio">Portfolio</option>
                      <option value="landing">Landing page</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="text-button"
                    onClick={(event) => {
                      setNewName('');
                      setBlank(true);
                      event.currentTarget.closest('details').open = false;
                    }}
                  >
                    Start with a blank project
                    <ArrowRight size={13} />
                  </button>
                </div>
              </details>
              <VoiceInput
                disabled={busy}
                onBusy={setVoiceBusy}
                onTranscript={(text) => {
                  setPrompt((value) => (value + (value ? '\n' : '') + text).slice(0, 12000));
                  composer.current?.focus();
                }}
              />
              <button
                className="primary-button project-send"
                aria-label="Create project from idea"
                title="Build this idea"
                disabled={
                  busy ||
                  voiceBusy ||
                  referenceBusy ||
                  prompt.trim().length < 5 ||
                  (destination && !folders.find((folder) => folder.id === destination)?.writable)
                }
              >
                {busy ? <Loader2 size={18} className="voice-spinner" /> : <ArrowUp size={19} />}
              </button>
            </div>
          </form>
        </section>
      )}
      {library && (
        <section className="project-list-section">
          <div className="project-list-heading">
            <h2>
              {selectedFolder
                ? selectedFolder.name
                : folderId === 'none'
                  ? 'Unfiled projects'
                  : 'Your projects'}
              <span>{data?.total ?? 0}</span>
            </h2>
            <div>
              <button
                className={archived ? 'text-button active' : 'text-button'}
                onClick={() => {
                  setArchived(!archived);
                  setPage(1);
                }}
              >
                <Archive size={14} />
                {archived ? 'Show active' : 'Archived'}
              </button>
              <label className="project-library-search">
                <Search size={14} />
                <input
                  aria-label="Search projects"
                  placeholder="Search projects"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
          </div>
          {error ? (
            <ErrorState message={error} retry={reload} />
          ) : loading ? (
            <Skeleton />
          ) : !data.projects.length ? (
            <div className="project-library-empty">
              <Folder size={22} />
              <p>
                {query
                  ? 'No projects match your search.'
                  : selectedFolder
                    ? 'This folder is ready for your first project.'
                    : 'Your projects will appear here as you build.'}
              </p>
            </div>
          ) : (
            <div className="project-library-grid">
              {data.projects.map((project) => (
                <article
                  className="library-project"
                  key={project.id}
                  style={{ zIndex: menu === project.id ? 20 : 1 }}
                >
                  <Link className="library-project-link" to={'/projects?chat=' + project.id}>
                    <span className="library-project-icon">
                      <Folder size={20} />
                    </span>
                    <h3>{project.name}</h3>
                    <p>{project.description || 'Blank project'}</p>
                    <small>
                      {folders.find((folder) => folder.id === project.folderId)?.name ||
                        'All projects'}{' '}
                      · {new Date(project.updatedAt).toLocaleDateString()}
                    </small>
                  </Link>
                  <div className="project-menu-wrapper">
                    <button
                      className="icon-button"
                      aria-label={'Actions for ' + project.name}
                      aria-expanded={menu === project.id}
                      onClick={() => setMenu(menu === project.id ? null : project.id)}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    {menu === project.id && (
                      <div className="project-menu">
                        <button
                          disabled={!project.canEdit}
                          onClick={() => {
                            setMenu(null);
                            setRename(project);
                            setNewName(project.name);
                          }}
                        >
                          Rename
                        </button>
                        <button
                          disabled={!project.canEdit}
                          onClick={() => {
                            setMenu(null);
                            setMoving(project);
                            setMoveTo(project.folderId || '');
                          }}
                        >
                          <Folder size={14} />
                          Move to folder
                        </button>
                        <button
                          disabled={!project.canEdit}
                          onClick={async () => {
                            try {
                              await api.post('/projects/' + project.id + '/duplicate');
                              setMenu(null);
                              await Promise.all([reload(), refreshNavigation()]);
                              toast.success('Project duplicated');
                            } catch (error) {
                              toast.error(error.message);
                            }
                          }}
                        >
                          <Copy size={14} />
                          Duplicate
                        </button>
                        <button
                          disabled={!project.canEdit}
                          onClick={() =>
                            update(
                              project,
                              { archived: !project.archived },
                              project.archived ? 'Project restored' : 'Project archived',
                            )
                          }
                        >
                          <Archive size={14} />
                          {project.archived ? 'Unarchive' : 'Archive'}
                        </button>
                        <a href={'/v1/projects/' + project.id + '/export'}>
                          <Download size={14} />
                          Export ZIP
                        </a>
                        <button
                          className="danger-text"
                          disabled={!project.canDelete}
                          onClick={() => {
                            setMenu(null);
                            setDeleting(project);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
          {data?.total > data?.pageSize && (
            <div className="project-pagination">
              <button
                className="secondary-button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} of {Math.ceil(data.total / data.pageSize)}
              </span>
              <button
                className="secondary-button"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}
      <Modal
        open={!!rename}
        onOpenChange={(value) => !value && setRename(null)}
        title="Rename project"
      >
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            update(rename, { name: newName.trim() }, 'Project renamed');
          }}
        >
          <label>
            Project name
            <input
              autoFocus
              required
              maxLength={80}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>
          <button className="primary-button">Save name</button>
        </form>
      </Modal>
      <Modal
        open={!!moving}
        onOpenChange={(value) => !value && setMoving(null)}
        title="Move project"
      >
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            update(moving, { folderId: moveTo || null }, 'Project moved');
          }}
        >
          <label>
            Folder
            <select
              aria-label="Destination folder"
              value={moveTo}
              onChange={(event) => setMoveTo(event.target.value)}
            >
              <option value="">All projects</option>
              {folders
                .filter(
                  (folder) => folder.organizationId === moving?.organizationId && folder.writable,
                )
                .map((folder) => (
                  <option value={folder.id} key={folder.id}>
                    {folder.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="primary-button">Move project</button>
        </form>
      </Modal>
      <Modal
        open={!!deleting}
        onOpenChange={(value) => !value && setDeleting(null)}
        title="Delete project?"
        description="This deletes the project and its source history. External resources must be cleaned up first."
      >
        <button
          className="danger-button"
          onClick={async () => {
            try {
              await api.delete('/projects/' + deleting.id, { data: { confirmation: 'DELETE' } });
              setDeleting(null);
              await Promise.all([reload(), refreshNavigation()]);
              toast.success('Project deleted');
            } catch (error) {
              toast.error(error.message);
            }
          }}
        >
          Delete {deleting?.name}
        </button>
      </Modal>
      <Modal open={blank} onOpenChange={setBlank} title="Create a blank project">
        <form className="form-stack" onSubmit={(event) => create(event, true)}>
          <label>
            Project name
            <input
              autoFocus
              required
              maxLength={80}
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={busy}>
            Create project
            <Plus size={15} />
          </button>
        </form>
      </Modal>
    </main>
  );
}
