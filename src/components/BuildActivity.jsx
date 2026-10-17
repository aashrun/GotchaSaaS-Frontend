import { useEffect, useState } from 'react';
import { Check, ChevronDown, Clock3, CircleAlert } from 'lucide-react';

const terminal = ['completed', 'failed', 'cancelled'];
export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${String(seconds % 60).padStart(2, '0')}s` : `${seconds}s`;
}
export function compactActivity(events) {
  const meaningful = [...events]
    .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    .filter((e) => e.message && !/^Preparing the next changes\.?$/.test(e.message));
  const groups = [];
  for (const e of meaningful) {
    const key = e.progress
      ? `${e.progress.action}:${e.progress.subject}:${e.progress.note || ''}`
      : e.message;
    if (
      groups.at(-1)?.key === key &&
      !(groups.at(-1)?.progress?.phase === 'failed' && e.progress?.phase !== 'failed')
    )
      groups[groups.length - 1] = { ...e, key };
    else groups.push({ ...e, key });
  }
  return groups;
}
function RunClock({ job }) {
  const [now, setNow] = useState(Date.now());
  const running = !terminal.includes(job.state) && job.state !== 'paused';
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [job.id, running]);
  const timing = job.timing || {};
  const start = timing.startedAt || job.createdAt;
  const end = timing.finishedAt || job.updatedAt;
  const elapsed =
    timing.activeMs != null
      ? timing.activeMs +
        (running && timing.activeSince ? Math.max(0, now - new Date(timing.activeSince)) : 0)
      : (timing.durationMs ??
        (start ? Math.max(0, (running ? now : new Date(end || start)) - new Date(start)) : null));
  if (elapsed == null || !Number.isFinite(elapsed)) return null;
  return (
    <span className="build-elapsed" aria-live="off">
      <Clock3 size={12} />
      {job.state === 'queued'
        ? 'Queued'
        : running
          ? 'Working'
          : job.state === 'paused'
            ? 'Paused after'
            : 'Worked for'}{' '}
      <time>{formatDuration(elapsed)}</time>
    </span>
  );
}
function CompletionReport({ job }) {
  const report = job.result?.report;
  if (!report) return null;
  const sections = [
    ['What’s built', report.built, 'No feature breakdown was recorded.'],
    ['Left out', report.excluded, 'No exclusions were recorded for this run.'],
    ['The approach', report.approach, 'No approach notes were recorded.'],
  ];
  return (
    <section className="build-report" aria-label="Build summary">
      <div className="build-report-heading">
        <Check size={15} />
        <strong>Here’s what landed.</strong>
      </div>
      <div className="build-report-grid">
        {sections.map(([title, items, fallback]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items?.length ? (
              <ul>
                {items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>{fallback}</p>
            )}
          </div>
        ))}
      </div>
      {!!report.checks?.length && (
        <div className="build-report-checks" aria-label="Verified checks">
          {report.checks.map((item, i) => (
            <span key={i}>
              <Check size={12} />
              {item}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
export default function BuildActivity({ job, events, answers = [] }) {
  const [expanded, setExpanded] = useState(false);
  if (!job) return null;
  const running = !terminal.includes(job.state) && job.state !== 'paused';
  const activity = compactActivity(events);
  const latest = activity.at(-1);
  const status =
    job.state === 'failed'
      ? 'This pass stopped before the finish line.'
      : job.state === 'completed'
        ? job.result?.functionalityVerified === true
          ? 'Built, checked, and ready for a look.'
          : 'The build is finished. Take a look.'
        : job.state === 'paused'
          ? job.stage
          : latest?.message || job.stage || 'Getting your build started.';
  const lastUpdate =
    latest?.createdAt &&
    new Date(latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="chat-job-activity" aria-label="Build progress">
      <div className="build-run-header">
        <div className={running ? 'agent-working' : 'agent-status'} role="status">
          {running ? (
            <i />
          ) : job.state === 'completed' ? (
            <Check size={14} />
          ) : job.state === 'failed' ? (
            <CircleAlert size={14} />
          ) : null}
          <span>{status}</span>
        </div>
        <RunClock job={job} />
      </div>
      {running && latest?.progress?.note && latest.progress.phase !== 'started' && (
        <p className="build-current-detail">{latest.progress.note}</p>
      )}
      {running && lastUpdate && (
        <small className="build-last-update">Last update {lastUpdate}</small>
      )}
      {terminal.includes(job.state) && (
        <small className="chat-job-credits">
          {job.result?.settled === false
            ? 'Finalizing credit usage…'
            : job.chargedCredits
              ? `Used ${job.chargedCredits} ${job.chargedCredits === 1 ? 'credit' : 'credits'}`
              : 'No credits used'}
        </small>
      )}
      {job.state === 'completed' && <CompletionReport job={job} />}
      {(!!activity.length || !!answers.length) && (
        <details open={expanded} onToggle={(e) => setExpanded(e.currentTarget.open)}>
          <summary>
            Build activity{' '}
            <span>
              {activity.length} {activity.length === 1 ? 'update' : 'updates'}
            </span>
            <ChevronDown size={12} />
          </summary>
          <ol className="build-timeline">
            {activity.map((e) => (
              <li key={e.id} data-phase={e.progress?.phase || e.state}>
                <span className="build-timeline-marker" aria-hidden="true">
                  {e.progress?.phase === 'failed' || e.state === 'failed' ? (
                    <CircleAlert size={11} />
                  ) : e.progress?.phase === 'completed' || e.state === 'completed' ? (
                    <Check size={11} />
                  ) : null}
                </span>
                <span>{e.progress?.note || e.message}</span>
                {e.createdAt && (
                  <time dateTime={e.createdAt}>
                    {new Date(e.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                )}
              </li>
            ))}
            {answers.map((q) => (
              <li key={q.id}>
                <span className="build-timeline-marker" aria-hidden="true">
                  <Check size={11} />
                </span>
                <span>
                  Your answer to “{q.title}”: {q.answer}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
      {job.state === 'failed' && (
        <p className="build-failure" role="alert">
          {job.error ||
            'I couldn’t finish this change. Your existing app is unchanged; try a smaller first step.'}
        </p>
      )}
    </div>
  );
}
