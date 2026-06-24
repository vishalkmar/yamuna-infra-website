import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { apiError } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import PageHeader from '../../../components/PageHeader';
import StatCard from '../../../components/StatCard';
import DataTable from '../../../components/DataTable';
import ConfirmDialog from '../../../components/ConfirmDialog';
import FormModal, { Field, inputClass } from '../../../components/FormModal';
import { fmtMoney, fmtDateTime } from '../../../lib/format';

const UNIT_STATUS = ['available', 'held', 'blocked', 'booked', 'sold'];
const towerEmpty = { name: '', totalFloors: '', description: '', sortOrder: 0 };
const unitEmpty = { towerId: '', unitNo: '', floor: '', unitType: '', areaSqft: '', basePrice: 0, facing: '', status: 'available', notes: '', sortOrder: 0 };
const bulkEmpty = { towerId: '', floorCount: 5, unitsPerFloor: 4, unitType: '', areaSqft: '', basePrice: 0, facing: '' };

export default function ProjectInventory() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null); // { project, stats, towers }
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [fTower, setFTower] = useState('');
  const [fStatus, setFStatus] = useState('');

  // tower modal
  const [towerOpen, setTowerOpen] = useState(false);
  const [towerEdit, setTowerEdit] = useState(null);
  const [towerForm, setTowerForm] = useState(towerEmpty);
  const [towerDel, setTowerDel] = useState(null);
  // unit modal
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitEdit, setUnitEdit] = useState(null);
  const [unitForm, setUnitForm] = useState(unitEmpty);
  const [unitDel, setUnitDel] = useState(null);
  // bulk modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState(bulkEmpty);

  const loadProject = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/admin/inventory/${projectId}`);
      setData(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load project')); }
  }, [projectId, toast]);

  const loadUnits = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fTower) params.towerId = fTower;
      if (fStatus) params.status = fStatus;
      const { data: res } = await api.get(`/admin/inventory/${projectId}/units`, { params });
      setUnits(res.data);
    } catch (e) { toast.error(apiError(e, 'Could not load units')); } finally { setLoading(false); }
  }, [projectId, fTower, fStatus, toast]);

  useEffect(() => { loadProject(); }, [loadProject]);
  useEffect(() => { loadUnits(); }, [loadUnits]);

  function refresh() { loadProject(); loadUnits(); }

  // ---- towers ----
  async function saveTower() {
    if (!towerForm.name.trim()) { toast.error('Tower name required'); return; }
    setBusy(true);
    try {
      const payload = { name: towerForm.name, totalFloors: towerForm.totalFloors ? Number(towerForm.totalFloors) : null, description: towerForm.description || null, sortOrder: Number(towerForm.sortOrder) || 0 };
      if (towerEdit) await api.put(`/admin/inventory/towers/${towerEdit.id}`, payload);
      else await api.post(`/admin/inventory/${projectId}/towers`, payload);
      toast.success('Saved'); setTowerOpen(false); loadProject();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }
  async function deleteTower() {
    setBusy(true);
    try { await api.delete(`/admin/inventory/towers/${towerDel.id}`); toast.success('Tower deleted'); setTowerDel(null); refresh(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  // ---- units ----
  function openUnitCreate() { setUnitEdit(null); setUnitForm({ ...unitEmpty, towerId: fTower || '' }); setUnitOpen(true); }
  function openUnitEdit(u) { setUnitEdit(u); setUnitForm({ ...unitEmpty, ...u, towerId: u.towerId || '', areaSqft: u.areaSqft || '' }); setUnitOpen(true); }
  async function saveUnit() {
    if (!unitForm.unitNo.trim()) { toast.error('Unit no. required'); return; }
    setBusy(true);
    try {
      const payload = {
        towerId: unitForm.towerId ? Number(unitForm.towerId) : null,
        unitNo: unitForm.unitNo, floor: unitForm.floor || null, unitType: unitForm.unitType || null,
        areaSqft: unitForm.areaSqft ? Number(unitForm.areaSqft) : null, basePrice: Number(unitForm.basePrice) || 0,
        facing: unitForm.facing || null, status: unitForm.status, notes: unitForm.notes || null, sortOrder: Number(unitForm.sortOrder) || 0,
      };
      if (unitEdit) await api.put(`/admin/inventory/units/${unitEdit.id}`, payload);
      else await api.post(`/admin/inventory/${projectId}/units`, payload);
      toast.success('Saved'); setUnitOpen(false); refresh();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }
  async function changeStatus(u, status) {
    try { await api.post(`/admin/inventory/units/${u.id}/status`, { status }); toast.success('Status updated'); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function unitAction(u, action) {
    try { await api.post(`/admin/inventory/units/${u.id}/${action}`, action === 'hold' ? { hours: 48 } : {}); toast.success('Done'); refresh(); }
    catch (e) { toast.error(apiError(e)); }
  }
  async function deleteUnit() {
    setBusy(true);
    try { await api.delete(`/admin/inventory/units/${unitDel.id}`); toast.success('Unit deleted'); setUnitDel(null); refresh(); }
    catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }
  async function saveBulk() {
    setBusy(true);
    try {
      const payload = {
        towerId: bulkForm.towerId ? Number(bulkForm.towerId) : null,
        floorCount: Number(bulkForm.floorCount), unitsPerFloor: Number(bulkForm.unitsPerFloor),
        unitType: bulkForm.unitType || null, areaSqft: bulkForm.areaSqft ? Number(bulkForm.areaSqft) : null,
        basePrice: Number(bulkForm.basePrice) || 0, facing: bulkForm.facing || null,
      };
      const { data: res } = await api.post(`/admin/inventory/${projectId}/units/bulk`, payload);
      toast.success(res.message || 'Units created'); setBulkOpen(false); setBulkForm(bulkEmpty); refresh();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  }

  const towers = data?.towers || [];
  const stats = data?.stats || {};
  const setTF = (k, v) => setTowerForm(f => ({ ...f, [k]: v }));
  const setUF = (k, v) => setUnitForm(f => ({ ...f, [k]: v }));
  const setBF = (k, v) => setBulkForm(f => ({ ...f, [k]: v }));

  const unitColumns = [
    { key: 'unitNo', header: 'Unit', render: u => <span className="font-medium text-slate-800">{u.unitNo}</span> },
    { key: 'towerName', header: 'Tower', render: u => u.towerName || '—' },
    { key: 'floor', header: 'Floor', render: u => u.floor || '—' },
    { key: 'unitType', header: 'Type', render: u => u.unitType || '—' },
    { key: 'areaSqft', header: 'Area', render: u => u.areaSqft ? `${u.areaSqft} sqft` : '—' },
    { key: 'basePrice', header: 'Price', render: u => fmtMoney(u.basePrice) },
    {
      key: 'status', header: 'Status',
      render: u => (
        <select value={u.status} onChange={e => changeStatus(u, e.target.value)} className="text-xs border border-slate-300 rounded px-1.5 py-1">
          {UNIT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'hold', header: 'Hold until',
      render: u => (u.status === 'held' && u.holdUntil) ? <span className="text-xs text-amber-600">{fmtDateTime(u.holdUntil)}</span> : '—',
    },
  ];

  return (
    <div>
      <PageHeader title={data ? data.project.name : 'Project'} subtitle="Towers & units inventory">
        <button onClick={() => navigate('/agents/inventory')} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">← Projects</button>
      </PageHeader>

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total" value={stats.total} icon="🏢" />
        <StatCard label="Available" value={stats.available} icon="✅" />
        <StatCard label="Held" value={stats.held} icon="✋" />
        <StatCard label="Blocked" value={stats.blocked} icon="⛔" />
        <StatCard label="Booked" value={stats.booked} icon="📝" />
        <StatCard label="Sold" value={stats.sold} icon="🔑" />
      </div>

      {/* Towers */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-slate-700">Towers / Blocks</h4>
          <button onClick={() => { setTowerEdit(null); setTowerForm(towerEmpty); setTowerOpen(true); }} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">+ Add tower</button>
        </div>
        {towers.length === 0 ? <p className="text-slate-400 text-sm">No towers. Units can also exist without a tower.</p> : (
          <div className="flex flex-wrap gap-2">
            {towers.map(t => (
              <div key={t.id} className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <span className="font-medium text-slate-700">{t.name}</span>
                <span className="text-slate-400 text-xs">{t.unitCount} units{t.totalFloors ? ` · ${t.totalFloors} fl` : ''}</span>
                <button onClick={() => { setTowerEdit(t); setTowerForm({ ...towerEmpty, ...t, totalFloors: t.totalFloors || '' }); setTowerOpen(true); }} className="text-slate-500 hover:underline text-xs">edit</button>
                <button onClick={() => setTowerDel(t)} className="text-rose-600 hover:underline text-xs">del</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Units */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <select value={fTower} onChange={e => setFTower(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All towers</option>
          {towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={`${inputClass} w-auto`}>
          <option value="">All statuses</option>
          {UNIT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setBulkForm({ ...bulkEmpty, towerId: fTower || '' }); setBulkOpen(true); }} className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50">Bulk add</button>
          <button onClick={openUnitCreate} className="px-3 py-2 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:opacity-90">+ Add unit</button>
        </div>
      </div>

      <DataTable
        columns={unitColumns}
        rows={units}
        loading={loading}
        empty="No units. Add one, or use Bulk add to generate a floor plan."
        actions={u => (
          <div className="flex items-center gap-3">
            {u.status === 'available' && <button onClick={() => unitAction(u, 'hold')} className="text-amber-600 font-semibold hover:underline">Hold</button>}
            {(u.status === 'available' || u.status === 'held') && <button onClick={() => unitAction(u, 'block')} className="text-slate-500 font-semibold hover:underline">Block</button>}
            {(u.status === 'held' || u.status === 'blocked') && <button onClick={() => unitAction(u, 'release')} className="text-emerald-600 font-semibold hover:underline">Release</button>}
            <button onClick={() => openUnitEdit(u)} className="text-slate-600 font-semibold hover:underline">Edit</button>
            <button onClick={() => setUnitDel(u)} className="text-rose-600 font-semibold hover:underline">Delete</button>
          </div>
        )}
      />

      {/* Tower modal */}
      <FormModal open={towerOpen} title={towerEdit ? 'Edit tower' : 'Add tower'} onClose={() => setTowerOpen(false)} onSubmit={saveTower} submitting={busy} submitLabel={towerEdit ? 'Save' : 'Create'}>
        <Field label="Name" required><input className={inputClass} value={towerForm.name} onChange={e => setTF('name', e.target.value)} /></Field>
        <Field label="Total floors"><input type="number" className={inputClass} value={towerForm.totalFloors} onChange={e => setTF('totalFloors', e.target.value)} /></Field>
        <Field label="Description"><input className={inputClass} value={towerForm.description || ''} onChange={e => setTF('description', e.target.value)} /></Field>
        <Field label="Sort order"><input type="number" className={inputClass} value={towerForm.sortOrder} onChange={e => setTF('sortOrder', e.target.value)} /></Field>
      </FormModal>

      {/* Unit modal */}
      <FormModal open={unitOpen} title={unitEdit ? 'Edit unit' : 'Add unit'} onClose={() => setUnitOpen(false)} onSubmit={saveUnit} submitting={busy} submitLabel={unitEdit ? 'Save' : 'Create'} wide>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tower"><select className={inputClass} value={unitForm.towerId} onChange={e => setUF('towerId', e.target.value)}><option value="">— None —</option>{towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
          <Field label="Unit no." required><input className={inputClass} value={unitForm.unitNo} onChange={e => setUF('unitNo', e.target.value)} /></Field>
          <Field label="Floor"><input className={inputClass} value={unitForm.floor || ''} onChange={e => setUF('floor', e.target.value)} /></Field>
          <Field label="Type"><input className={inputClass} placeholder="2BHK" value={unitForm.unitType || ''} onChange={e => setUF('unitType', e.target.value)} /></Field>
          <Field label="Area (sqft)"><input type="number" className={inputClass} value={unitForm.areaSqft || ''} onChange={e => setUF('areaSqft', e.target.value)} /></Field>
          <Field label="Base price (₹)"><input type="number" className={inputClass} value={unitForm.basePrice} onChange={e => setUF('basePrice', e.target.value)} /></Field>
          <Field label="Facing"><input className={inputClass} value={unitForm.facing || ''} onChange={e => setUF('facing', e.target.value)} /></Field>
          <Field label="Status"><select className={inputClass} value={unitForm.status} onChange={e => setUF('status', e.target.value)}>{UNIT_STATUS.map(s => <option key={s} value={s}>{s}</option>)}</select></Field>
        </div>
        <Field label="Notes"><input className={inputClass} value={unitForm.notes || ''} onChange={e => setUF('notes', e.target.value)} /></Field>
      </FormModal>

      {/* Bulk modal */}
      <FormModal open={bulkOpen} title="Bulk add units" onClose={() => setBulkOpen(false)} onSubmit={saveBulk} submitting={busy} submitLabel="Generate">
        <p className="text-sm text-slate-500">Generates units numbered like 101, 102… per floor. All start as available.</p>
        <Field label="Tower"><select className={inputClass} value={bulkForm.towerId} onChange={e => setBF('towerId', e.target.value)}><option value="">— None —</option>{towers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Floors" required><input type="number" className={inputClass} value={bulkForm.floorCount} onChange={e => setBF('floorCount', e.target.value)} /></Field>
          <Field label="Units / floor" required><input type="number" className={inputClass} value={bulkForm.unitsPerFloor} onChange={e => setBF('unitsPerFloor', e.target.value)} /></Field>
          <Field label="Type"><input className={inputClass} placeholder="2BHK" value={bulkForm.unitType} onChange={e => setBF('unitType', e.target.value)} /></Field>
          <Field label="Area (sqft)"><input type="number" className={inputClass} value={bulkForm.areaSqft} onChange={e => setBF('areaSqft', e.target.value)} /></Field>
          <Field label="Base price (₹)"><input type="number" className={inputClass} value={bulkForm.basePrice} onChange={e => setBF('basePrice', e.target.value)} /></Field>
          <Field label="Facing"><input className={inputClass} value={bulkForm.facing} onChange={e => setBF('facing', e.target.value)} /></Field>
        </div>
      </FormModal>

      <ConfirmDialog open={!!towerDel} title="Delete tower?" message={`Remove "${towerDel?.name}"? Its units stay but lose the tower link.`} confirmLabel="Delete" danger busy={busy} onCancel={() => setTowerDel(null)} onConfirm={deleteTower} />
      <ConfirmDialog open={!!unitDel} title="Delete unit?" message={`Remove unit ${unitDel?.unitNo}?`} confirmLabel="Delete" danger busy={busy} onCancel={() => setUnitDel(null)} onConfirm={deleteUnit} />
    </div>
  );
}
