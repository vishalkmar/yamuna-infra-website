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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/sources');
      setSources(data.data.sources);
      setReady({ llm: data.data.llmReady, emb: data.data.embeddingsReady, pinecone: data.data.pineconeReady });
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);
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
    try { const { data } = await api.post('/admin/ai/chat', { message: q }); setAnswer(data.data); }
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
        <span className="px-2 py-1 rounded bg-blue-100 text-blue-700" title="The bot pulls real-time data from these read APIs based on the question">⚡ Live APIs: temples · doctors · food · tiffin · transport · amenities · wellness · spiritual · mobility · rewards · announcements · events</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {[['knowledge', `📚 Knowledge (${knowledge.length})`], ['instructions', `📋 Instructions (${instructions.length})`], ['test', '🧪 Test console']].map(([k, label]) => (
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

      {tab === 'test' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 max-w-2xl">
          <h3 className="font-bold text-slate-800 mb-1">🧪 Test console</h3>
          <p className="text-xs text-slate-400 mb-3">Ask as a resident would — see the answer + which knowledge was used.</p>
          <div className="flex gap-2">
            <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()} className={inputClass} placeholder="e.g. What are the aarti timings?" />
            <button onClick={ask} disabled={thinking} className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50">{thinking ? '…' : 'Ask'}</button>
          </div>
          {answer && (
            <div className="mt-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-800 whitespace-pre-wrap">{answer.answer || 'No answer.'}</div>
              <div className="text-xs text-slate-400 mt-2">Mode: <b>{answer.mode}</b>{answer.sources?.length ? ` · Sources: ${[...new Set(answer.sources)].join(', ')}` : ''}</div>
              {answer.retrieved?.length > 0 && (
                <details className="mt-2 text-xs text-slate-500">
                  <summary className="cursor-pointer">Retrieved chunks ({answer.retrieved.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {answer.retrieved.map((c, i) => <li key={i} className="border-l-2 border-slate-200 pl-2">{c.text}</li>)}
                  </ul>
                </details>
              )}
            </div>
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
