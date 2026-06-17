import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import { Field, inputClass } from '../../components/FormModal';

export default function FareRules() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/transport/fare-rules');
      const d = data.data;
      setForm({
        surgeMultiplier: Number(d.surgeMultiplier), minFare: Number(d.minFare),
        nightCharge: Number(d.nightCharge), freeKm: Number(d.freeKm),
        nightStartHour: d.nightStartHour, nightEndHour: d.nightEndHour,
      });
    } catch (e) { toast.error(apiError(e)); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try { await api.put('/admin/transport/fare-rules', form); toast.success('Fare rules updated'); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (!form) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <button onClick={() => navigate('/transport')} className="text-sm text-slate-500 hover:text-slate-700 mb-3">← Back to transport</button>
      <PageHeader title="Transport — Fare Rules" subtitle="Global pricing applied to every estimate" />

      <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-lg space-y-4">
        <Field label="Surge multiplier" hint="1.0 = normal, 1.5 = peak"><input type="number" step="0.1" min="0.1" max="5" className={inputClass} value={form.surgeMultiplier} onChange={e => setF('surgeMultiplier', Number(e.target.value))} /></Field>
        <Field label="Minimum fare (₹)"><input type="number" min="0" className={inputClass} value={form.minFare} onChange={e => setF('minFare', Number(e.target.value))} /></Field>
        <Field label="Free km" hint="Distance before per-km kicks in"><input type="number" min="0" step="0.5" className={inputClass} value={form.freeKm} onChange={e => setF('freeKm', Number(e.target.value))} /></Field>
        <Field label="Night charge (₹)" hint="Flat add-on during night hours"><input type="number" min="0" className={inputClass} value={form.nightCharge} onChange={e => setF('nightCharge', Number(e.target.value))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Night starts (hour 0–23)"><input type="number" min="0" max="23" className={inputClass} value={form.nightStartHour} onChange={e => setF('nightStartHour', Number(e.target.value))} /></Field>
          <Field label="Night ends (hour 0–23)"><input type="number" min="0" max="23" className={inputClass} value={form.nightEndHour} onChange={e => setF('nightEndHour', Number(e.target.value))} /></Field>
        </div>
        <button onClick={save} disabled={busy} className="bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">{busy ? 'Saving…' : 'Save fare rules'}</button>
      </div>
    </div>
  );
}
