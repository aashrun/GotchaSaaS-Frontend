import { submitPromptOnEnter } from '../lib/promptKeyboard';
import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowUp,
  ArrowLeft,
  Code2,
  Monitor,
  Tablet,
  Smartphone,
  RefreshCw,
  Maximize2,
  PanelLeftClose,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Send,
  Sparkles,
  Folder,
  FileCode,
  Lock,
  Unlock,
  Save,
  Download,
  History,
  Database,
  Terminal,
  CheckCircle2,
  Globe,
  Plus,
  X,
  ChevronDown,
  Orbit,
  ShieldCheck,
  AlertTriangle,
  Square,
  Zap,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import VoiceInput from '../components/VoiceInput';
import PromptReferences, { ReferenceChips } from '../components/PromptReferences';
import AgentTools from '../components/AgentTools';
import { useAuth } from '../auth/AuthProvider';
import { Logo, ThemeSwitch, useData, Modal, ErrorState, EmptyState } from '../components/Common';
const CodeEditor = lazy(() => import('../components/CodeEditor'));
const tabs = [
  ['code', 'Code', Code2],
  ['database', 'Database', Database],
  ['tests', 'Tests', CheckCircle2],
  ['logs', 'Logs', Terminal],
  ['history', 'Versions', History],
  ['deployment', 'Publish', Globe],
  ['agent', 'Memory & actions', ShieldCheck],
  ['settings', 'Settings', Settings],
];
export default function Studio() {
  const { id } = useParams(),
    { user, refresh } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const startupHandled = useRef(false);
  const { data, error, loading, reload } = useData('/projects/' + id),
    { data: models } = useData('/ai/models'),
    { data: config } = useData('/config');
  const [prompt, setPrompt] = useState(
      () => sessionStorage.getItem('nebula-studio-prompt:' + id) || '',
    ),
    [modelId, setModelId] = useState('auto'),
    [tab, setTab] = useState('code'),
    [selected, setSelected] = useState('src/App.tsx'),
    [drafts, setDrafts] = useState({}),
    [device, setDevice] = useState('desktop'),
    [leftOpen, setLeftOpen] = useState(true),
    [rightOpen, setRightOpen] = useState(false),
    [leftWidth, setLeftWidth] = useState(315),
    [rightWidth, setRightWidth] = useState(355),
    [templatePreview, setTemplatePreview] = useState(null),
    [preview, setPreview] = useState(null),
    [previewKey, setPreviewKey] = useState(0),
    [runtimeChannel] = useState(() => crypto.randomUUID()),
    [runtimeLease, setRuntimeLease] = useState(null),
    [estimate, setEstimate] = useState(null),
    [busy, setBusy] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false),
    [events, setEvents] = useState([]),
    [checkpoint, setCheckpoint] = useState(false),
    [checkpointName, setCheckpointName] = useState(''),
    [deleteVersion, setDeleteVersion] = useState(null),
    [restore, setRestore] = useState(null),
    [comparison, setComparison] = useState(null),
    [cleanup, setCleanup] = useState(null),
    [resourceModal, setResourceModal] = useState(null),
    [operations, setOperations] = useState([]),
    [mobilePanel, setMobilePanel] = useState('chat');
  const [references, setReferences] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('gotcha-references:' + id)) || [];
    } catch {
      return [];
    }
  });
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  useEffect(() => {
    if (references.length)
      sessionStorage.setItem('gotcha-references:' + id, JSON.stringify(references));
    else sessionStorage.removeItem('gotcha-references:' + id);
  }, [references, id]);
  const frame = useRef(null);
  const p = data?.project,
    current = data?.files.find((f) => f.path === selected),
    active = data?.jobs.find((j) => !['completed', 'failed', 'cancelled'].includes(j.state));
  const canEdit = data && ['owner', 'admin', 'editor'].includes(data.role),
    dirty = current && drafts[selected] !== undefined && drafts[selected] !== current.content;
  const modelReady = models?.models.some((model) => model.configured);
  const sandboxReady = config?.providers.find((provider) => provider.id === 'e2b')?.configured;
  const hasBuild = data?.jobs.some((job) => job.state === 'completed');
  useEffect(() => {
    if (models?.models.length && !modelId)
      setModelId(
        models.models.find((m) => m.configured && m.model === 'openai/gpt-6.1-sol')?.id ||
          models.models.find((m) => m.configured)?.id ||
          models.models[0].id,
      );
  }, [models]);
  useEffect(() => {
    if (!searchParams.get('build') || startupHandled.current || !p || !models || !config) return;
    if (models.models.length && !modelId) return;
    startupHandled.current = true;
    const intent = sessionStorage.getItem('nebula-studio-prompt:' + id) || p.description;
    setPrompt(intent);
    const next = new URLSearchParams(searchParams);
    next.delete('build');
    setSearchParams(next, { replace: true });
    if (
      models.models.some((model) => model.configured) &&
      user.emailVerified &&
      config.providers.find((provider) => provider.id === 'e2b')?.configured &&
      !active &&
      intent?.trim()
    )
      estimateJob(undefined, intent);
  }, [p?.id, models, config, modelId, searchParams]);
  useEffect(() => {
    if (p?.template)
      fetch('/templates/' + p.template + '/preview.html')
        .then((r) => (r.ok ? r.text() : null))
        .then(setTemplatePreview)
        .catch(() => setTemplatePreview(null));
  }, [p?.template]);
  useEffect(() => {
    if (p && p.settings.validatedRevision === p.revision)
      api
        .get('/projects/' + id + '/preview')
        .then((r) => setPreview(r.data.html))
        .catch(() => setPreview(null));
    else setPreview(null);
  }, [p?.revision, p?.settings.validatedRevision]);
  useEffect(() => {
    if (!active || active.state === 'paused') return;
    setEvents([]);
    const source = new EventSource('/v1/ai/jobs/' + active.id + '/events', {
      withCredentials: true,
    });
    source.onmessage = (e) => {
      const event = JSON.parse(e.data);
      setEvents((values) => (values.some((v) => v.id === event.id) ? values : [...values, event]));
    };
    source.addEventListener('done', () => {
      source.close();
      reload();
      sessionStorage.removeItem('nebula-studio-prompt:' + id);
    });
    source.onerror = () => {
      source.close();
      toast.error('Progress connection interrupted. Reload the project to reconnect.');
    };
    return () => source.close();
  }, [active?.id, active?.state]);
  useEffect(() => {
    if (tab === 'deployment' || tab === 'database')
      api
        .get('/resources/' + id)
        .then((r) => setOperations(r.data.operations))
        .catch(() => {});
  }, [tab, id]);
  useEffect(() => {
    let pending = 0;
    const receive = async (event) => {
      const iframe = frame.current?.querySelector('iframe');
      const request = event.data;
      if (
        !iframe ||
        event.source !== iframe.contentWindow ||
        request?.type !== 'nebula:runtime:request' ||
        request.channel !== runtimeChannel ||
        typeof request.id !== 'string' ||
        request.id.length > 50 ||
        pending >= 4
      )
        return;
      pending++;
      let result;
      try {
        result = (
          await api.post('/projects/' + id + '/runtime/request', {
            path: request.path,
            method: request.method,
            body: request.body,
          })
        ).data;
      } catch (error) {
        result = { status: error.response?.status || 502, data: { message: error.message } };
      } finally {
        pending--;
      }
      iframe.contentWindow?.postMessage(
        { type: 'nebula:runtime:result', channel: runtimeChannel, id: request.id, ...result },
        '*',
      );
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [id, runtimeChannel]);
  function resize(side, e) {
    e.preventDefault();
    const x = e.clientX,
      start = side === 'left' ? leftWidth : rightWidth;
    const move = (event) => {
      const next = Math.max(
        250,
        Math.min(500, start + (event.clientX - x) * (side === 'left' ? 1 : -1)),
      );
      side === 'left' ? setLeftWidth(next) : setRightWidth(next);
    };
    const stop = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }
  async function estimateJob(e, initialPrompt = prompt) {
    e?.preventDefault();
    if (voiceBusy || referenceBusy) return;
    if (!modelId) {
      toast.error('An administrator must configure an AI model first.');
      return;
    }
    if (!config?.providers.find((p) => p.id === 'e2b')?.configured) {
      toast.error('The secure E2B sandbox is not configured. No credits were charged.');
      return;
    }
    if (!user.emailVerified) {
      toast.error('Verify your email in Settings before generation.');
      return;
    }
    if (
      Object.keys(drafts).some(
        (path) => drafts[path] !== data.files.find((f) => f.path === path)?.content,
      )
    ) {
      toast.error('Save your source changes before AI generation.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/ai/estimate', {
        projectId: id,
        ...(modelId === 'auto' ? {} : { modelId }),
        engine: 'agent-v1',
        prompt: initialPrompt,
        references,
      });
      setEstimate(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function generate() {
    setBusy(true);
    try {
      await api.post('/ai/jobs', {
        projectId: id,
        ...(modelId === 'auto' ? {} : { modelId }),
        engine: 'agent-v1',
        prompt,
        references,
        idempotencyKey: crypto.randomUUID(),
        maxCredits: estimate.max,
      });
      setEstimate(null);
      sessionStorage.removeItem('nebula-studio-prompt:' + id);
      setPrompt('');
      setReferences([]);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    try {
      await api.put('/projects/' + id + '/files', {
        path: selected,
        content: drafts[selected],
        revision: p.revision,
      });
      setDrafts((values) => {
        const next = { ...values };
        delete next[selected];
        return next;
      });
      await reload();
      toast.success('Source saved. Preview must be rebuilt in the sandbox.');
    } catch (e) {
      toast.error(e.message);
    }
  }
  async function protect(f) {
    try {
      await api.patch('/projects/' + id + '/protection', { path: f.path, protected: !f.protected });
      await reload();
    } catch (e) {
      toast.error(e.message);
    }
  }
  async function resource() {
    setBusy(true);
    try {
      const { data } = await api.post('/resources', {
        projectId: id,
        kind: resourceModal.kind,
        provider: resourceModal.provider,
        idempotencyKey: crypto.randomUUID(),
        confirmation: 'APPROVE PAID RESOURCE',
      });
      toast.success('Resource operation queued');
      setOperations([data.operation, ...operations]);
      setResourceModal(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (error)
    return (
      <div className="studio-error">
        <Link to="/projects">← Your workspace</Link>
        <ErrorState message={error} retry={reload} />
      </div>
    );
  if (loading)
    return (
      <div className="page-loading">
        <span className="orbit-loader" />
        Opening your creative space…
      </div>
    );
  return (
    <div className="studio">
      <header className="studio-header">
        <div>
          <Link className="studio-back icon-button" aria-label="Back to projects" to="/projects">
            <ArrowLeft size={17} />
          </Link>
          <Logo compact />
          <span className="studio-project-name">
            {p.name}
            <small>Revision {p.revision} · saved to your workspace</small>
          </span>
        </div>
        <div className="studio-header-actions">
          <span className="capability-badge">
            <span className="status-dot" />
            {active ? 'Building' : 'Draft workspace'}
          </span>
          <a href={'/v1/projects/' + id + '/export'} className="secondary-button">
            <Download size={15} />
            <span>Export</span>
          </a>
          <button
            className="small-primary"
            onClick={() => {
              setRightOpen(true);
              setTab('deployment');
              setMobilePanel('tools');
            }}
          >
            <Globe size={15} />
            Publish
            <ArrowUpRight size={14} />
          </button>
          <ThemeSwitch
            onChange={async (theme) => {
              try {
                await api.patch('/user/me', { theme });
                await refresh();
              } catch (e) {
                toast.error(e.message);
              }
            }}
          />
        </div>
      </header>
      <div className="studio-mobile-tabs">
        {[
          ['chat', 'Conversation'],
          ['preview', 'Preview'],
          ['tools', 'Source & tools'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={mobilePanel === key ? 'active' : ''}
            onClick={() => {
              setMobilePanel(key);
              if (key === 'tools') setRightOpen(true);
              if (key === 'chat') setLeftOpen(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="studio-grid"
        style={{
          '--chat-width': leftOpen ? leftWidth + 'px' : '0px',
          '--tools-width': rightOpen ? rightWidth + 'px' : '0px',
        }}
      >
        {leftOpen && (
          <aside className={'chat-panel mobile-' + (mobilePanel === 'chat' ? 'visible' : 'hidden')}>
            <div className="panel-heading">
              <span>
                <Sparkles size={16} />
                Your building partner
              </span>
              <button
                className="icon-button"
                aria-label="Collapse conversation"
                onClick={() => setLeftOpen(false)}
              >
                <PanelLeftClose size={17} />
              </button>
            </div>
            <div className="conversation">
              <div className="studio-intro">
                <span className="agent-orb">
                  <Orbit size={25} />
                </span>
                <h2>{hasBuild ? 'What should we ship next?' : 'Your idea is saved.'}</h2>
                <p>
                  {hasBuild
                    ? 'Tell me what to change below. Your verified preview stays beside this conversation.'
                    : 'This is your project workspace: chat on the left, your app on the right. Review the credits, then approve to start building.'}
                </p>
              </div>
              {!active && !hasBuild && (
                <section className="studio-next-step" aria-label="Next step">
                  <span className="eyebrow">
                    {!user.emailVerified ? 'ONE QUICK CHECK' : 'READY WHEN YOU ARE'}
                  </span>
                  <h3>
                    {!user.emailVerified
                      ? 'Verify your email to start.'
                      : !modelReady || !sandboxReady
                        ? 'Connect your build tools.'
                        : 'Let’s build the first version.'}
                  </h3>
                  <p>
                    {!user.emailVerified
                      ? `Send a verification link to ${user.email}. Open it, then check your status here.`
                      : !modelReady || !sandboxReady
                        ? 'Your idea is safe. The platform needs an AI model and build environment before it can run.'
                        : 'The arrow below opens a credit estimate. Approve it to begin; the preview updates when the build passes its checks.'}
                  </p>
                  {!user.emailVerified ? (
                    <div className="studio-next-actions">
                      <button
                        type="button"
                        className="small-primary"
                        disabled={verificationBusy}
                        onClick={async () => {
                          setVerificationBusy(true);
                          try {
                            const { data } = await api.post('/auth/resend-verification');
                            toast.success(
                              data.delivery === 'local'
                                ? 'Verification link is in your development mailbox'
                                : 'Verification email sent. Check your inbox and spam folder.',
                            );
                          } catch (e) {
                            toast.error(e.message);
                          } finally {
                            setVerificationBusy(false);
                          }
                        }}
                      >
                        {verificationBusy ? 'Sending…' : 'Send verification email'}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={async () => {
                          try {
                            await refresh();
                          } catch (e) {
                            toast.error(e.message);
                          }
                        }}
                      >
                        I’ve verified — check status
                      </button>
                      {config?.mailMode === 'local' && (
                        <Link to="/settings">Open development mailbox</Link>
                      )}
                    </div>
                  ) : !modelReady || !sandboxReady ? (
                    <Link className="text-link" to="/integrations">
                      Open Connectors <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="small-primary"
                      disabled={
                        busy || voiceBusy || referenceBusy || !canEdit || prompt.trim().length < 5
                      }
                      onClick={() => estimateJob()}
                    >
                      Review credits & build <ArrowUp size={15} />
                    </button>
                  )}
                </section>
              )}
              {data.messages.map((m) => (
                <article className={'chat-message ' + m.role} key={m.id}>
                  {m.role !== 'user' && <span>GOTCHA SAAS</span>}
                  <p>{m.content}</p>
                </article>
              ))}
              {active && (
                <div className="agent-progress">
                  <div>
                    <span className="orbit-loader small" />
                    <strong>{active.state}</strong>
                  </div>
                  {events.slice(-5).map((e) => (
                    <p key={e.id}>{e.message}</p>
                  ))}
                  {active.state === 'paused' && (
                    <button
                      className="secondary-button"
                      onClick={async () => {
                        try {
                          await api.post('/ai/jobs/' + active.id + '/resume');
                          await reload();
                        } catch (e) {
                          toast.error(e.message);
                        }
                      }}
                    >
                      Resume from checkpoint
                    </button>
                  )}
                  <button
                    className="text-button danger-text"
                    onClick={async () => {
                      try {
                        await api.post('/ai/jobs/' + active.id + '/cancel');
                        toast.info('Cancellation requested');
                        await reload();
                      } catch (e) {
                        toast.error(e.message);
                      }
                    }}
                  >
                    <Square size={12} />
                    Cancel generation
                  </button>
                </div>
              )}
              {data.jobs[0]?.state === 'failed' && (
                <div className="error-state">
                  <AlertTriangle size={17} />
                  <p>{data.jobs[0].error}</p>
                </div>
              )}
              {!data.messages.length && (
                <div className="suggested-prompts">
                  <span className="eyebrow">A FEW PLACES TO START</span>
                  {[
                    'Make the design feel more premium',
                    'Add a search and filter experience',
                    'Improve the mobile layout',
                  ].map((x) => (
                    <button key={x} onClick={() => setPrompt(x)}>
                      {x}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <form className="studio-composer" onSubmit={estimateJob}>
              <textarea
                aria-label="Ask Gotcha to build or edit your app"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should we build next?"
                maxLength={12000}
                disabled={!canEdit || !!active}
                onKeyDown={submitPromptOnEnter}
              />
              <ReferenceChips
                references={references}
                onChange={setReferences}
                disabled={!canEdit || !!active || busy}
              />
              <div className="composer-actions">
                <PromptReferences
                  references={references}
                  onChange={setReferences}
                  onBusy={setReferenceBusy}
                  disabled={!canEdit || !!active || busy}
                />
                <select
                  aria-label="AI model"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                >
                  <option value="auto">Automatic · plan-aware routing</option>
                  {!models?.models.length && <option value="">Models not configured</option>}
                  {models?.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                      {m.configured ? '' : ' · unavailable'}
                    </option>
                  ))}
                </select>
                <VoiceInput
                  disabled={!canEdit || !!active || busy}
                  onBusy={setVoiceBusy}
                  onTranscript={(text) =>
                    setPrompt((value) => (value + (value ? '\n' : '') + text).slice(0, 12000))
                  }
                />
                <button
                  className="prompt-submit"
                  disabled={
                    busy ||
                    voiceBusy ||
                    referenceBusy ||
                    !!active ||
                    !canEdit ||
                    prompt.trim().length < 5
                  }
                  aria-label="Estimate AI generation"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </form>
            <div className="composer-footnote">
              <ShieldCheck size={12} />
              Credit estimate shown before generation
            </div>
          </aside>
        )}
        {leftOpen && (
          <div
            className="resize-handle left"
            role="separator"
            aria-label="Resize conversation"
            aria-orientation="vertical"
            tabIndex="0"
            onPointerDown={(e) => resize('left', e)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setLeftWidth(Math.max(250, leftWidth - 16));
              if (e.key === 'ArrowRight') setLeftWidth(Math.min(500, leftWidth + 16));
            }}
          />
        )}
        <section
          className={'preview-panel mobile-' + (mobilePanel === 'preview' ? 'visible' : 'hidden')}
        >
          <div className="preview-toolbar">
            <div>
              {!leftOpen && (
                <button
                  className="icon-button"
                  aria-label="Show conversation"
                  onClick={() => setLeftOpen(true)}
                >
                  <MessageSquare size={17} />
                </button>
              )}
              <span>
                <span className="status-dot" />
                {preview ? 'Built preview' : 'Starter preview · not built yet'}
              </span>
            </div>
            <div className="device-toggle">
              {[
                ['desktop', Monitor],
                ['tablet', Tablet],
                ['mobile', Smartphone],
              ].map(([key, Icon]) => (
                <button
                  key={key}
                  className={device === key ? 'active' : ''}
                  aria-label={key + ' preview'}
                  aria-pressed={device === key}
                  onClick={() => setDevice(key)}
                >
                  <Icon size={16} />
                </button>
              ))}
            </div>
            <div>
              <button
                className="icon-button"
                aria-label="Refresh preview"
                onClick={() => setPreviewKey((v) => v + 1)}
              >
                <RefreshCw size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Full-screen preview"
                onClick={() =>
                  frame.current
                    ?.requestFullscreen()
                    .catch(() => toast.error('Full-screen is unavailable.'))
                }
              >
                <Maximize2 size={15} />
              </button>
              <button
                className="icon-button"
                aria-label={rightOpen ? 'Collapse source tools' : 'Show source tools'}
                onClick={() => setRightOpen(!rightOpen)}
              >
                {rightOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
              </button>
            </div>
          </div>
          <div className="preview-address">
            <Lock size={11} />
            <span>
              {preview
                ? 'Isolated application preview · current built revision'
                : 'Original frontend template · changes require a sandbox build'}
            </span>
          </div>
          {p.template === 'fullstack' && preview && (
            <div className="preview-runtime-controls">
              <span>
                {runtimeLease
                  ? 'Preview active until ' + new Date(runtimeLease.expiresAt).toLocaleTimeString()
                  : 'Cloud app preview · 14 credits for five minutes'}
              </span>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { data } = await api.post('/projects/' + id + '/runtime/start', {
                      confirmation: 'START PREVIEW',
                      maxCredits: 14,
                    });
                    setRuntimeLease(data.lease);
                    setPreviewKey((value) => value + 1);
                  } catch (e) {
                    toast.error(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Start five-minute preview
              </button>
            </div>
          )}
          <div className={'preview-canvas ' + device} ref={frame}>
            {preview ? (
              <iframe
                key={previewKey}
                title="Application preview"
                srcDoc={
                  p.template === 'fullstack'
                    ? preview.replace(
                        '<head>',
                        '<head><script>window.__NEBULA_RUNTIME_CHANNEL__=' +
                          JSON.stringify(runtimeChannel) +
                          ';</script>',
                      )
                    : preview
                }
                sandbox="allow-scripts allow-forms"
                referrerPolicy="no-referrer"
              />
            ) : p.settings.templatePristine && templatePreview ? (
              <iframe
                key={previewKey}
                title="Original template preview"
                srcDoc={templatePreview}
                sandbox="allow-scripts allow-forms"
                referrerPolicy="no-referrer"
              />
            ) : (
              <EmptyState title="Your source is saved. Let’s verify it." icon={Code2}>
                A current preview requires a successful E2B build. Previous template screenshots are
                not a preview of your changed code.
              </EmptyState>
            )}
          </div>
          <div className="preview-footer">
            <span>
              <ShieldCheck size={13} />
              Browser isolated · external networking blocked
            </span>
            <span>Visual element editing · roadmap</span>
          </div>
        </section>
        {rightOpen && (
          <div
            className="resize-handle right"
            role="separator"
            aria-label="Resize source tools"
            aria-orientation="vertical"
            tabIndex="0"
            onPointerDown={(e) => resize('right', e)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') setRightWidth(Math.min(500, rightWidth + 16));
              if (e.key === 'ArrowRight') setRightWidth(Math.max(250, rightWidth - 16));
            }}
          />
        )}
        {rightOpen && (
          <aside
            className={'tools-panel mobile-' + (mobilePanel === 'tools' ? 'visible' : 'hidden')}
          >
            <div className="tool-tabs" role="tablist" aria-label="Project tools">
              {tabs.map(([key, label, Icon]) => (
                <button
                  role="tab"
                  key={key}
                  aria-selected={tab === key}
                  title={label}
                  className={tab === key ? 'active' : ''}
                  onClick={() => setTab(key)}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
            {tab === 'code' ? (
              <>
                <div className="file-explorer">
                  <div className="explorer-heading">
                    <Folder size={14} />
                    PROJECT FILES<span>{data.files.length}</span>
                  </div>
                  {data.files.map((f) => (
                    <div
                      className={'file-row ' + (f.path === selected ? 'selected' : '')}
                      key={f.id}
                    >
                      <button
                        className="file-name"
                        onClick={() => {
                          setSelected(f.path);
                          setComparison(null);
                        }}
                      >
                        <FileCode size={13} />
                        {f.path}
                        {drafts[f.path] !== undefined && drafts[f.path] !== f.content && (
                          <i className="unsaved-dot" />
                        )}
                      </button>
                      <button
                        className="icon-button file-lock"
                        disabled={!canEdit || !!active}
                        title={
                          f.protected
                            ? 'Protected — click to request unlock'
                            : 'Lock against AI edits'
                        }
                        aria-label={(f.protected ? 'Unlock ' : 'Protect ') + f.path}
                        onClick={() => protect(f)}
                      >
                        {f.protected ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="editor-heading">
                  <span>
                    {selected}
                    {current?.protected && <Lock size={12} />}
                  </span>
                  <button
                    disabled={!dirty || current?.protected || !!active || !canEdit}
                    onClick={save}
                    className="text-button"
                  >
                    <Save size={13} />
                    Save
                  </button>
                </div>
                <div className="source-editor">
                  <Suspense fallback={<p className="muted">Opening source…</p>}>
                    <CodeEditor
                      path={selected}
                      value={drafts[selected] ?? current?.content ?? ''}
                      readOnly={current?.protected || !!active || !canEdit}
                      onChange={(v) => setDrafts((values) => ({ ...values, [selected]: v }))}
                    />
                  </Suspense>
                </div>
                <div className="source-status">
                  <span>
                    {current?.protected
                      ? 'Protected source'
                      : 'Changes saved with a recovery checkpoint'}
                  </span>
                  {dirty && <strong>Unsaved</strong>}
                </div>
              </>
            ) : (
              <div className="tool-content">
                {tab === 'database' && (
                  <>
                    <div className="tool-title">
                      <Database size={23} />
                      <h2>A home for your data.</h2>
                    </div>
                    <p className="muted">
                      Provisioning creates a separate paid resource. Application connectivity,
                      migrations, and generated authentication are not yet available.
                    </p>
                    {data.databases.length ? (
                      data.databases.map((d) => (
                        <div className="panel" key={d.id}>
                          <h3>{d.provider}</h3>
                          <span className="capability-badge">{d.status}</span>
                          <p className="mono">{d.externalId}</p>
                          <p>{d.details.message}</p>
                          <span className="muted">Credentials encrypted · never shown here</span>
                          {canEdit && (
                            <button
                              className="text-button danger-text"
                              onClick={() => setCleanup({ kind: 'database', id: d.id })}
                            >
                              Delete database
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="database-options">
                          {['neon', 'supabase'].map((provider) => (
                            <button
                              className="secondary-button"
                              disabled={!canEdit}
                              key={provider}
                              onClick={() => setResourceModal({ kind: 'database', provider })}
                            >
                              <Database size={18} />
                              {provider === 'neon' ? 'Neon PostgreSQL' : 'Supabase'}
                              <ArrowUpRight size={15} />
                            </button>
                          ))}
                        </div>
                        <div className="notice">
                          <Lock size={17} />
                          <p>
                            Database explorer, table browsing, customer-owned connections, and
                            schema migrations are unavailable in this release.
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}
                {tab === 'tests' && (
                  <>
                    <div className="tool-title">
                      <ShieldCheck size={23} />
                      <h2>Confidence, with evidence.</h2>
                    </div>
                    {!data.tests.length ? (
                      <p className="muted">
                        No sandbox validation has been run yet. No checks are marked passed.
                      </p>
                    ) : (
                      data.tests.map((run) => (
                        <article className="test-run panel" key={run.id}>
                          <small>{new Date(run.createdAt).toLocaleString('en-IN')}</small>
                          {run.results.map((test) => (
                            <div className="check-row" key={test.name}>
                              <span>{test.name}</span>
                              <span className={'test-status ' + test.status}>
                                {test.status.replaceAll('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </article>
                      ))
                    )}
                    <div className="notice">
                      <AlertTriangle size={17} />
                      <p>
                        A successful build is only one check. Runtime behavior, security, and
                        requested functionality must also be verified.
                      </p>
                    </div>
                  </>
                )}
                {tab === 'logs' && (
                  <>
                    <h2>What happened behind the scenes.</h2>
                    {data.tests.length ? (
                      data.tests.map((run) => (
                        <pre className="console-log" key={run.id}>
                          {run.logs || 'No logs recorded.'}
                        </pre>
                      ))
                    ) : (
                      <p className="muted">Build logs appear after a real sandbox run.</p>
                    )}
                    {data.jobs.map((job) => (
                      <div className="job-log" key={job.id}>
                        <small>
                          {job.state} · {job.attempts} attempts · {job.chargedCredits} credits
                          charged
                        </small>
                        {job.error && <pre>{job.error}</pre>}
                      </div>
                    ))}
                  </>
                )}
                {tab === 'history' && (
                  <>
                    <div className="tool-title">
                      <History size={23} />
                      <h2>Room to start again.</h2>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={!canEdit || !!active}
                      onClick={() => setCheckpoint(true)}
                    >
                      <Plus size={16} />
                      Save checkpoint
                    </button>
                    <p className="muted">Restore source without touching live database data.</p>
                    {data.versions.map((v) => (
                      <article className="version-row" key={v.id}>
                        <span className="version-dot" />
                        <div>
                          <h3>{v.name}</h3>
                          <small>
                            Revision {v.revision} · {new Date(v.createdAt).toLocaleString('en-IN')}
                          </small>
                          <div className="stack">
                            <button
                              className="text-link"
                              onClick={async () => {
                                try {
                                  const { data: version } = await api.get(
                                    '/projects/' + id + '/versions/' + v.id,
                                  );
                                  setComparison(version.version);
                                } catch (e) {
                                  toast.error(e.message);
                                }
                              }}
                            >
                              Compare
                            </button>
                            <button
                              className="text-link"
                              disabled={!canEdit || !!active}
                              onClick={() => setRestore(v)}
                            >
                              Restore source
                            </button>
                            {v.source !== 'release' && canEdit && (
                              <button
                                className="text-link danger-text"
                                onClick={() => setDeleteVersion(v)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                    {comparison && (
                      <div className="version-diff">
                        <h3>{comparison.name}</h3>
                        {comparison.files.map((f) => {
                          const present = data.files.find((x) => x.path === f.path);
                          if (present?.content === f.content) return null;
                          return (
                            <details key={f.path}>
                              <summary>{f.path}</summary>
                              <h4>Checkpoint content</h4>
                              <pre>{f.content}</pre>
                              <h4>Current content</h4>
                              <pre>{present?.content || 'File absent'}</pre>
                            </details>
                          );
                        })}
                        {comparison.files.every(
                          (f) => data.files.find((x) => x.path === f.path)?.content === f.content,
                        ) && <p className="muted">Checkpoint files match current source.</p>}
                      </div>
                    )}
                  </>
                )}
                {tab === 'deployment' && (
                  <>
                    <div className="tool-title">
                      <Globe size={23} />
                      <h2>Ready for the world?</h2>
                    </div>
                    <p className="muted">
                      Cloudflare publishing currently supports built frontend applications.
                      Full-stack apps and custom domains are unavailable.
                    </p>
                    <div className="readiness-list">
                      <div className="check-row">
                        <span>Current sandbox build</span>
                        <span
                          className={
                            'test-status ' +
                            (p.settings.validatedRevision === p.revision ? 'passed' : 'not_tested')
                          }
                        >
                          {p.settings.validatedRevision === p.revision ? 'Passed' : 'Not tested'}
                        </span>
                      </div>
                      <div className="check-row">
                        <span>Cloudflare setup</span>
                        <span className="test-status warning">
                          {config?.providers.find((p) => p.id === 'cloudflare')?.configured
                            ? 'Configured · unverified'
                            : 'Not configured'}
                        </span>
                      </div>
                      <div className="check-row">
                        <span>Application behavior</span>
                        <span className="test-status not_tested">Not verified</span>
                      </div>
                    </div>
                    <button
                      className="primary-button"
                      disabled={!canEdit || !!active}
                      onClick={() =>
                        setResourceModal({ kind: 'deployment', provider: 'cloudflare' })
                      }
                    >
                      Review publication
                      <ArrowUpRight size={16} />
                    </button>
                    {data.deployments.map((d) => (
                      <div className="panel" key={d.id}>
                        <span className="capability-badge">{d.status}</span>
                        {d.url && (
                          <a className="text-link" href={d.url} target="_blank" rel="noreferrer">
                            Open public URL
                            <ArrowUpRight size={14} />
                          </a>
                        )}
                        <p>{d.logs}</p>
                        {canEdit && d.status !== 'unpublished' && (
                          <button
                            className="text-button danger-text"
                            onClick={() => setCleanup({ kind: 'deployment', id: d.id })}
                          >
                            Unpublish application
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      className="text-link"
                      onClick={async () => {
                        await reload();
                        const { data } = await api.get('/resources/' + id);
                        setOperations(data.operations);
                      }}
                    >
                      <RefreshCw size={14} />
                      Refresh operation status
                    </button>
                  </>
                )}
                {tab === 'agent' && <AgentTools projectId={id} canEdit={canEdit} />}
                {tab === 'settings' && (
                  <>
                    <h2>Project memory</h2>
                    <p className="muted">Structured context used for future modifications.</p>
                    <pre className="memory-view">{JSON.stringify(p.specification, null, 2)}</pre>
                    <h3>Resource policy</h3>
                    <p className="muted">
                      100 source files · 2 MB source quota · 1 concurrent generation · bounded
                      repair attempts · no model shell access.
                    </p>
                    <a className="secondary-button" href={'/v1/projects/' + id + '/export'}>
                      <Download size={16} />
                      Export complete source
                    </a>
                  </>
                )}
                {['database', 'deployment'].includes(tab) &&
                  operations.map((op) => (
                    <div className="operation-log" key={op.id}>
                      <span className="capability-badge">
                        {op.kind} · {op.state}
                      </span>
                      {op.externalId && <p className="mono">Resource: {op.externalId}</p>}
                      {op.error && <p className="danger-text">{op.error}</p>}
                    </div>
                  ))}
              </div>
            )}
          </aside>
        )}
      </div>
      <Modal
        open={!!cleanup}
        onOpenChange={() => setCleanup(null)}
        title={
          cleanup?.kind === 'database'
            ? 'Delete the database and all data?'
            : 'Unpublish this application?'
        }
        description="This changes live infrastructure. Database deletion is permanent; export and arrange a supported backup before proceeding."
      >
        <button
          className="danger-button"
          onClick={async () => {
            try {
              await api.delete('/resources/' + cleanup.kind + '/' + cleanup.id, {
                data: {
                  confirmation:
                    cleanup.kind === 'database'
                      ? 'DELETE DATABASE AND ALL DATA'
                      : 'UNPUBLISH APPLICATION',
                },
              });
              setCleanup(null);
              await reload();
              toast.success('Resource cleanup confirmed');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          Confirm resource cleanup
        </button>
      </Modal>
      <Modal
        open={!!estimate}
        onOpenChange={() => setEstimate(null)}
        title="A clear view before we begin."
        description="Credits are reserved before generation. Unused reservations are released after reconciliation."
      >
        {estimate?.routing && (
          <p className="muted">
            {estimate.routing.profile} routing · up to {estimate.routing.maxSteps} model calls.{' '}
            {Object.entries(estimate.routing.roles)
              .map(([role, m]) => role + ': ' + m.model)
              .join(' · ')}
          </p>
        )}
        <div className="estimate-amount">
          <Zap size={25} />
          <strong>
            {estimate?.min}–{estimate?.max}
          </strong>
          <span>estimated credits</span>
        </div>
        <p className="muted">
          Maximum reservation: {estimate?.max} credits, including bounded agent work and cloud
          compute. Actual charges use recorded token counts at configured prices. Qualifying
          platform failures waive the customer charge.
        </p>
        <button className="primary-button" disabled={busy} onClick={generate}>
          {busy ? 'Queuing…' : 'Approve & generate'}
          <ArrowUpRight size={16} />
        </button>
      </Modal>
      <Modal
        open={!!deleteVersion}
        onOpenChange={() => setDeleteVersion(null)}
        title="Delete this checkpoint?"
        description="This removes the saved source version. Current source and database data are unchanged."
      >
        <button
          className="danger-button"
          onClick={async () => {
            try {
              await api.delete('/recovery/' + id + '/checkpoints/' + deleteVersion.id, {
                data: { confirmation: 'DELETE CHECKPOINT' },
              });
              setDeleteVersion(null);
              await reload();
              toast.success('Checkpoint deleted');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          Delete checkpoint
        </button>
      </Modal>
      <Modal open={checkpoint} onOpenChange={setCheckpoint} title="A moment worth saving.">
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post('/projects/' + id + '/checkpoints', { name: checkpointName });
              setCheckpoint(false);
              setCheckpointName('');
              await reload();
              toast.success('Checkpoint saved');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          <label>
            Checkpoint name
            <input
              required
              maxLength={80}
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              placeholder="Before the next big change"
            />
          </label>
          <button className="primary-button">Save checkpoint</button>
        </form>
      </Modal>
      <Modal
        open={!!restore}
        onOpenChange={() => setRestore(null)}
        title="Restore this source checkpoint?"
        description="Current source is saved first. Live database data and migrations are never overwritten."
      >
        <p>{restore?.name}</p>
        <button
          className="primary-button"
          onClick={async () => {
            try {
              await api.post('/projects/' + id + '/versions/' + restore.id + '/restore', {
                confirmation: 'RESTORE SOURCE ONLY',
              });
              setDrafts({});
              setRestore(null);
              await reload();
              toast.success('Source restored. Database unchanged.');
            } catch (e) {
              toast.error(e.message);
            }
          }}
        >
          Restore source only
        </button>
      </Modal>
      <Modal
        open={!!resourceModal}
        onOpenChange={() => setResourceModal(null)}
        title={
          resourceModal?.kind === 'database'
            ? 'Review database creation'
            : 'Review frontend publication'
        }
        description="This action creates or changes paid external infrastructure and requires an active subscription, operator permissions, and configured credentials."
      >
        <p className="muted">
          Provider: {resourceModal?.provider}. Provider billing applies. Exact provider charges are
          not available here; review your provider plan before approving.
        </p>
        <p className="muted">
          {resourceModal?.kind === 'database'
            ? 'Provisioning does not yet provide a verified runtime database role, migrations, or application connectivity.'
            : 'A current sandbox build is required. Publishing frontend code does not verify login, database operations, or other full-stack behavior.'}
        </p>
        <button className="primary-button" disabled={busy} onClick={resource}>
          {busy ? 'Queuing…' : 'Approve paid resource'}
          <ArrowUpRight size={16} />
        </button>
      </Modal>
    </div>
  );
}
