import { useEffect, useRef, useState } from 'react';

const endpoint = import.meta.env.VITE_AI_VOICE_URL || '/api/ai/voice';

export default function VoiceAgent() {
  const recorder = useRef(null);
  const chunks = useRef([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => recorder.current?.state === 'recording' && recorder.current.stop(), []);

  const start = async () => {
    setError(''); setMessage('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported in this browser.'); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => event.data.size && chunks.current.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setBusy(true);
        try {
          const body = new FormData();
          body.append('audio', new Blob(chunks.current, { type: media.mimeType }), 'staff-voice.webm');
          const token = localStorage.getItem('maccan_token');
          const response = await fetch(endpoint, { method: 'POST', body, headers: token ? { Authorization: `Bearer ${token}` } : {} });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || data.error || `Voice request failed (${response.status})`);
          setMessage(data.reply || data.transcript || data.text || 'Voice request received.');
        } catch (err) { setError(err.message); } finally { setBusy(false); }
      };
      recorder.current = media; media.start(); setRecording(true);
    } catch (err) { setError(err.message || 'Microphone permission was denied.'); }
  };

  const stop = () => { if (recorder.current?.state === 'recording') { recorder.current.stop(); setRecording(false); } };

  return <section className="fixed bottom-5 left-5 z-40 w-80 rounded-2xl border border-[#cfe0c8] bg-[#fbfdf9] p-4 text-[#1e2b2a] shadow-xl ring-1 ring-[#e8f1e5]" dir="rtl">
    <div className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold text-[#2d5016]">سیستم کنترل هوشمند ماکان</h2><p className="text-xs text-[#5a6b68]">دستیار صوتی کارکنان | Staff voice assistant</p></div><span className={recording ? 'h-3 w-3 animate-pulse rounded-full bg-red-500' : 'h-3 w-3 rounded-full bg-slate-300'} /></div>
    <button type="button" onClick={recording ? stop : start} disabled={busy} className={`w-full rounded-lg py-2.5 font-medium text-white ${recording ? 'bg-red-600' : 'bg-[#2d5016]'} disabled:opacity-50`}>{busy ? 'در حال پردازش...' : recording ? '⏹ توقف ضبط | Stop' : '🎙 شروع صحبت | Talk'}</button>
    {message && <p className="mt-3 rounded-lg bg-green-50 p-2 text-sm text-green-800">{message}</p>}
    {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
  </section>;
}
