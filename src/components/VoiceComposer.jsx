import { createContext, useContext, useMemo, useRef, useState } from 'react';
import { VoiceBeam } from 'voice-glow';
import { useTheme } from './theme/ThemeProvider';
import useReducedMotion from '../lib/useReducedMotion';

const VoiceFeedback = createContext(null);
export const useVoiceFeedback = () => useContext(VoiceFeedback);

export default function VoiceComposer({ children, ...props }) {
  const { theme } = useTheme();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState('idle');
  const level = useRef(0);
  const feedback = useMemo(() => ({ level, setPhase }), []);
  const processing = phase === 'starting' || phase === 'transcribing';
  return (
    <VoiceFeedback.Provider value={feedback}>
      <VoiceBeam
        className="voice-composer"
        style={{ display: 'block', width: '100%' }}
        data-voice-phase={phase}
        active={phase !== 'idle'}
        motion={() =>
          processing
            ? {
                gather: 1,
                offset: Math.sin(performance.now() / 1100) * 0.7,
                stretch: 0.35,
                heldLevel: 0.45,
                cornerFollow: 0.5,
              }
            : { gather: 0 }
        }
        level={() => level.current}
        theme={theme}
        colorVariant="colorful"
        paused={reduced}
        strength={theme === 'dark' ? 0.85 : 1}
        idle={0.08}
      >
        <form {...props}>{children}</form>
      </VoiceBeam>
    </VoiceFeedback.Provider>
  );
}
