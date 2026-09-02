import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

const endpoint = '/api/ai/voice';

export default function VoiceAgent() {
  const { user } = useAuth();
  const recorder = useRef(null);
  const chunks = useRef([]);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => recorder.current?.state === 'recording' && recorder.current.stop(), []);

  const addMessage = (role, text, type = 'response') => {
    setMessages(prev => [...prev, { role, text, type, time: new Date().toLocaleTimeString('fa-IR') }]);
  };

  const sendMessage = async (text, isConfirmation = false) => {
    if (!text.trim() || busy) return;
    setError(''); setBusy(true);

    if (!isConfirmation) {
      addMessage('user', text);
    }

    try {
      const token = localStorage.getItem('maccan_token');
      const body = {
        text,
        userId: user?.id,
        organizationId: user?.organizationId,
        locationId: user?.locationId,
        sessionKey: user?.id,
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);

      addMessage('assistant', data.reply, data.type);
      setPendingConfirmation(data.type === 'pending_confirmation');
    } catch (err) {
      setError(err.message);
      addMessage('error', err.message, 'error');
    } finally {
      setBusy(false); setTextInput('');
    }
  };

  const sendAudio = async (blob) => {
    setBusy(true);
    try {
      const token = localStorage.getItem('maccan_token');
      const body = new FormData();
      body.append('audio', blob, 'staff-voice.webm');
      body.append('userId', user?.id || '');
      body.append('organizationId', user?.organizationId || '');
      body.append('locationId', user?.locationId || '');
      body.append('sessionKey', user?.id || '');

      const response = await fetch(endpoint, {
        method: 'POST',
        body,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Voice request failed (${response.status})`);

      addMessage('user', `🎙 ${data.transcript}`);
      addMessage('assistant', data.reply, data.type);
      setPendingConfirmation(data.type === 'pending_confirmation');
    } catch (err) {
      setError(err.message);
      addMessage('error', err.message, 'error');
    } finally { setBusy(false); }
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Microphone not available. Use text input.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      media.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        sendAudio(new Blob(chunks.current, { type: media.mimeType }));
      };
      recorder.current = media; media.start(); setRecording(true);
    } catch (err) { setError(err.message || 'Microphone permission denied.'); }
  };

  const stopRecording = () => { if (recorder.current?.state === 'recording') { recorder.current.stop(); setRecording(false); } };

  if (!user) return null;

  const quickCommands = [
    { label: '📦 موجودی', cmd: 'موجودی' },
    { label: '📋 سفارش‌ها', cmd: 'orders' },
    { label: '🍳 منو', cmd: 'menu' },
    { label: '🌡️ دما', cmd: 'دما' },
    { label: '🪑 میزها', cmd: 'tables' },
    { label: '❓ کمک', cmd: 'help' },
  ];

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 left-5 z-40 w-14 h-14 rounded-full bg-[#2d5016] text-white shadow-xl hover:bg-[#1f3a0f] flex items-center justify-center text-2xl transition-transform hover:scale-110"
        title="دستیار هوشمند ماکان"
      >
        {open ? '✖' : '🎙'}
      </button>

      {/* Panel */}
      {open && (
        <section
          className="fixed bottom-20 left-5 z-40 w-96 max-h-[70vh] rounded-2xl border border-[#cfe0c8] bg-[#fbfdf9] text-[#1e2b2a] shadow-xl ring-1 ring-[#e8f1e5] flex flex-col"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#dfe7dc]">
            <h2 className="font-semibold text-[#2d5016]">سیستم کنترل هوشمند ماکان</h2>
            <p className="text-xs text-[#5a6b68]">دستیار صوتی کارکنان | Staff voice assistant</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[400px]">
            {messages.length === 0 && (
              <div className="text-center text-[#5a6b68] text-sm py-8">
                <p className="text-2xl mb-2">🤖</p>
                <p>سلام {user.firstName}! 👋</p>
                <p className="text-xs mt-1">برای ثبت سفارش صحبت کنید یا تایپ کنید</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#2d5016] text-white'
                    : msg.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : msg.type === 'pending_confirmation'
                    ? 'bg-amber-50 border border-amber-300 text-amber-800'
                    : msg.type === 'confirmation'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-white border border-[#dfe7dc] text-[#1e2b2a]'
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-[#5a6b68]'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#dfe7dc] rounded-lg px-3 py-2 text-sm">
                  <span className="animate-pulse">⏳ در حال پردازش...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Confirmation buttons */}
          {pendingConfirmation && (
            <div className="p-3 border-t border-amber-200 bg-amber-50 flex gap-2">
              <button
                onClick={() => { sendMessage('confirm', true); setPendingConfirmation(false); }}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
              >
                ✅ تأیید و ارسال به آشپزخانه
              </button>
              <button
                onClick={() => { sendMessage('cancel', true); setPendingConfirmation(false); }}
                disabled={busy}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-50"
              >
                ❌ لغو
              </button>
            </div>
          )}

          {/* Quick commands */}
          <div className="p-2 border-t border-[#dfe7dc] flex flex-wrap gap-1">
            {quickCommands.map((q) => (
              <button
                key={q.cmd}
                type="button"
                onClick={() => sendMessage(q.cmd)}
                disabled={busy}
                className="px-2 py-1 rounded text-xs bg-[#e8f1e5] text-[#2d5016] hover:bg-[#d0e4cb] disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(textInput); }}
            className="p-3 border-t border-[#dfe7dc] flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="سفارش صوتی یا متنی..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#cfd9cc] text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
            />
            <button
              type="submit"
              disabled={busy || !textInput.trim()}
              className="px-3 py-2 rounded-lg bg-[#2d5016] text-white text-sm hover:bg-[#1f3a0f] disabled:opacity-50"
            >
              ➤
            </button>
          </form>

          {/* Voice button */}
          <div className="p-3 border-t border-[#dfe7dc]">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={busy}
              className={`w-full rounded-lg py-3 font-medium text-white text-sm ${recording ? 'bg-red-600 animate-pulse' : 'bg-[#2d5016] hover:bg-[#1f3a0f]'} disabled:opacity-50`}
            >
              {busy ? '⏳ در حال پردازش...' : recording ? '⏹ توقف ضبط | Stop' : '🎙 نگه دارید و صحبت کنید | Hold & Talk'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
