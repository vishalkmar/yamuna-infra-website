import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';

// Polls for active SOS alerts and shows a blinking full-screen danger popup at
// reception until acknowledged. Mounted once globally inside the admin layout.
export default function SosAlertWatcher() {
  const [alerts, setAlerts] = useState([]);
  const [busy, setBusy] = useState(false);
  const prevCount = useRef(0);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/sos/alerts/active');
      const list = data.data || [];
      // Beep when a new alert arrives.
      if (list.length > prevCount.current) beep();
      prevCount.current = list.length;
      setAlerts(list);
    } catch { /* ignore transient errors */ }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  async function ack(id) {
    setBusy(true);
    try {
      await api.post(`/admin/sos/alerts/${id}/ack`);
      setAlerts(a => a.filter(x => x.id !== id));
      prevCount.current = Math.max(0, prevCount.current - 1);
    } catch { /* keep showing */ } finally { setBusy(false); }
  }

  if (alerts.length === 0) return null;
  const a = alerts[0]; // show one at a time (most urgent first)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border-4 border-rose-600 animate-[pulse_1s_ease-in-out_infinite]">
        <div className="bg-rose-600 text-white px-6 py-4 flex items-center justify-between">
          <span className="text-2xl font-extrabold tracking-wide">🆘 EMERGENCY SOS</span>
          {alerts.length > 1 && <span className="text-sm bg-white/20 px-2 py-1 rounded">+{alerts.length - 1} more</span>}
        </div>
        <div className="bg-white px-6 py-5">
          <p className="text-sm text-slate-500 mb-3">A resident has triggered an SOS. Dispatch help immediately.</p>
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <Field label="Name" value={a.name} big />
            <Field label="Phone" value={a.phone ? `+91 ${a.phone}` : '—'} big />
            <Field label="Flat / Unit" value={a.flatNo || '—'} big />
            <Field label="Tower" value={a.tower || '—'} />
            <Field label="Floor" value={a.floor || '—'} />
            <Field label="Project" value={a.projectName || '—'} />
          </div>
          {(a.addressLine || a.city) && (
            <div className="mt-3 text-sm text-slate-600">{[a.addressLine, a.city].filter(Boolean).join(', ')}</div>
          )}
          {a.notes && <div className="mt-2 text-sm text-slate-700 bg-slate-50 rounded p-2">“{a.notes}”</div>}
          <div className="text-xs text-slate-400 mt-3">Raised at {new Date(a.createdAt.replace(' ', 'T')).toLocaleTimeString('en-IN')}</div>

          <div className="flex gap-3 mt-5">
            {a.phone && (
              <a href={`tel:${a.phone}`} className="flex-1 text-center px-4 py-3 rounded-xl font-bold text-rose-700 border-2 border-rose-300 hover:bg-rose-50">📞 Call resident</a>
            )}
            <button onClick={() => ack(a.id)} disabled={busy}
              className="flex-1 px-4 py-3 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
              {busy ? 'Working…' : 'OK — Handled'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, big }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`font-bold text-slate-800 ${big ? 'text-xl' : 'text-base'}`}>{value}</div>
    </div>
  );
}

// Play the custom SOS siren (public/sos_alarm.mp3). Falls back to a synthesized
// beep if the file can't be played (e.g. autoplay blocked before any click).
let sosAudio = null;
function beep() {
  try {
    if (!sosAudio) {
      sosAudio = new Audio('/sos_alarm.mp3');
      sosAudio.volume = 1;
    }
    sosAudio.currentTime = 0;
    const p = sosAudio.play();
    if (p && typeof p.catch === 'function') p.catch(() => beepFallback());
  } catch {
    beepFallback();
  }
}

// Synthesized fallback beep via Web Audio (no asset needed).
function beepFallback() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 880;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.25);
    o.onended = () => ctx.close();
  } catch { /* ignore */ }
}
