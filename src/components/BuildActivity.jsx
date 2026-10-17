import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleAlert,
  FilePenLine,
  GitCompareArrows,
  Globe,
  ListChecks,
  Search,
  TestTubeDiagonal,
  Wrench,
} from 'lucide-react';

const terminal = ['completed', 'failed', 'cancelled'];
export function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60);
  if (hours)
    return `${hours}h ${String(minutes % 60).padStart(2, '0')}m ${String(seconds % 60).padStart(2, '0')}s`;
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
const actions = {
  read: [BookOpen, 'Reading app files', 'Read app files'],
  trace: [Search, 'Checking how the app connects', 'Traced app connections'],
  change: [FilePenLine, 'Editing app files', 'Edited app files'],
  check: [ListChecks, 'Running app checks', 'Ran app checks'],
  test: [TestTubeDiagonal, 'Testing app controls', 'Tested app controls'],
  prepare: [Wrench, 'Preparing app dependencies', 'Prepared app dependencies'],
  research: [Globe, 'Checking references', 'Checked references'],
  plan: [ListChecks, 'Mapping the next steps', 'Mapped the next steps'],
  review: [GitCompareArrows, 'Reviewing changes', 'Reviewed changes'],
  repair: [Wrench, 'Trying a smaller change', 'Prepared a smaller change'],
  work: [Wrench, 'Running an app task', 'Ran an app task'],
};
export function activityBlocks(activity) {
  const blocks = [];
  for (const event of activity) {
    const failed = event.progress?.phase === 'failed' || event.state === 'failed';
    const text = (failed ? event.message : event.progress?.note || event.message).trim();
    const previous = blocks.at(-1);
    // One commentary paragraph can cover several real actions. A failure always stays visible.
    if (!failed && previous?.text === text && !previous.failed) previous.events.push(event);
    else blocks.push({ id: event.id, text, events: [event], failed });
  }
  return blocks;
}
function ActionRow({ events }) {
  const unique = new Map();
  for (const event of events) {
    const p = event.progress;
    if (p && actions[p.action]) unique.set(`${p.action}:${p.phase}`, p);
  }
  if (!unique.size) return null;
  const steps = [...unique.values()];
  const failed = steps.some((s) => s.phase === 'failed');
  const Icon = failed ? CircleAlert : actions[steps[0].action][0];
  const labels = steps.map((s) =>
    s.phase === 'failed'
      ? `${actions[s.action][1]} — needs another pass`
      : actions[s.action][s.phase === 'completed' ? 2 : 1],
  );
  return (
    <div className="build-action-row" data-failed={failed || undefined}>
      <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
      <span>{labels.join(' · ')}</span>
    </div>
  );
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
  const hasElapsed = elapsed != null && Number.isFinite(elapsed);
  return (
    <span className="build-elapsed" aria-live="off">
      {job.state === 'queued'
        ? 'Queued'
        : running
          ? hasElapsed
            ? 'Working for'
            : 'Working'
          : job.state === 'paused'
            ? 'Paused after'
            : 'Worked for'}{' '}
      {hasElapsed && job.state !== 'queued' && <time>{formatDuration(elapsed)}</time>}
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
  const [expanded, setExpanded] = useState(() => !terminal.includes(job?.state));
  const [showEarlier, setShowEarlier] = useState(false);
  if (!job) return null;
  const running = !terminal.includes(job.state) && job.state !== 'paused';
  const activity = compactActivity(events);
  const blocks = activityBlocks(activity);
  const visible = showEarlier ? blocks : blocks.slice(-6);
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
      <details
        className="build-work-thread"
        open={expanded}
        onToggle={(e) => setExpanded(e.currentTarget.open)}
      >
        <summary className="build-run-header">
          <RunClock job={job} />
          <ChevronDown size={14} aria-hidden="true" />
        </summary>
        {blocks.length > 6 && (
          <button
            type="button"
            className="build-earlier"
            onClick={() => setShowEarlier(!showEarlier)}
          >
            {showEarlier ? 'Show fewer updates' : `Show ${blocks.length - 6} earlier updates`}
          </button>
        )}
        <ol className="build-timeline" aria-label="App activity">
          {visible.map((block) => (
            <li
              key={block.id}
              data-phase={block.failed ? 'failed' : block.events.at(-1).progress?.phase}
            >
              <p className="build-update">{block.text}</p>
              <ActionRow events={block.events} />
            </li>
          ))}
          {answers.map((q) => (
            <li key={q.id}>
              <p className="build-update">
                Your answer to “{q.title}”: {q.answer}
              </p>
            </li>
          ))}
        </ol>
        <div
          className={running ? 'agent-working build-live-status' : 'agent-status build-live-status'}
          role="status"
        >
          {running ? (
            <i />
          ) : job.state === 'completed' ? (
            <Check size={14} aria-hidden="true" />
          ) : job.state === 'failed' ? (
            <CircleAlert size={14} aria-hidden="true" />
          ) : null}
          <span>{running && blocks.length ? 'Working' : status}</span>
          {running && lastUpdate && (
            <small className="build-last-update">Last update {lastUpdate}</small>
          )}
        </div>
      </details>
      {job.state === 'completed' && job.result?.changes && (
        <div className="build-change-summary" aria-label="Changes made">
          <FilePenLine size={14} aria-hidden="true" />
          <span>
            {job.result.changes.files} {job.result.changes.files === 1 ? 'file' : 'files'} changed
          </span>
          <span
            className="build-lines-added"
            aria-label={`${job.result.changes.added} lines added`}
          >
            +{job.result.changes.added}
          </span>
          <span
            className="build-lines-removed"
            aria-label={`${job.result.changes.removed} lines removed`}
          >
            −{job.result.changes.removed}
          </span>
        </div>
      )}
      {job.state === 'completed' && <CompletionReport job={job} />}
      {job.state === 'failed' && (
        <p className="build-failure" role="alert">
          {job.error ||
            'I couldn’t finish this change. Your existing app is unchanged; try a smaller first step.'}
        </p>
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
    </div>
  );
}
