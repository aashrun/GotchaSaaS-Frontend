import { submitPromptOnEnter } from '../lib/promptKeyboard';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
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
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { useData, ErrorState, Modal } from './Common';
import VoiceInput from './VoiceInput';
import PromptReferences, { ReferenceChips } from './PromptReferences';
const ProjectTools = lazy(() => import('./ProjectTools'));
const terminal = ['completed', 'failed', 'cancelled'];
function storedReferences(id) {
  try {
    return JSON.parse(sessionStorage.getItem('gotcha-references:' + id)) || [];
  } catch {
    return [];
  }
}
export default function ProjectChat({ id }) {
  const { user, refresh } = useAuth();
  const { refreshNavigation } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const { data, error, reload } = useData('/projects/' + id);
  const { data: configuration } = useData('/config');
  const [draft, setDraft] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(() =>
      sessionStorage.getItem('nebula-studio-prompt:' + id) && !user.emailVerified
        ? 'Verify your email to start this build. Your idea is saved here.'
        : '',
    );
  const [pendingPrompt, setPendingPrompt] = useState(
    () => sessionStorage.getItem('nebula-studio-prompt:' + id) || '',
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
  const started = useRef(false),
    submitting = useRef(false),
    seenQuestions = useRef(new Set()),
    attempt = useRef(null),
    bottom = useRef(null),
    iframe = useRef(null),
    previewRevision = useRef(null),
    historyFetched = useRef(new Set());
  const [channel] = useState(() => crypto.randomUUID());
  const project = data?.project;
  const active = data?.jobs.find((j) => !terminal.includes(j.state));
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
      submitted &&
      data.jobs.some(
        (j) => j.id === submitted.jobId && (j.state === 'completed' || !terminal.includes(j.state)),
      )
    ) {
      sessionStorage.removeItem('nebula-studio-prompt:' + id);
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
        request?.type !== 'nebula:runtime:request' ||
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
          { type: 'nebula:runtime:result', channel, id: request.id, ...result },
          '*',
        );
    };
    window.addEventListener('message', receive);
    return () => {
      alive = false;
      window.removeEventListener('message', receive);
    };
  }, [id, channel]);
  async function send(event, intent = draft) {
    event?.preventDefault();
    const prompt = intent.trim();
    if (submitting.current || active || !canEdit || voiceBusy || referenceBusy || prompt.length < 5)
      return;
    submitting.current = true;
    setBusy(true);
    setNotice('');
    setPendingPrompt(prompt);
    sessionStorage.setItem('nebula-studio-prompt:' + id, prompt);
    try {
      if (!data.messages.some((m) => m.role === 'user' && !m.jobId && m.content === prompt)) {
        if (!attempt.current || attempt.current.prompt !== prompt)
          attempt.current = { id: crypto.randomUUID(), prompt };
        await api.post('/projects/' + id + '/messages', {
          id: attempt.current.id,
          content: prompt,
        });
        await reload();
      }
      if (!user.emailVerified) {
        setNotice('Verify your email to start this build. Your idea is saved here.');
        return;
      }
      const { data: estimate } = await api.post('/ai/estimate', {
        projectId: id,
        engine: 'agent-v1',
        prompt,
        references,
      });
      if (!attempt.current || attempt.current.prompt !== prompt)
        attempt.current = { id: crypto.randomUUID(), prompt };
      await api.post('/ai/jobs', {
        projectId: id,
        engine: 'agent-v1',
        prompt,
        references,
        idempotencyKey: attempt.current.id,
        maxCredits: estimate.max,
      });
      setDraft('');
      setPendingPrompt('');
      setReferences([]);
      sessionStorage.removeItem('nebula-studio-prompt:' + id);
      attempt.current = null;
      await reload();
      await refreshNavigation();
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
    send(undefined, sessionStorage.getItem('nebula-studio-prompt:' + id) || project.description);
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
      <p className="chat-loading" role="status">
        Opening your chat…
      </p>
    );
  return (
    <main className={'project-chat' + (preview && previewOpen ? ' with-preview' : '')}>
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
      <section className="project-chat-column" aria-label="Project chat">
        <div className="project-conversation">
          {!data.messages.length && (
            <p className="muted">Tell me what you want to ship. We’ll build it here.</p>
          )}
          {data.messages.map((message) => (
            <div key={message.id} className={'chat-message ' + message.role}>
              {message.role !== 'user' && <span>GOTCHA SAAS</span>}
              <p>{message.content}</p>
              {message.jobId && message.role === 'user' && (
                <JobActivity
                  job={data.jobs.find((j) => j.id === message.jobId)}
                  events={events[message.jobId] || []}
                />
              )}
            </div>
          ))}
          {busy && !active && (
            <div className="agent-working" role="status">
              <i />
              Preparing your build…
            </div>
          )}
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
          {questions
            .filter((q) => q.state === 'answered' && data.jobs.some((j) => j.id === q.jobId))
            .map((q) => (
              <div className="chat-answer" key={q.id}>
                <small>{q.title}</small>
                <p>{q.answer}</p>
              </div>
            ))}
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
              <p>{active.error || active.stage || 'Work paused. Your source is saved.'}</p>
              <button
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  try {
                    await api.post('/ai/jobs/' + active.id + '/resume');
                    await reload();
                  } catch (e) {
                    setNotice(e.message);
                  }
                }}
              >
                Resume saved work
              </button>
            </div>
          )}
          <div ref={bottom} />
        </div>
        <div className="chat-composer-wrap">
          <form className="project-composer chat-composer" onSubmit={send}>
            <textarea
              aria-label="Ask Gotcha to build or edit your app"
              placeholder={
                active
                  ? 'Your next idea can wait here…'
                  : 'Ask Gotcha to build, fix, or improve something…'
              }
              maxLength={12000}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={submitPromptOnEnter}
            />
            <ReferenceChips
              references={references}
              onChange={setReferences}
              disabled={busy || !!active}
            />
            <div className="project-composer-actions">
              <PromptReferences
                references={references}
                onChange={setReferences}
                onBusy={setReferenceBusy}
                disabled={busy || !!active || !canEdit}
              />
              <span className="chat-routing-label">
                {configuration?.codingPolicy?.developmentOnly ? 'GPT-6 Luna' : 'Auto · specialists'}
              </span>
              <div className="composer-send-tools">
                <VoiceInput
                  disabled={busy || !canEdit}
                  onBusy={setVoiceBusy}
                  onTranscript={(text) => setDraft((value) => (value ? value + '\n' : '') + text)}
                />
                {active ? (
                  <button
                    type="button"
                    className="composer-send"
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
                ) : (
                  <button
                    className="primary-button composer-send"
                    aria-label="Send prompt"
                    disabled={
                      busy || voiceBusy || referenceBusy || !canEdit || draft.trim().length < 5
                    }
                  >
                    {busy ? <Loader2 size={17} /> : <ArrowUp size={18} />}
                  </button>
                )}
              </div>
            </div>
          </form>
          <small className="chat-composer-note">
            Sending starts a build within your available credits. Unused reserved credits return
            after the run.
          </small>
        </div>
      </section>
      {preview && previewOpen && (
        <aside className="chat-preview" aria-label="App preview">
          <div className="chat-preview-toolbar">
            <span>
              <Monitor size={14} /> Preview
            </span>
            <div>
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
                          maxCredits: 14,
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
                Start backend · 14 credits / 5 min
              </button>
            </div>
          )}
          <iframe
            key={previewKey}
            ref={iframe}
            title="Your app preview"
            sandbox="allow-scripts allow-forms"
            referrerPolicy="no-referrer"
            srcDoc={
              project.template === 'fullstack'
                ? preview.replace(
                    '<head>',
                    '<head><script>window.__NEBULA_RUNTIME_CHANNEL__=' +
                      JSON.stringify(channel) +
                      ';</script>',
                  )
                : preview
            }
          />
        </aside>
      )}
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
function JobActivity({ job, events }) {
  if (!job) return null;
  const running = !terminal.includes(job.state) && job.state !== 'paused';
  return (
    <div className="chat-job-activity">
      <div className={running ? 'agent-working' : 'agent-status'} role="status">
        {running ? <i /> : job.state === 'completed' ? <Check size={14} /> : null}
        <span>{events.at(-1)?.message || job.stage || job.state}</span>
      </div>
      {!!events.length && (
        <details>
          <summary>
            Activity <ChevronDown size={12} />
          </summary>
          <ol>
            {events.map((e) => (
              <li key={e.id}>{e.message}</li>
            ))}
          </ol>
        </details>
      )}
      {job.state === 'failed' && (
        <p role="alert">
          {job.error ||
            'The build stopped. Your existing source is preserved. You can send a revised prompt.'}
        </p>
      )}
    </div>
  );
}
