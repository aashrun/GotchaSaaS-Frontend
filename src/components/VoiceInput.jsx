import { useEffect, useRef, useState } from 'react';
import { Mic, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
export function encodeWav(chunks, rate) {
  const source = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    source.set(c, offset);
    offset += c.length;
  }
  const samples = Math.min(120 * 16000, Math.floor((source.length * 16000) / rate)),
    buffer = new ArrayBuffer(44 + samples * 2),
    v = new DataView(buffer);
  const text = (at, value) => {
    for (let i = 0; i < value.length; i++) v.setUint8(at + i, value.charCodeAt(i));
  };
  text(0, 'RIFF');
  v.setUint32(4, buffer.byteLength - 8, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true);
  v.setUint32(28, 32000, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  text(36, 'data');
  v.setUint32(40, samples * 2, true);
  for (let i = 0; i < samples; i++) {
    const start = Math.floor((i * rate) / 16000),
      end = Math.max(start + 1, Math.floor(((i + 1) * rate) / 16000));
    let value = 0;
    for (let j = start; j < Math.min(end, source.length); j++) value += source[j];
    value = Math.max(-1, Math.min(1, value / (end - start)));
    v.setInt16(44 + i * 2, value * (value < 0 ? 32768 : 32767), true);
  }
  return buffer;
}
export default function VoiceInput({ onTranscript, onBusy, disabled = false }) {
  const [state, setState] = useState('idle'),
    [seconds, setSeconds] = useState(0),
    [bars, setBars] = useState(Array(18).fill(3));
  const recording = useRef(null),
    mounted = useRef(true),
    pending = useRef(false),
    callback = useRef({ onTranscript, onBusy });
  callback.current = { onTranscript, onBusy };
  function release() {
    const r = recording.current;
    recording.current = null;
    if (!r) return;
    clearInterval(r.timer);
    cancelAnimationFrame(r.animation);
    r.node?.disconnect();
    r.source?.disconnect();
    r.stream.getTracks().forEach((t) => t.stop());
    r.context.close().catch(() => {});
    return r;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pending.current = false;
      release();
      callback.current.onBusy?.(false);
    };
  }, []);
  async function stop(cancel = false) {
    const r = release();
    if (!r) return;
    pending.current = false;
    if (cancel) {
      setState('idle');
      callback.current.onBusy?.(false);
      return;
    }
    setState('transcribing');
    try {
      const audio = encodeWav(r.chunks, r.context.sampleRate);
      const { data } = await api.post('/voice/transcribe', audio, {
        headers: { 'Content-Type': 'audio/wav', 'x-recording-id': crypto.randomUUID() },
        timeout: 60000,
      });
      if (mounted.current) {
        callback.current.onTranscript(data.text);
        toast.success('Dictation added');
      }
    } catch (e) {
      if (mounted.current) toast.error(e.message);
    } finally {
      if (mounted.current) {
        setState('idle');
        callback.current.onBusy?.(false);
      }
    }
  }
  async function start() {
    if (pending.current) return;
    pending.current = true;
    callback.current.onBusy?.(true);
    setState('starting');
    let stream, context;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error('Microphone access requires HTTPS or localhost.');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      context = new AudioContext();
      await context.audioWorklet.addModule('/voice-worklet.js');
      await context.resume();
      if (!mounted.current) {
        stream.getTracks().forEach((t) => t.stop());
        await context.close();
        return;
      }
      const source = context.createMediaStreamSource(stream),
        node = new AudioWorkletNode(context, 'nebula-recorder'),
        analyser = context.createAnalyser();
      analyser.fftSize = 256;
      const mute = context.createGain();
      mute.gain.value = 0;
      source.connect(node);
      source.connect(analyser);
      node.connect(mute);
      mute.connect(context.destination);
      const r = { stream, context, source, node, chunks: [], samples: 0, started: Date.now() };
      recording.current = r;
      node.port.onmessage = (e) => {
        if (recording.current === r && r.samples < context.sampleRate * 120) {
          r.chunks.push(e.data);
          r.samples += e.data.length;
        }
      };
      const waveform = () => {
        if (recording.current !== r) return;
        const values = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(values);
        setBars(Array.from({ length: 18 }, (_, i) => Math.max(3, values[i * 3] / 8)));
        r.animation = requestAnimationFrame(waveform);
      };
      waveform();
      setSeconds(0);
      setState('recording');
      r.timer = setInterval(() => {
        setSeconds(Math.floor((Date.now() - r.started) / 1000));
        if (Date.now() - r.started >= 120000) stop();
      }, 250);
    } catch (e) {
      stream?.getTracks().forEach((t) => t.stop());
      context?.close().catch(() => {});
      pending.current = false;
      if (mounted.current) {
        setState('idle');
        callback.current.onBusy?.(false);
        toast.error(
          e.name === 'NotAllowedError' ? 'Allow microphone access to use dictation.' : e.message,
        );
      }
    }
  }
  if (state === 'idle')
    return (
      <button
        type="button"
        className="voice-mic icon-button"
        aria-label="Start voice input"
        title="Dictate your prompt"
        disabled={disabled}
        onClick={start}
      >
        <Mic size={17} />
      </button>
    );
  if (state === 'starting' || state === 'transcribing')
    return (
      <span className="voice-recording" role="status">
        <Loader2 size={16} className="voice-spinner" />
        {state === 'starting' ? 'Connecting mic…' : 'Transcribing…'}
      </span>
    );
  return (
    <div className="voice-recording" role="group" aria-label="Voice recording">
      <button
        type="button"
        className="icon-button"
        aria-label="Cancel voice recording"
        onClick={() => stop(true)}
      >
        <X size={16} />
      </button>
      <div className="voice-waveform" aria-hidden="true">
        {bars.map((height, i) => (
          <i key={i} style={{ height }} />
        ))}
      </div>
      <span className="voice-time">
        {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
      </span>
      <button
        type="button"
        className="icon-button"
        aria-label="Finish voice recording"
        onClick={() => stop()}
      >
        <Check size={17} />
      </button>
    </div>
  );
}
