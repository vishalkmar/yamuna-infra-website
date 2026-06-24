import React, { useState, useEffect } from 'react';
import FormModal, { Field, inputClass } from './FormModal';

// Record a visit result (Module 3.3). Parent calls onSubmit({status,outcome,feedback}).
export default function VisitOutcomeModal({ open, busy, onClose, onSubmit }) {
  const [status, setStatus] = useState('completed');
  const [outcome, setOutcome] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => { if (open) { setStatus('completed'); setOutcome(''); setFeedback(''); } }, [open]);

  return (
    <FormModal open={open} title="Record visit outcome" onClose={onClose} submitting={busy} submitLabel="Save outcome"
      onSubmit={() => onSubmit({ status, outcome: outcome || null, feedback: feedback || null })}>
      <Field label="Result" required>
        <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="completed">Completed (visit happened)</option>
          <option value="no_show">No-show (buyer didn't come)</option>
        </select>
      </Field>
      <Field label="Outcome" hint="e.g. Liked 2BHK, wants corner unit; negotiating price">
        <input className={inputClass} value={outcome} onChange={e => setOutcome(e.target.value)} />
      </Field>
      <Field label="Feedback / notes"><textarea className={inputClass} rows={3} value={feedback} onChange={e => setFeedback(e.target.value)} /></Field>
    </FormModal>
  );
}
