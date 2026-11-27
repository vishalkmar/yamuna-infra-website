import React, { useEffect, useRef, useState, useCallback } from 'react';
import api, { apiError } from '../../lib/api';
import { useToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../components/FormModal';

const TEXT_TYPES = ['text', 'faq', 'url'];
const FILE_TYPES = ['pdf', 'docx', 'excel', 'csv'];
const TYPE_LABEL = { text: 'Text', faq: 'FAQ', url: 'URL', instruction: 'Instruction', pdf: 'PDF', docx: 'DOCX', excel: 'Excel', csv: 'CSV' };

export default function Ai() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('knowledge');
  const [sources, setSources] = useState([]);
  const [ready, setReady] = useState({ llm: false, emb: false, pinecone: false });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [asUser, setAsUser] = useState('');
  const [residents, setResidents] = useState([]);
  const [health, setHealth] = useState(null);
  const [checking, setChecking] = useState(false);
  const [caps, setCaps] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/sources');
      setSources(data.data.sources);
      setReady({ llm: data.data.llmReady, emb: data.data.embeddingsReady, pinecone: data.data.pineconeReady });
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.get('/admin/ai/capabilities').then(r => setCaps(r.data.data)).catch(() => {});
    api.get('/admin/users', { params: { pageSize: 100 } }).then(r => setResidents(r.data.data.rows || [])).catch(() => {});
  }, []);

  // Live probe of every model in the chain + embeddings + Pinecone.
  const checkHealth = useCallback(async () => {
    setChecking(true);
    try { const { data } = await api.get('/admin/ai/health', { timeout: 60000 }); setHealth(data.data); }
    catch (e) { toast.error(apiError(e, 'Health check failed')); } finally { setChecking(false); }
  }, [toast]);
  useEffect(() => { if (tab === 'health' && !health) checkHealth(); }, [tab, health, checkHealth]);
  const setF = (k, v) => setModal(m => ({ ...m, form: { ...m.form, [k]: v } }));

  async function save() {
    const { mode, form, id } = modal;
    setBusy(true);
    try {
      if (mode === 'create') await api.post('/admin/ai/sources', form);
      else await api.put(`/admin/ai/sources/${id}`, form);
      toast.success(`Saved & indexed`);
      setModal(null); load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true);
    try { await api.delete(`/admin/ai/sources/${del.id}`); toast.success('Deleted'); setDel(null); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function reindex() {
    setBusy(true);
    try { const { data } = await api.post('/admin/ai/reindex'); toast.success(`Reindexed ${data.data.sources} source(s), ${data.data.chunks} chunk(s)`); load(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', uploadTitle || file.name);
      const { data } = await api.post('/admin/ai/sources/upload', fd);
      toast.success(`Imported (${data.data.chars} chars) & indexed`);
      setUploadTitle(''); load();
    } catch (err) { toast.error(apiError(err, 'Import failed')); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function ask() {
    if (!q.trim()) return;
    setThinking(true); setAnswer(null);
    try { const { data } = await api.post('/admin/ai/chat', { message: q, asUserId: asUser ? Number(asUser) : null }, { timeout: 60000 }); setAnswer(data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setThinking(false); }
  }

  const knowledge = sources.filter(s => s.type !== 'instruction');
  const instructions = sources.filter(s => s.type === 'instruction');

  const sourceColumns = [
    { key: 'title', header: 'Source', render: r => (
      <div>
        <div className="font-medium text-slate-800">{r.title}</div>
        <div className="text-xs text-slate-400 line-clamp-1">{r.filename || r.preview}</div>
      </div>
    ) },
    { key: 'type', header: 'Type', render: r => <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{TYPE_LABEL[r.type] || r.type}</span> },
    { key: 'charCount', header: 'Chars', render: r => (r.charCount || 0).toLocaleString() },
    { key: 'chunkCount', header: 'Chunks' },
    { key: 'isActive', header: 'Status', render: r => <StatusBadge status={r.isActive ? 'active' : 'inactive'}>{r.isActive ? 'Active' : 'Off'}</StatusBadge> },
  ];

  const rowActions = r => (
    <div className="flex justify-end gap-3">
      <button onClick={() => setModal({ mode: 'edit', id: r.id, form: { type: r.type, title: r.title, content: r.content || '', isActive: !!r.isActive } })} className="text-slate-600 hover:underline">Edit</button>
      <button onClick={() => setDel(r)} className="text-rose-600 hover:underline">Delete</button>
    </div>
  );

  return (
    <div>
      <PageHeader title="AI Concierge (RAG)" subtitle="Train the Vrindavan Companion chatbot — text, files, URLs & instructions">
        <button onClick={reindex} disabled={busy} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50">↻ Reindex all</button>
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-3 text-xs">
        <span className={`px-2 py-1 rounded ${ready.llm ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>LLM {ready.llm ? 'connected' : 'fallback mode'}</span>
        <span className={`px-2 py-1 rounded ${ready.emb ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>Embeddings {ready.emb ? 'connected' : 'keyword fallback'}</span>
        <span className={`px-2 py-1 rounded ${ready.pinecone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>Pinecone {ready.pinecone ? 'connected' : 'off (using in-DB vectors)'}</span>
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-700" title="The bot pulls real-time data from these read APIs based on the question">⚡ Live APIs: {caps ? caps.tools.map(t => t.name.replace('_', ' ')).join(' · ') : '…'}</span>
        {caps && <span className="px-2 py-1 rounded bg-violet-100 text-violet-700" title={'Fallbacks: ' + caps.models.fallbacks.join(', ')}>🧠 {caps.models.primary.split('/').pop()} + {caps.models.fallbacks.length} fallback(s)</span>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {[['knowledge', `📚 Knowledge (${knowledge.length})`], ['instructions', `📋 Instructions (${instructions.length})`], ['guide', `🛕 Built-in Braj guide (${caps?.guide.length || 0})`], ['test', '🧪 Test console'], ['health', '🩺 Model health']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === k ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{label}</button>
        ))}
      </div>

      {tab === 'knowledge' && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button onClick={() => setModal({ mode: 'create', form: { type: 'faq', title: '', content: '', isActive: true } })} className="bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90">+ Add text / FAQ</button>
            <button onClick={() => setModal({ mode: 'create', form: { type: 'url', title: '', content: '', isActive: true } })} className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">+ Add from URL</button>
            <div className="flex items-center gap-2 ml-auto">
              <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} placeholder="File title (optional)" className="text-sm border border-slate-300 rounded-lg px-3 py-2 w-48" />
              <button onClick={() => fileRef.current?.click()} disabled={busy} className="px-4 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50">⬆ Import file (PDF/DOCX/Excel/CSV)</button>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt" className="hidden" onChange={uploadFile} />
            </div>
          </div>
          <DataTable columns={sourceColumns} rows={knowledge} loading={loading} empty="No knowledge yet — add FAQ text, import a file, or pull a URL" actions={rowActions} />
        </div>
      )}

      {tab === 'instructions' && (
        <div>
          <p className="text-sm text-slate-500 mb-3">Instructions are <b>always</b> sent to the bot (tone, rules, do/don’t) — not just when relevant.</p>
          <button onClick={() => setModal({ mode: 'create', form: { type: 'instruction', title: '', content: '', isActive: true } })} className="bg-brand-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 mb-4">+ Add instruction</button>
          <DataTable columns={sourceColumns} rows={instructions} loading={loading} empty="No instructions yet" actions={rowActions} />
        </div>
      )}

      {tab === 'guide' && (
        <div>
          <p className="text-sm text-slate-500 mb-3">
            Built into the bot — always available, even with an empty knowledge base. Your own knowledge &amp; instructions
            <b> always rank above</b> this guide, so add an FAQ to override any detail (e.g. this season&apos;s exact aarti timings).
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {(caps?.guide || []).map(g => (
              <details key={g.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer font-semibold text-slate-800">🛕 {g.title}</summary>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{g.text}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      {tab === 'test' && (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-1">🧪 Test console</h3>
            <p className="text-xs text-slate-400 mb-3">Ask as a resident would. Pick a resident to also test personal questions (their payments, dues, property, dockets).</p>
            <div className="flex flex-wrap gap-2 mb-2">
              <select value={asUser} onChange={e => setAsUser(e.target.value)} className="text-sm border border-slate-300 rounded-lg px-3 py-2">
                <option value="">Anonymous (no personal data)</option>
                {residents.map(r => <option key={r.id} value={r.id}>👤 {r.name || r.mobile}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} className={inputClass} placeholder="e.g. Bihari ji ki shayan aarti kab hai? / Meri agli kist kab hai?" />
              <button onClick={ask} disabled={thinking} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap">{thinking ? 'Thinking…' : 'Ask'}</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {['Bihari ji ki shayan aarti kab hai?', 'Govardhan parikrama kitne km ki hai?', 'Emergency number kya hai?', 'Meri agli kist kab hai aur kitna baaki hai?', 'Aaj kaun se doctor available hain?', 'Satvik tiffin plan kitne ka hai?'].map(s => (
                <button key={s} onClick={() => setQ(s)} className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">{s}</button>
              ))}
            </div>
            {answer && (
              <div className="mt-4">
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap">{answer.answer || 'No answer.'}</div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">Mode: <b>{answer.mode}</b></span>
                  {answer.model && <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700">🧠 {answer.model}</span>}
                  {answer.ms != null && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">⏱ {(answer.ms / 1000).toFixed(1)}s</span>}
                  {answer.live?.length > 0 && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">⚡ {answer.live.join(', ')}</span>}
                  {answer.personal && <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">👤 used resident&apos;s own data</span>}
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-2">📎 What the bot used</h3>
            {!answer ? <p className="text-sm text-slate-400">Ask something to see the retrieved knowledge.</p>
              : answer.retrieved?.length ? (
                <ul className="space-y-2">
                  {answer.retrieved.map((c, i) => (
                    <li key={i} className="border border-slate-100 rounded-lg p-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-700 truncate">{c.sourceTitle}</span>
                        <span className={`px-1.5 rounded ${c.via === 'guide' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{c.via} · {Number(c.score).toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-4">{c.text}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-slate-400">No knowledge chunks — answered from live data / resident data.</p>}
          </div>
        </div>
      )}

      {tab === 'health' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-slate-800">🩺 Model health</h3>
              <p className="text-xs text-slate-400">Live probe of each model in the chain. NVIDIA retires free models without notice — a red row here means switch LLM_MODEL / LLM_FALLBACK_MODELS on the server.</p>
            </div>
            <button onClick={checkHealth} disabled={checking} className="px-3 py-2 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap">{checking ? 'Checking…' : '↻ Re-check'}</button>
          </div>
          {!health ? <p className="text-sm text-slate-400">{checking ? 'Probing models…' : '—'}</p> : (
            <>
              <div className={`mb-3 px-3 py-2 rounded-lg text-sm font-semibold ${health.healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {health.healthy ? '✅ Chatbot is healthy' : '⚠️ Chatbot is degraded — check the rows below'}
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-slate-500"><th className="py-1">Component</th><th>Status</th><th className="text-right">Latency</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {health.llm.models.map(m => (
                    <tr key={m.model}>
                      <td className="py-2">{m.primary ? '⭐ ' : '↳ '}{m.model}</td>
                      <td><StatusBadge status={m.ok ? 'active' : 'failed'}>{m.ok ? 'OK' : 'Down'}</StatusBadge></td>
                      <td className="text-right text-slate-500">{(m.ms / 1000).toFixed(1)}s</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2">🔎 Embeddings · {health.llm.embeddings.model} ({health.llm.embeddings.dim || '—'} dims)</td>
                    <td><StatusBadge status={health.llm.embeddings.ok ? 'active' : 'failed'}>{health.llm.embeddings.ok ? 'OK' : 'Down'}</StatusBadge></td>
                    <td className="text-right text-slate-500">{health.llm.embeddings.ms != null ? `${(health.llm.embeddings.ms / 1000).toFixed(1)}s` : '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2">🌲 Pinecone vector DB</td>
                    <td><StatusBadge status={health.pinecone.ok ? 'active' : health.pinecone.configured ? 'failed' : 'inactive'}>{health.pinecone.ok ? 'OK' : health.pinecone.configured ? 'Error' : 'Not configured'}</StatusBadge></td>
                    <td className="text-right text-slate-400 text-xs">{health.pinecone.error || ''}</td>
                  </tr>
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {modal && (
        <FormModal open wide
          title={modal.mode === 'create'
            ? (modal.form.type === 'instruction' ? 'Add instruction' : modal.form.type === 'url' ? 'Add from URL' : 'Add knowledge')
            : 'Edit source'}
          onClose={() => setModal(null)} onSubmit={save} submitting={busy} submitLabel="Save & index">
          {modal.mode === 'create' && TEXT_TYPES.includes(modal.form.type) && (
            <Field label="Type">
              <select className={inputClass} value={modal.form.type} onChange={e => setF('type', e.target.value)}>
                <option value="faq">FAQ</option><option value="text">Text</option><option value="url">URL</option>
              </select>
            </Field>
          )}
          <Field label="Title" required><input className={inputClass} value={modal.form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Clubhouse rules" /></Field>
          {modal.form.type === 'url' ? (
            <Field label="Page URL" hint="We'll fetch & extract the page text" required>
              <input className={inputClass} value={modal.form.content} onChange={e => setF('content', e.target.value)} placeholder="https://…" />
            </Field>
          ) : (
            <Field label={modal.form.type === 'instruction' ? 'Instruction' : 'Content'} hint={FILE_TYPES.includes(modal.form.type) ? 'Imported file text (editable)' : 'Chunked + embedded for retrieval'} required>
              <textarea rows={modal.form.type === 'instruction' ? 4 : 10} className={inputClass} value={modal.form.content} onChange={e => setF('content', e.target.value)} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={modal.form.isActive} onChange={e => setF('isActive', e.target.checked)} /> Active (used by the bot)</label>
        </FormModal>
      )}

      <ConfirmDialog open={!!del} title="Delete source?" message={del ? `"${del.title}" and its chunks will be removed.` : ''} confirmLabel="Delete" danger busy={busy} onCancel={() => setDel(null)} onConfirm={remove} />
    </div>
  );
}
