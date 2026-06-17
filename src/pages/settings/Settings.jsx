import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import { Field, inputClass } from '../../components/FormModal';

const FLAG_LABELS = {
  food: 'Food Ordering', transport: 'Transport', healthcare: 'Healthcare', wellness: 'Wellness',
  mobility: 'Mobility Aids', temples: 'Temples', amenities: 'Amenities', rewards: 'Rewards', community: 'Community',
};

export default function Settings() {
  const toast = useToast();
  const [flags, setFlags] = useState({});
  const [pages, setPages] = useState({ terms: '', privacy: '', about: '' });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      const s = data.data;
      let f = {};
      try { f = JSON.parse(s.feature_flags || '{}'); } catch { f = {}; }
      setFlags(f);
      setPages({ terms: s.page_terms || '', privacy: s.page_privacy || '', about: s.page_about || '' });
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  async function saveFlags() {
    setBusy(true);
    try { await api.put('/admin/settings', { feature_flags: JSON.stringify(flags) }); toast.success('Feature flags saved'); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function savePages() {
    setBusy(true);
    try {
      await api.put('/admin/settings', { page_terms: pages.terms, page_privacy: pages.privacy, page_about: pages.about });
      toast.success('Content pages saved');
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;

  return (
    <div>
      <PageHeader title="App Settings & Content" subtitle="Feature flags, content pages & rotation">
        <Link to="/settings/daily" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Daily content</Link>
        <Link to="/settings/reminders" className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Reminder categories</Link>
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-1">Feature flags</h3>
          <p className="text-xs text-slate-400 mb-3">Turn app sections on/off without an app update.</p>
          <div className="space-y-2">
            {Object.keys(FLAG_LABELS).map(k => (
              <label key={k} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-700">{FLAG_LABELS[k]}</span>
                <input type="checkbox" checked={!!flags[k]} onChange={e => setFlags(f => ({ ...f, [k]: e.target.checked }))} />
              </label>
            ))}
          </div>
          <button onClick={saveFlags} disabled={busy} className="mt-4 bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">Save flags</button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-3">Content pages</h3>
          <div className="space-y-3">
            <Field label="About"><textarea rows={3} className={inputClass} value={pages.about} onChange={e => setPages(p => ({ ...p, about: e.target.value }))} /></Field>
            <Field label="Terms & Conditions"><textarea rows={4} className={inputClass} value={pages.terms} onChange={e => setPages(p => ({ ...p, terms: e.target.value }))} /></Field>
            <Field label="Privacy Policy"><textarea rows={4} className={inputClass} value={pages.privacy} onChange={e => setPages(p => ({ ...p, privacy: e.target.value }))} /></Field>
          </div>
          <button onClick={savePages} disabled={busy} className="mt-4 bg-brand-primary text-white font-semibold px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">Save pages</button>
        </div>
      </div>
    </div>
  );
}
