import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Field, inputClass } from '../../components/FormModal';
import { INDIA_STATES, PROPERTY_TYPES } from '../../lib/india';

// Shared "property" fields for the resident create form and the add/edit
// property modal. Project and Tower/Block come from Inventory (with a custom
// option); the site defaults to Vrindavan, Uttar Pradesh 281121 (editable).

export const SITE_DEFAULTS = { city: 'Vrindavan', state: 'Uttar Pradesh', pincode: '281121' };

// How land/flats are sold locally → sq.ft factor (stored as areaSqft too).
export const AREA_UNITS = [
  { key: 'sqft', label: 'sq.ft', factor: 1 },
  { key: 'gaj', label: 'Gaj (sq.yd)', factor: 9 },
  { key: 'sqm', label: 'sq.m', factor: 10.7639 },
  { key: 'acre', label: 'Acre', factor: 43560 },
  { key: 'bigha', label: 'Bigha (UP ≈ 27,000 sq.ft)', factor: 27000 },
];
export const unitLabel = key => AREA_UNITS.find(u => u.key === key)?.label || 'sq.ft';

const CUSTOM = '__custom__';

// Inventory projects + towers, fetched once per page load.
let cache = null;
export function useInventoryOptions() {
  const [opts, setOpts] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    api.get('/admin/inventory/options').then(r => { cache = r.data.data || []; setOpts(cache); }).catch(() => setOpts([]));
  }, []);
  return opts;
}

// Normalise a stored property into editable form state.
export function toPropertyForm(p, blank) {
  const unit = p.areaUnit || 'sqft';
  const factor = AREA_UNITS.find(u => u.key === unit)?.factor || 1;
  const value = p.areaValue ?? (p.areaSqft != null ? +(Number(p.areaSqft) / factor).toFixed(2) : '');
  return { ...blank, ...p, areaUnit: unit, areaValue: value ?? '' };
}

// Values to send to the API (adds sq.ft equivalent).
export function areaPayload(p) {
  const v = p.areaValue === '' || p.areaValue == null ? null : Number(p.areaValue);
  const factor = AREA_UNITS.find(u => u.key === (p.areaUnit || 'sqft'))?.factor || 1;
  return { areaValue: v, areaUnit: p.areaUnit || 'sqft', areaSqft: v == null ? null : +(v * factor).toFixed(2) };
}

function SelectOrCustom({ value, options, onChange, placeholder, customLabel = 'Other (type below)…' }) {
  const known = options.some(o => o.value === value);
  const [custom, setCustom] = useState(!!value && !known);
  useEffect(() => { if (value && !options.some(o => o.value === value)) setCustom(true); }, [value, options]);
  return (
    <>
      <select
        className={inputClass}
        value={custom ? CUSTOM : (value || '')}
        onChange={e => {
          if (e.target.value === CUSTOM) { setCustom(true); onChange(''); }
          else { setCustom(false); onChange(e.target.value); }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        <option value={CUSTOM}>{customLabel}</option>
      </select>
      {custom && <input className={`${inputClass} mt-1`} value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Type…" autoFocus />}
    </>
  );
}

export default function PropertyFields({ p, set }) {
  const projects = useInventoryOptions();
  const project = projects.find(x => x.name === p.projectName);
  const towers = project?.towers || [];
  const tower = towers.find(t => t.name === p.tower);
  const floors = tower?.totalFloors ? Array.from({ length: tower.totalFloors + 1 }, (_, i) => String(i)) : [];

  const pickProject = name => {
    set('projectName', name);
    const pr = projects.find(x => x.name === name);
    if (pr) {
      if (pr.city) set('city', pr.city);
      if (pr.state) set('state', pr.state);
    }
    set('tower', '');
  };
  const pickTower = name => {
    set('tower', name);
    const t = towers.find(x => x.name === name);
    if (t?.totalFloors && !p.floorsTotal) set('floorsTotal', String(t.totalFloors));
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label"><input className={inputClass} value={p.label || ''} onChange={e => set('label', e.target.value)} placeholder="Home / Investment" /></Field>
        <Field label="Project" hint={projects.length ? 'From Inventory, or type your own' : 'Add projects in Inventory to pick them here'}>
          <SelectOrCustom value={p.projectName} onChange={pickProject} placeholder="Select project…"
            options={projects.map(x => ({ value: x.name, label: x.city ? `${x.name} · ${x.city}` : x.name }))} />
        </Field>
        <Field label="Tower / Block">
          <SelectOrCustom value={p.tower} onChange={pickTower} placeholder={towers.length ? 'Select tower / block…' : 'Select…'}
            options={towers.map(t => ({ value: t.name, label: t.totalFloors ? `${t.name} (${t.totalFloors} floors)` : t.name }))} />
        </Field>
        <Field label="Flat / Unit no."><input className={inputClass} value={p.flatNo || ''} onChange={e => set('flatNo', e.target.value)} placeholder="A-1203" /></Field>
        <Field label="Floor">
          <input className={inputClass} list={floors.length ? `floors-${tower?.id}` : undefined} value={p.floor || ''} onChange={e => set('floor', e.target.value)} placeholder={floors.length ? `0 – ${tower.totalFloors}` : 'e.g. 3'} />
          {floors.length > 0 && <datalist id={`floors-${tower.id}`}>{floors.map(fl => <option key={fl} value={fl} />)}</datalist>}
        </Field>
        <Field label="Area">
          <div className="flex gap-2">
            <input className={inputClass} value={p.areaValue ?? ''} onChange={e => set('areaValue', e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 150" />
            <select className={`${inputClass} w-36 shrink-0`} value={p.areaUnit || 'sqft'} onChange={e => set('areaUnit', e.target.value)}>
              {AREA_UNITS.map(u => <option key={u.key} value={u.key}>{u.label}</option>)}
            </select>
          </div>
          {p.areaValue && (p.areaUnit || 'sqft') !== 'sqft' ? (
            <span className="text-[11px] text-slate-400">≈ {Math.round(Number(p.areaValue) * (AREA_UNITS.find(u => u.key === p.areaUnit)?.factor || 1)).toLocaleString('en-IN')} sq.ft</span>
          ) : null}
        </Field>
        <Field label="Type">
          <SelectOrCustom value={p.propertyType} onChange={v => set('propertyType', v)} placeholder="Select…" customLabel="Custom type…"
            options={PROPERTY_TYPES.map(t => ({ value: t, label: t }))} />
        </Field>
        <Field label="Pincode"><input className={inputClass} value={p.pincode || ''} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="281121" /></Field>
      </div>
      <Field label="Property address"><input className={inputClass} value={p.addressLine || ''} onChange={e => set('addressLine', e.target.value)} placeholder="Plot / street / landmark" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="City"><input className={inputClass} value={p.city || ''} onChange={e => set('city', e.target.value)} /></Field>
        <Field label="State">
          <select className={inputClass} value={p.state || ''} onChange={e => set('state', e.target.value)}>
            <option value="">Select state…</option>
            {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}
