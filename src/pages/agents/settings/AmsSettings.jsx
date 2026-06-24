import React, { useEffect, useState } from 'react';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import { Field, inputClass } from '../../../components/FormModal';

export default function AmsSettings() {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get('/admin/ams-settings'); setForm(data.data); }
      catch (e) { toast.error(apiError(e, 'Could not load settings')); }
    })();
  }, [toast]);

  async function save() {
    setBusy(true);
    try {
      await api.put('/admin/ams-settings', {
        hold_hours: Number(form.hold_hours) || 48,
        lock_days: Number(form.lock_days) || 0,
        tds_percent: Number(form.tds_percent) || 0,
        self_registration: String(form.self_registration) === 'true' || form.self_registration === true,
      });
      toast.success('Settings saved');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (!form) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="max-w-xl">
      <PageHeader title="AMS Settings" subtitle="Feature flags & defaults for the agent system" />

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <Field label="Unit hold duration (hours)" hint="How long an agent's hold lasts before auto-release (Module 2.2)">
          <input type="number" className={inputClass} value={form.hold_hours} onChange={e => set('hold_hours', e.target.value)} />
        </Field>
        <Field label="Lead ownership lock (days)" hint="A buyer phone stays locked to the registering agent for this long (Module 2.6)">
          <input type="number" className={inputClass} value={form.lock_days} onChange={e => set('lock_days', e.target.value)} />
        </Field>
        <Field label="Default TDS %" hint="Pre-filled when marking a payout paid (Module 4.4)">
          <input type="number" step="0.01" className={inputClass} value={form.tds_percent} onChange={e => set('tds_percent', e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={String(form.self_registration) === 'true' || form.self_registration === true} onChange={e => set('self_registration', e.target.checked)} />
          Allow agent self-registration
        </label>

        <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          {busy ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  );
}
