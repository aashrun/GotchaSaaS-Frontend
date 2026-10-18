import { submitPromptOnEnter } from '../lib/promptKeyboard';
import { useEffect, useRef, useState, lazy, Suspense, Fragment } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import {
  ArrowUp,
  Check,
  ChevronDown,
  Code2,
  Loader2,
  Monitor,
  Globe,
  RefreshCw,
  Square,
  X,
  PanelLeftClose,
  MessageSquare,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useData, ErrorState, Modal } from './Common';
import VoiceInput from './VoiceInput';
import PromptReferences, { ReferenceChips } from './PromptReferences';
import BuildActivity from './BuildActivity';
import OpeningProject from './OpeningProject';
import AssistantMessage from './AssistantMessage';
const ProjectTools = lazy(() => import('./ProjectTools'));
const terminal = ['completed', 'failed', 'cancelled'];
function storedReferences(id) {
  try {
    return JSON.parse(sessionStorage.getItem('gotcha-references:' + id)) || [];
  } catch {
    return [];
  }
}
function storedAttempt(id) {
  try {
    const value = JSON.parse(sessionStorage.getItem('gotcha-pending-request:' + id));
    return typeof value?.id === 'string' && typeof value?.prompt === 'string' ? value : null;
  } catch {
    return null;
  }
}
export default function ProjectChat({ id }) {
  const { user, refresh } = useAuth();
  const { refreshNavigation } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const { data, error, reload, setData } = useData('/projects/' + id);
  const { data: configuration } = useData('/config');
  const [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(() =>
      sessionStorage.getItem('gotcha-studio-prompt:' + id) && !user.emailVerified
        ? 'Verify your email to start this build. Your idea is saved here.'
        : '',
    );
  const [pendingPrompt, setPendingPrompt] = useState(
    () => sessionStorage.getItem('gotcha-studio-prompt:' + id) || '',
  );
  const [optimistic, setOptimistic] = useState(() =>
    pendingPrompt
      ? {
          id: storedAttempt(id)?.id || crypto.randomUUID(),
          role: 'user',
          content: pendingPrompt,
          restored: true,
        }
      : null,
  );
  const [references, setReferences] = useState(() => storedReferences(id));
  const [referenceBusy, setReferenceBusy] = useState(false),
    [voiceBusy, setVoiceBusy] = useState(false);
  const [events, setEvents] = useState({}),
    [questions, setQuestions] = useState([]),
    [questionId, setQuestionId] = useState(null),
    [answer, setAnswer] = useState(''),
    [answerError, setAnswerError] = useState('');
  const [preview, setPreview] = useState(null),
    [previewOpen, setPreviewOpen] = useState(false),
    [previewKey, setPreviewKey] = useState(0),
    [toolsOpen, setToolsOpen] = useState(false),
    [toolTab, setToolTab] = useState('source'),
    [lease, setLease] = useState(null);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [planningOpen, setPlanningOpen] = useState(false),
    [planAnswer, setPlanAnswer] = useState(''),
    [planError, setPlanError] = useState('');
  const planQuestion = data?.project.settings.buildPlan?.questions.find((q) => !q.answer);
  useEffect(() => {
    setPlanAnswer('');
    setPlanError('');
  }, [planQuestion?.id]);
  const [chatWidth, setChatWidth] = useState(() => {
    const saved = Number(localStorage.getItem('gotcha-preview-chat-width'));
    return saved >= 0.18 && saved <= 0.7 ? saved : 0.46;
  });
  const [chatHidden, setChatHidden] = useState(false),
    [dragging, setDragging] = useState(false);
  const split = useRef(null),
    pointer = useRef(null);
  function resizeChat(value) {
    const hidden = value < 0.14;
    setChatHidden(hidden);
    if (!hidden) {
      const next = Math.max(0.18, Math.min(0.7, value));
      setChatWidth(next);
      localStorage.setItem('gotcha-preview-chat-width', String(next));
    }
  }
  const started = useRef(false),
    submitting = useRef(false),
    seenQuestions = useRef(new Set()),
    attempt = useRef(storedAttempt(id)),
    followBuild = useRef(true),
    bottom = useRef(null),
    iframe = useRef(null),
    previewRevision = useRef(null),
    historyFetched = useRef(new Set());
  const [channel] = useState(() => crypto.randomUUID());
  const project = data?.project;
  const active = data?.jobs.find((j) => !terminal.includes(j.state));
  const pendingTurns =
    data?.turns?.filter((t) => ['pending', 'processing', 'waiting'].includes(t.state)) || [];
  const pendingTurnKey = pendingTurns.map((t) => t.id).join(',');
  useEffect(() => {
    if (!pendingTurnKey) return;
    let checking = false;
    const timer = setInterval(
      async () => {
        if (checking) return;
        checking = true;
        try {
          const { data: next } = await api.get('/ai/turns?projectId=' + id);
          if (
            next.turns.some(
              (t) =>
                ['answered', 'dispatched', 'failed', 'cancelled', 'needs_setup'].includes(
                  t.state,
                ) && pendingTurns.some((p) => p.id === t.id),
            )
          )
            await reload();
          else setData((current) => ({ ...current, turns: next.turns }));
        } catch {
          /* polling retries transient transport errors */
        } finally {
          checking = false;
        }
      },
      active ? 5000 : 1500,
    );
    return () => clearInterval(timer);
  }, [pendingTurnKey, !!active]);
  async function changeQueued(turn, action) {
    try {
      await api.post('/ai/turns/' + turn.id + '/' + action);
      await reload();
    } catch (e) {
      setNotice(e.message);
    }
  }
  const setupTurn = data?.turns?.find((t) => t.state === 'needs_setup');
  useEffect(() => {
    if (setupTurn && planQuestion) setPlanningOpen(true);
  }, [setupTurn?.id, planQuestion?.id]);
  const canEdit = ['owner', 'admin', 'editor'].includes(data?.role);
  const outstanding = questions.filter((q) => q.state === 'pending' && q.jobId === active?.id);
  const question = outstanding.find((q) => q.id === questionId);
  const showQuestion = (q) => {
    setQuestionId(q.id);
    setAnswer('');
    setAnswerError('');
  };
  async function loadQuestions() {
    const result = await api.get('/agent/' + id + '/questions');
    setQuestions(result.data.questions);
  }
  useEffect(() => {
    if (references.length)
      sessionStorage.setItem('gotcha-references:' + id, JSON.stringify(references));
    else sessionStorage.removeItem('gotcha-references:' + id);
  }, [references, id]);
  useEffect(() => {
    loadQuestions().catch(() => {});
  }, [id, active?.id, active?.state]);
  useEffect(() => {
    const next = outstanding.find((q) => !seenQuestions.current.has(q.id));
    if (next && !questionId) {
      seenQuestions.current.add(next.id);
      showQuestion(next);
    }
    if (questionId && !question) setQuestionId(null);
  }, [questions, active?.id, questionId]);
  useEffect(() => {
    if (!data) return;
    const submitted = data.messages.find(
      (m) => m.role === 'user' && m.jobId && m.content === pendingPrompt,
    );
    if (
      !attempt.current &&
      submitted &&
      data.jobs.some(
        (j) => j.id === submitted.jobId && (j.state === 'completed' || !terminal.includes(j.state)),
      )
    ) {
      sessionStorage.removeItem('gotcha-studio-prompt:' + id);
      setPendingPrompt('');
    }
    for (const job of data.jobs.slice(0, 3)) {
      if (!terminal.includes(job.state) || historyFetched.current.has(job.id)) continue;
      historyFetched.current.add(job.id);
      api
        .get('/ai/jobs/' + job.id + '/activity')
        .then((r) => setEvents((v) => ({ ...v, [job.id]: r.data.events })))
        .catch(() => historyFetched.current.delete(job.id));
    }
  }, [data?.jobs, pendingPrompt, id]);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      reload();
      loadQuestions().catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, [active?.id]);
  // Refresh a completed receipt briefly while measured billing finishes committing.
  const unsettled =
    data?.jobs
      .filter((j) => terminal.includes(j.state) && j.result?.settled === false)
      .slice(0, 3)
      .map((j) => j.id)
      .join(',') || '';
  useEffect(() => {
    if (!unsettled) return;
    const timer = setInterval(() => {
      reload();
      refreshNavigation();
      refresh().catch(() => {});
    }, 2000);
    const stop = setTimeout(() => clearInterval(timer), 30000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [unsettled]);
  useEffect(() => {
    if (!active || active.state === 'paused') return;
    const jobId = active.id;
    const source = new EventSource('/v1/ai/jobs/' + jobId + '/events', { withCredentials: true });
    source.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        setEvents((values) => {
          const list = values[jobId] || [];
          return list.some((v) => v.id === event.id)
            ? values
            : { ...values, [jobId]: [...list, event] };
        });
        if (event.message.startsWith('Question:')) loadQuestions().catch(() => {});
      } catch {
        /* polling keeps the chat recoverable after malformed transport data */
      }
    };
    source.addEventListener('done', () => {
      source.close();
      reload();
      loadQuestions().catch(() => {});
      refreshNavigation();
    });
    // EventSource retries a transient disconnect; polling also observes terminal jobs.
    return () => source.close();
  }, [active?.id, active?.state === 'paused']);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [data?.messages.length, active?.id]);
  const liveUpdates = active ? events[active.id]?.length || 0 : 0;
  useEffect(() => {
    if (followBuild.current && liveUpdates)
      bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [liveUpdates]);
  useEffect(() => {
    if (!project || project.settings.validatedRevision !== project.revision) {
      setPreview(null);
      return;
    }
    let alive = true;
    api
      .get('/projects/' + id + '/preview')
      .then((r) => {
        if (!alive) return;
        setPreview(r.data.html);
        if (previewRevision.current !== project.revision) {
          setPreviewOpen(true);
          previewRevision.current = project.revision;
        }
      })
      .catch(() => {
        if (alive) setPreview(null);
      });
    return () => {
      alive = false;
    };
  }, [project?.revision, project?.settings.validatedRevision, id]);
  useEffect(() => {
    let pending = 0,
      alive = true;
    const receive = async (event) => {
      const frame = iframe.current,
        request = event.data;
      if (
        !frame ||
        event.source !== frame.contentWindow ||
        !['gotcha:runtime:request', 'nebula:runtime:request'].includes(request?.type) ||
        request.channel !== channel ||
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
      } catch (e) {
        result = { status: e.response?.status || 502, data: { message: e.message } };
      } finally {
        pending--;
      }
      if (alive && iframe.current === frame)
        frame.contentWindow?.postMessage(
          { type: request.type.replace(':request', ':result'), channel, id: request.id, ...result },
          '*',
        );
    };
    window.addEventListener('message', receive);
    return () => {
      alive = false;
      window.removeEventListener('message', receive);
    };
  }, [id, channel]);
  async function send(event, intent = draft, mode = active ? 'queue' : 'auto') {
    event?.preventDefault();
    const prompt = intent.trim();
    if (submitting.current || !canEdit || voiceBusy || referenceBusy || !prompt.length) return;
    submitting.current = true;
    if (!attempt.current || attempt.current.prompt !== prompt)
      attempt.current = { id: crypto.randomUUID(), prompt };
    sessionStorage.setItem('gotcha-pending-request:' + id, JSON.stringify(attempt.current));
    const priorMessage = data.messages.find(
      (m) =>
        m.role === 'user' &&
        !m.jobId &&
        m.content === prompt &&
        !(data.turns || []).some((t) => t.id === m.id),
    );
    if (priorMessage) {
      attempt.current.id = priorMessage.id;
      sessionStorage.setItem('gotcha-pending-request:' + id, JSON.stringify(attempt.current));
    }
    const submittedMessage = {
      id: priorMessage?.id || attempt.current.id,
      role: 'user',
      content: prompt,
    };
    setOptimistic(submittedMessage);
    setDraft('');
    setBusy(true);
    setNotice('');
    setPendingPrompt(prompt);
    sessionStorage.setItem('gotcha-studio-prompt:' + id, prompt);
    try {
      if (!user.emailVerified) {
        if (!priorMessage) {
          const saved = await api.post('/projects/' + id + '/messages', {
            id: attempt.current.id,
            content: prompt,
          });
          setData((current) => ({
            ...current,
            messages: [...current.messages, saved.data.message],
          }));
        }
        setNotice('Verify your email to start this build. Your idea is saved here.');
        return;
      }
      const { data: accepted } = await api.post('/ai/turns', {
        projectId: id,
        prompt,
        references,
        mode,
        idempotencyKey: attempt.current.id,
      });
      const queuedMessage = {
        ...submittedMessage,
        id: accepted.turn.id,
        jobId: accepted.turn.jobId,
      };
      setOptimistic(queuedMessage);
      setData((current) => ({
        ...current,
        messages: current.messages.some((m) => m.id === queuedMessage.id)
          ? current.messages.map((m) => (m.id === queuedMessage.id ? queuedMessage : m))
          : [...current.messages, queuedMessage],
        turns: [accepted.turn, ...(current.turns || []).filter((t) => t.id !== accepted.turn.id)],
      }));
      setPendingPrompt('');
      setReferences([]);
      sessionStorage.removeItem('gotcha-studio-prompt:' + id);
      sessionStorage.removeItem('gotcha-pending-request:' + id);
      attempt.current = null;
      reload();
      refreshNavigation().catch(() => {});
    } catch (e) {
      setNotice(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!project || started.current || !params.has('build')) return;
    started.current = true;
    const next = new URLSearchParams(params);
    next.delete('build');
    setParams(next, { replace: true });
    send(undefined, sessionStorage.getItem('gotcha-studio-prompt:' + id) || project.description);
  }, [project?.id]);
  async function answerQuestion(event) {
    event.preventDefault();
    if (!answer.trim() || busy) return;
    setBusy(true);
    setAnswerError('');
    try {
      await api.post('/agent/' + id + '/questions/' + question.id + '/answer', {
        answer: answer.trim(),
      });
      setQuestionId(null);
      setAnswer('');
      await loadQuestions();
      await reload();
    } catch (e) {
      setAnswerError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!data)
    return error ? (
      <ErrorState message={error} retry={reload} />
    ) : (
      <OpeningProject prompt={pendingPrompt} message="Opening your chat…" title="Your project" />
    );
  const messages =
    optimistic &&
    !data.messages.some(
      (m) =>
        m.id === optimistic.id ||
        (optimistic.restored && m.role === 'user' && m.content === optimistic.content) ||
        (optimistic.jobId && m.jobId === optimistic.jobId && m.role === 'user'),
    )
      ? [...data.messages, optimistic]
      : data.messages;
  return (
    <main
      ref={split}
      className={
        'project-chat' +
        (preview && previewOpen ? ' with-preview' : '') +
        (previewOpen && chatHidden ? ' chat-hidden' : '') +
        (dragging ? ' resizing-preview' : '')
      }
      style={{ '--chat-width': (chatHidden ? 0 : chatWidth * 100) + '%' }}
    >
      <header className="project-chat-header">
        <span title={project.name}>{project.name}</span>
        <div>
          {preview && (
            <button
              className="icon-button"
              aria-label="Toggle app preview"
              title="App preview"
              onClick={() => setPreviewOpen(!previewOpen)}
            >
              <Monitor size={17} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Show project tools"
            title="Code, checkpoints & connections"
            onClick={() => {
              setToolTab('source');
              setToolsOpen(true);
            }}
          >
            <Code2 size={17} />
          </button>
        </div>
      </header>
      <section
        className="project-chat-column"
        aria-label="Project chat"
        inert={previewOpen && chatHidden}
      >
        <div
          className="project-conversation"
          onScroll={(event) => {
            const el = event.currentTarget;
            followBuild.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
          }}
        >
          {!data.messages.length && (
            <p className="muted">Tell me what you want to ship. We’ll build it here.</p>
          )}
          {messages.map((message) => (
            <Fragment key={message.id}>
              {message.role === 'assistant' ? (
                <AssistantMessage
                  content={message.content}
                  job={data.jobs.find((j) => j.id === message.jobId)}
                />
              ) : (
                <div className={'chat-message ' + message.role}>
                  <p>{message.content}</p>
                </div>
              )}
              {message.jobId && message.role === 'user' && (
                <BuildActivity
                  job={data.jobs.find((j) => j.id === message.jobId)}
                  events={events[message.jobId] || []}
                  answers={questions.filter(
                    (q) => q.jobId === message.jobId && q.state === 'answered',
                  )}
                />
              )}
            </Fragment>
          ))}
          {(notice || (pendingPrompt && !active && !busy)) && (
            <div className="chat-notice" role="status">
              <p>{notice || 'Your idea is saved here. Retry the build when you’re ready.'}</p>
              {!user.emailVerified ? (
                <div className="chat-notice-actions">
                  <button
                    className="text-button"
                    disabled={verificationBusy}
                    onClick={async () => {
                      setVerificationBusy(true);
                      try {
                        await api.post('/auth/resend-verification');
                        setNotice('Verification link sent. Open it, then check your status here.');
                      } catch (e) {
                        setNotice(e.message);
                      } finally {
                        setVerificationBusy(false);
                      }
                    }}
                  >
                    Send verification email
                  </button>
                  <button
                    className="text-button"
                    disabled={verificationBusy}
                    onClick={async () => {
                      setVerificationBusy(true);
                      try {
                        const account = await refresh();
                        setNotice(
                          account?.emailVerified
                            ? 'Email verified. You can continue your build.'
                            : 'Still waiting for verification. Open the link in your email.',
                        );
                      } catch (e) {
                        setNotice(e.message);
                      } finally {
                        setVerificationBusy(false);
                      }
                    }}
                  >
                    I’ve verified — check status
                  </button>
                </div>
              ) : (
                pendingPrompt &&
                !active && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => send(undefined, pendingPrompt)}
                  >
                    Retry this build
                  </button>
                )
              )}
            </div>
          )}
          {error && <ErrorState message={error} retry={reload} />}
          {outstanding.map((q) => (
            <button key={q.id} className="chat-question-chip" onClick={() => showQuestion(q)}>
              <span>
                {q.blocking || active?.state === 'paused'
                  ? 'Waiting for you'
                  : 'Quick question · work continues'}
              </span>
              {q.title}
              <ArrowUp size={14} />
            </button>
          ))}
          {active?.state === 'paused' && !outstanding.length && (
            <div className="chat-notice">
              <p>{active.error || active.stage || 'Paused. Your work is saved.'}</p>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  try {
                    // An interrupted run cannot be resumed safely; stopping releases its hold.
                    await api.post(
                      '/ai/jobs/' +
                        active.id +
                        (active.result?.pauseReason === 'interrupted' ? '/cancel' : '/resume'),
                    );
                    await reload();
                  } catch (e) {
                    setNotice(e.message);
                  }
                }}
              >
                {active.result?.pauseReason === 'interrupted'
                  ? 'Stop this run'
                  : 'Resume saved work'}
              </button>
            </div>
          )}
          <div ref={bottom} />
        </div>
        <div className="chat-composer-wrap">
          {setupTurn && (
            <button
              type="button"
              className="chat-question-chip"
              onClick={() => setPlanningOpen(true)}
            >
              <span>A quick setup question</span>
              {planQuestion?.title || 'Choose how to build your app'}
            </button>
          )}
          {!!data.turns?.filter(
            (t) =>
              t.state === 'waiting' ||
              (active && ['pending', 'processing'].includes(t.state)) ||
              t.state === 'failed',
          ).length && (
            <div className="chat-message-queue" aria-label="Queued messages">
              {data.turns
                .filter(
                  (t) =>
                    t.state === 'waiting' ||
                    (active && ['pending', 'processing'].includes(t.state)) ||
                    t.state === 'failed',
                )
                .slice()
                .reverse()
                .map((t) => (
                  <div key={t.id} className="chat-queued-message">
                    <div>
                      <small>{t.state === 'failed' ? 'Needs attention' : 'Queued'}</small>
                      <p>{t.prompt}</p>
                      {t.error && <span>{t.error}</span>}
                    </div>
                    {t.state !== 'processing' && (
                      <div className="chat-queue-actions">
                        <button
                          type="button"
                          className="text-button"
                          onClick={() => changeQueued(t, 'send-now')}
                        >
                          {t.state === 'failed' ? 'Retry message' : 'Send now'}
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={'Remove queued message: ' + t.prompt}
                          onClick={() => changeQueued(t, 'cancel')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
          <form className="project-composer chat-composer" onSubmit={send}>
            <textarea
              aria-label="Ask Gotcha to build or edit your app"
              placeholder={
                active
                  ? 'Add a follow-up — send to queue it…'
                  : 'Ask Gotcha to build, fix, or improve something…'
              }
              maxLength={12000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={submitPromptOnEnter}
            />
            <ReferenceChips references={references} onChange={setReferences} disabled={busy} />
            <div className="project-composer-actions">
              <PromptReferences
                references={references}
                onChange={setReferences}
                onBusy={setReferenceBusy}
                disabled={busy || !canEdit}
              />
              <div className="composer-send-tools">
                <VoiceInput
                  disabled={busy || !canEdit}
                  onBusy={setVoiceBusy}
                  onTranscript={(text) => setDraft((value) => (value ? value + '\n' : '') + text)}
                />
                {active && (
                  <button
                    type="button"
                    className="icon-button composer-stop"
                    aria-label="Stop building"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.post('/ai/jobs/' + active.id + '/cancel');
                        await reload();
                      } catch (e) {
                        setNotice(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Square size={13} fill="currentColor" />
                  </button>
                )}
                {active && draft.trim() && (
                  <button
                    type="button"
                    className="text-button composer-interrupt"
                    disabled={busy || voiceBusy || referenceBusy || !canEdit}
                    onClick={() => send(undefined, draft, 'interrupt')}
                  >
                    Interrupt & send
                  </button>
                )}
                <button
                  className="primary-button composer-send"
                  aria-label={active ? 'Queue message' : 'Send prompt'}
                  title={active ? 'Queue after this run' : 'Send message'}
                  disabled={busy || voiceBusy || referenceBusy || !canEdit || !draft.trim()}
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
          </form>
          <small className="chat-composer-note">
            Ask a question or request a change. Follow-ups can be queued while your app is being
            built.
          </small>
        </div>
      </section>
      {preview && (
        <div
          className="preview-resizer"
          role="separator"
          aria-label="Resize app preview"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={70}
          aria-valuenow={chatHidden ? 0 : Math.round(chatWidth * 100)}
          tabIndex={previewOpen && !chatHidden ? 0 : -1}
          aria-hidden={!previewOpen || chatHidden}
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            pointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            e.preventDefault();
          }}
          onPointerMove={(e) => {
            if (pointer.current !== e.pointerId) return;
            const box = split.current.getBoundingClientRect();
            resizeChat((e.clientX - box.left) / box.width);
          }}
          onPointerUp={(e) => {
            pointer.current = null;
            setDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={() => {
            pointer.current = null;
            setDragging(false);
          }}
          onKeyDown={(e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
              e.preventDefault();
              resizeChat(
                e.key === 'Home'
                  ? 0
                  : e.key === 'End'
                    ? 0.7
                    : chatWidth + (e.key === 'ArrowLeft' ? -0.05 : 0.05),
              );
            }
          }}
        />
      )}
      {preview && (
        <aside
          className="chat-preview"
          aria-label="App preview"
          aria-hidden={!previewOpen}
          inert={!previewOpen}
        >
          <div className="chat-preview-toolbar">
            <input
              className="preview-address"
              aria-label="App preview address"
              readOnly
              value={new URL('/v1/projects/' + id + '/preview/document', location.origin).href}
            />
            <div>
              <button
                className="icon-button"
                aria-label={chatHidden ? 'Show project chat' : 'Hide project chat'}
                title={chatHidden ? 'Show chat' : 'Expand preview'}
                onClick={() => setChatHidden(!chatHidden)}
              >
                {chatHidden ? <MessageSquare size={16} /> : <PanelLeftClose size={16} />}
              </button>
              <button
                className="icon-button"
                aria-label="Publish app"
                title="Download or publish app"
                onClick={() => {
                  setToolTab('publish');
                  setToolsOpen(true);
                }}
              >
                <Globe size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Reload app preview"
                onClick={() => setPreviewKey((v) => v + 1)}
              >
                <RefreshCw size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Close app preview"
                onClick={() => setPreviewOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
          {project.settings.buildPlan?.target === 'pwa' && (
            <div className="preview-target-note">
              Installable web app
              <button
                className="text-button"
                onClick={async () => {
                  try {
                    const popup = window.open('about:blank', '_blank');
                    if (popup) popup.opener = null;
                    const { data } = await api.post('/projects/' + id + '/pwa-preview');
                    if (popup) popup.location.replace(data.url);
                    else
                      setNotice(
                        'Allow this site to open the install/offline preview, then try again.',
                      );
                  } catch (e) {
                    setNotice(e.message);
                  }
                }}
              >
                Test installation & offline
              </button>
            </div>
          )}
          {['mobile', 'desktop'].includes(project.settings.buildPlan?.target) && (
            <div className="preview-target-note">
              {project.settings.buildPlan.target === 'mobile'
                ? 'Phone UI preview · native device verification is separate'
                : 'Desktop UI preview · installers are built separately'}
              <a href={'/v1/projects/' + id + '/export'}>Download project</a>
            </div>
          )}
          {project.template === 'fullstack' && (
            <div className="chat-preview-runtime">
              <span>
                {lease
                  ? 'Backend active until ' + new Date(lease.expiresAt).toLocaleTimeString()
                  : 'Enable the cloud backend to try login and saved data.'}
              </span>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setLease(
                      (
                        await api.post('/projects/' + id + '/runtime/start', {
                          confirmation: 'START PREVIEW',
                          maxCredits: configuration?.previewLeaseCredits || 14,
                        })
                      ).data.lease,
                    );
                    setPreviewKey((v) => v + 1);
                  } catch (e) {
                    setNotice(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Start backend · {configuration?.previewLeaseCredits || 14} credits / 5 min
              </button>
            </div>
          )}
          <iframe
            key={previewKey}
            ref={iframe}
            className={project.settings.buildPlan?.target === 'mobile' ? 'phone-preview' : ''}
            title="Your app preview"
            sandbox="allow-scripts allow-forms"
            referrerPolicy="no-referrer"
            srcDoc={
              project.template === 'fullstack'
                ? preview.replace(
                    '<head>',
                    '<head><script>window.__GOTCHA_RUNTIME_CHANNEL__=window.__NEBULA_RUNTIME_CHANNEL__=' +
                      JSON.stringify(channel) +
                      ';</script>',
                  )
                : preview
            }
          />
        </aside>
      )}
      <Modal
        open={planningOpen && !!planQuestion}
        onOpenChange={setPlanningOpen}
        title={planQuestion?.title || 'Project setup'}
        description="Choose an option or type your preference. Building waits for this answer; no generation credits have been used."
      >
        {planQuestion && (
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!planAnswer.trim() || busy) return;
              setBusy(true);
              setPlanError('');
              try {
                await api.post('/projects/' + id + '/build-plan/answer', {
                  questionId: planQuestion.id,
                  answer: planAnswer.trim(),
                });
                await reload();
                setPlanningOpen(false);
              } catch (error) {
                setPlanError(error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>{planQuestion.question}</p>
            <div className="agent-answer-options">
              {planQuestion.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={planAnswer === option.value ? 'answer-selected' : ''}
                  aria-pressed={planAnswer === option.value}
                  onClick={() => setPlanAnswer(option.value)}
                >
                  {option.label}
                  {planAnswer === option.value && <Check size={14} />}
                </button>
              ))}
            </div>
            <label>
              Your preference
              <input
                aria-label="Your framework preference"
                maxLength={160}
                value={planAnswer}
                onChange={(e) => setPlanAnswer(e.target.value)}
                placeholder="Or type a different choice…"
              />
            </label>
            {planError && <p role="alert">{planError}</p>}
            <button className="primary-button" disabled={busy || !planAnswer.trim()}>
              Continue
            </button>
          </form>
        )}
      </Modal>
      <Modal
        open={!!question}
        onOpenChange={(open) => !open && setQuestionId(null)}
        title={question?.title || 'A quick question'}
        description={
          question?.blocking || active?.state === 'paused'
            ? 'The build is paused at a saved checkpoint until you answer. You can close this and come back.'
            : 'Independent work continues. Changes that depend on this answer will wait.'
        }
      >
        {question && (
          <form className="form-stack" onSubmit={answerQuestion}>
            <p>{question.question}</p>
            <div className="agent-answer-options">
              {question.options.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={answer === option ? 'answer-selected' : ''}
                  aria-pressed={answer === option}
                  onClick={() => setAnswer(option)}
                >
                  {option}
                  {answer === option && <Check size={14} />}
                </button>
              ))}
            </div>
            <label>
              Your answer
              <textarea
                required
                maxLength={2000}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Choose an option or tell me what you prefer…"
              />
            </label>
            {answerError && <p role="alert">{answerError}</p>}
            <button className="primary-button" disabled={busy || !answer.trim()}>
              {busy ? 'Saving…' : 'Send answer'}
            </button>
          </form>
        )}
      </Modal>
      <Modal
        open={toolsOpen}
        onOpenChange={setToolsOpen}
        title="Project tools"
        description="Your source and checkpoints are saved automatically. Open these when you need more control."
      >
        <Suspense fallback={<p>Opening tools…</p>}>
          <ProjectTools
            data={data}
            reload={reload}
            canEdit={canEdit && !active}
            initialTab={toolTab}
          />
        </Suspense>
      </Modal>
    </main>
  );
}
