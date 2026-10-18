import { ThinkingOrb } from 'thinking-orbs';
import { useTheme } from './theme/ThemeProvider';
import useReducedMotion from '../lib/useReducedMotion';

const phases = {
  connecting: ['Connecting', 'connecting'],
  pending: ['Preparing', 'connecting'],
  thinking: ['Thinking', 'solving'],
  reading: ['Reading', 'searching'],
  research: ['Researching', 'searching'],
  editing: ['Editing', 'composing'],
  checking: ['Checking', 'weaving'],
  reviewing: ['Reviewing', 'shaping'],
  queued: ['Queued', 'breathing'],
  executing: ['Executing', 'working'],
};

export function buildPhase(job, latest) {
  if (job.state === 'queued') return 'queued';
  if (job.state === 'planning') return 'pending';
  // A completed tool action is followed by a model call; do not keep claiming it is running.
  if (!latest?.progress || latest.progress.phase !== 'started') return 'thinking';
  return (
    {
      read: 'reading',
      trace: 'reading',
      research: 'research',
      change: 'editing',
      check: 'checking',
      test: 'checking',
      review: 'reviewing',
      prepare: 'pending',
      plan: 'thinking',
      repair: 'editing',
      work: 'executing',
    }[latest.progress.action] || 'executing'
  );
}

export default function ActivityIndicator({ phase = 'thinking', label, children, className = '' }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [text, orb] = phases[phase] || phases.thinking;
  return (
    <div
      className={'activity-indicator ' + className}
      role="status"
      aria-live="polite"
      data-phase={phase}
    >
      <ThinkingOrb size={32} state={orb} theme={theme} paused={reduced} aria-hidden="true" />
      <span className="activity-shimmer">{label || text}</span>
      {children}
    </div>
  );
}
