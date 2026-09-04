import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const endpoint = '/api/ai/voice';

export default function VoiceAgent() {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [textInput, setTextInput] = useState('');
  const [open, setOpen] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [holdText, setHoldText] = useState('');
  const messagesEndRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const streamRef = useRef(null);
  // Race protection: mic startup is async (permission prompt can take seconds).
  // If the user releases the button while we are still starting, we remember it
  // and stop as soon as the mic is ready instead of dropping the recording.
  const startingRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const startedAtRef = useRef(0);
  const sttErrorRef = useRef('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    // Cleanup on unmount
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    if (recorderRef.current?.state === 'recording') try { recorderRef.current.stop(); } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  const addMessage = useCallback((role, text, type = 'response') => {
    setMessages(prev => [...prev, { role, text, type, time: new Date().toLocaleTimeString('fa-IR') }]);
  }, []);

  const removeListeningMessages = useCallback(() => {
    setMessages(prev => prev.filter(m => m.type !== 'listening'));
  }, []);

  // ─── Send text command to backend ───
  const sendMessage = useCallback(async (text, isConfirmation = false) => {
    if (!text.trim() || busy) return;
    setError(''); setBusy(true);

    if (!isConfirmation) addMessage('user', text);

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
  }, [busy, user, addMessage]);


  // ─── Finalize: stop everything and send transcript or audio ───
  const finalizeRecording = useCallback(() => {
    // Stop SpeechRecognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }

    // Stop MediaRecorder (ondataavailable fires the final chunk here)
    if (recorderRef.current) {
      try {
        if (recorderRef.current.state === 'recording') recorderRef.current.stop();
      } catch {}
      recorderRef.current = null;
    }

    // Stop microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setRecording(false);
    startingRef.current = false;

    const finalText = transcriptRef.current.trim();
    const audioSize = chunksRef.current.reduce((sum, c) => sum + c.size, 0);
    const heldLongEnough = Date.now() - startedAtRef.current >= 800;

    if (finalText) {
      // SpeechRecognition worked — send text directly
      removeListeningMessages();
      setHoldText('');
      sendMessage(finalText);
    } else if (audioSize > 0) {
      // SpeechRecognition failed — the audio is NOT transcribed server-side,
      // so sending it would only create phantom orders. Explain instead.
      removeListeningMessages();
      setHoldText('');
      const reason = sttErrorRef.current ? ` (${sttErrorRef.current})` : '';
      addMessage('error', `🎤 صدا ضبط شد ولی متن تشخیص داده نشد${reason}.

دوباره امتحان کنید: دکمه را نگه دارید، واضح صحبت کنید.
اگر کار نکرد، از تایپ یا دکمه‌های سریع استفاده کنید.`, 'error');
    } else if (!heldLongEnough) {
      removeListeningMessages();
      setHoldText('');
      addMessage('error', 'خیلی کوتاه بود. دکمه را نگه دارید و صحبت کنید. | Too short — hold and speak.', 'error');
    } else {
      removeListeningMessages();
      setHoldText('');
      const diag = `[recorder:${typeof MediaRecorder !== 'undefined' ? 'OK' : '—'}, speech:${(window.SpeechRecognition || window.webkitSpeechRecognition) ? 'OK' : '—'}, chunks:${chunksRef.current.length}]`;
      addMessage('error', `صوتی ضبط نشد. دکمه را نگه دارید و صحبت کنید.
(${diag})`, 'error');
    }
  }, [sendMessage, removeListeningMessages, addMessage]);

  // ─── Press: start recording (button is pressed down) ───
  const startRecording = useCallback(async () => {
    if (busy || recording || startingRef.current) return;
    setError('');
    transcriptRef.current = '';
    setHoldText('');
    chunksRef.current = [];
    sttErrorRef.current = '';

    // Mark state immediately so release (even a fast one) is not dropped
    startingRef.current = true;
    stopRequestedRef.current = false;
    startedAtRef.current = Date.now();
    setRecording(true);
    addMessage('user', '🎙 نگه دارید و صحبت کنید...', 'listening');

    try {
      // 1. Get microphone stream (may show a permission prompt — takes time)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // User already released the button while the mic was being granted
      if (stopRequestedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        startingRef.current = false;
        stopRequestedRef.current = false;
        setRecording(false);
        removeListeningMessages();
        setHoldText('');
        return;
      }

      streamRef.current = stream;

      // 2. Start MediaRecorder (captures audio blob as fallback)
      try {
        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
          .find(t => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) || '';
        const media = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        media.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
        media.onerror = () => {};
        // timeslice 500ms: chunks accumulate continuously, so a short recording
        // still produces audio data
        media.start(500);
        recorderRef.current = media;
      } catch {
        // MediaRecorder unsupported — rely on SpeechRecognition only
        recorderRef.current = null;
      }

      // 3. Start SpeechRecognition for live text preview (best-effort)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.lang = 'fa-IR';
          recognition.interimResults = true;
          recognition.continuous = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (event) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript;
            }
            transcriptRef.current = text;
            if (text.trim()) setHoldText(text);
          };

          recognition.onerror = (e) => {
            if (e && e.error) sttErrorRef.current = e.error;
          }; // Record why STT failed so we can explain it
          recognition.onend = () => {}; // Don't auto-stop

          recognition.start();
          recognitionRef.current = recognition;
        } catch {}
      }

      startingRef.current = false;

      // User released during startup — stop right away
      if (stopRequestedRef.current) {
        stopRequestedRef.current = false;
        finalizeRecording();
      }
    } catch (err) {
      startingRef.current = false;
      setRecording(false);
      removeListeningMessages();
      setHoldText('');
      addMessage('error', 'میکروفون در دسترس نیست. لطفاً مجوز میکروفون را بدهید.', 'error');
    }
  }, [busy, recording, addMessage, removeListeningMessages, finalizeRecording]);

  // ─── Release: stop recording & send (button is released) ───
  const stopRecording = useCallback(() => {
    if (!recording) return;
    if (startingRef.current) {
      // Mic still being granted — remember and stop as soon as it's ready
      stopRequestedRef.current = true;
      return;
    }
    stopRequestedRef.current = false;
    finalizeRecording();
  }, [recording, finalizeRecording]);

  if (!user) return null;

  // ─── Quick action buttons (waiter-friendly) ───
  const quickCommands = [
    { label: '📋 سفارش‌ها', cmd: 'orders', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { label: '📦 موجودی', cmd: 'موجودی', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
    { label: '🍳 منو', cmd: 'menu', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
    { label: '🪑 میزها', cmd: 'tables', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
    { label: '🌡️ دما', cmd: 'temperature', color: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100' },
    { label: '❓ کمک', cmd: 'help', color: 'bg-gray-50 text-gray-700 hover:bg-gray-100' },
  ];

  // ─── Order templates (one-tap order for common items) ───
  const orderTemplates = [
    { label: '🥩 کباب برگ', cmd: 'order one barg kebab' },
    { label: '🍗 جوجه', cmd: 'order one saffron chicken kebab' },
    { label: '🥗 سزار', cmd: 'order one caesar salad' },
    { label: '🍚 برنج', cmd: 'order one saffron rice' },
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
          className="fixed bottom-20 left-5 z-40 w-96 max-h-[75vh] rounded-2xl border border-[#cfe0c8] bg-[#fbfdf9] text-[#1e2b2a] shadow-xl ring-1 ring-[#e8f1e5] flex flex-col"
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
                <p className="text-[10px] mt-2 text-[#8a9b98]">
                  🎙 دکمه را نگه دارید و صحبت کنید<br/>
                  یا از دکمه‌های سریع استفاده کنید
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? msg.type === 'listening'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-[#2d5016] text-white'
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
                className={`px-2 py-1 rounded text-xs font-medium hover:shadow-sm disabled:opacity-50 transition-colors ${q.color}`}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Order templates (one-tap quick orders) */}
          <div className="p-2 border-t border-[#dfe7dc]">
            <p className="text-[10px] text-[#8a9b98] mb-1 text-center">⚡ سفارش سریع | Quick Order</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {orderTemplates.map((t) => (
                <button
                  key={t.cmd}
                  type="button"
                  onClick={() => sendMessage(t.cmd)}
                  disabled={busy}
                  className="px-2 py-1 rounded text-xs bg-[#2d5016] text-white hover:bg-[#1f3a0f] disabled:opacity-50"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text input */}
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(textInput); }}
            className="p-3 border-t border-[#dfe7dc] flex gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="تایپ کنید: سفارش میز ۳ دو کباب برگ"
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

          {/* Hold-to-talk voice button */}
          <div className="p-3 border-t border-[#dfe7dc]">
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
              onPointerUp={(e) => { e.preventDefault(); stopRecording(); }}
              onPointerLeave={() => { if (recording) stopRecording(); }}
              onPointerCancel={() => { if (recording) stopRecording(); }}
              onTouchStart={(e) => { if (!e.touches || e.touches.length === 0) return; e.preventDefault(); startRecording(); }}
              onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={busy}
              className={`w-full rounded-lg py-4 font-bold text-white text-base flex items-center justify-center gap-2 select-none transition-all ${
                recording
                  ? 'bg-red-600 shadow-lg shadow-red-300 scale-[1.02] animate-pulse'
                  : 'bg-[#2d5016] hover:bg-[#1f3a0f] active:scale-[0.98]'
              } disabled:opacity-50`}
            >
              {busy ? (
                <>⏳ در حال پردازش...</>
              ) : recording ? (
                <>🔴 رها کنید تا ارسال شود | Release to send</>
              ) : (
                <>🎙 نگه دارید و صحبت کنید | Hold & Talk</>
              )}
            </button>

            {/* Live transcript preview while holding */}
            {recording && (
              <div className="mt-2 text-center">
                <p className="text-[10px] text-[#8a9b98] animate-pulse">🔴 در حال ضبط... نگه دارید</p>
                {holdText && (
                  <p className="text-xs text-[#2d5016] mt-1 font-medium" dir="rtl">
                    📝 {holdText}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}