import React, { useEffect, useRef, useState } from 'react';

// Debounced search box. Calls onChange(value) after `delay` ms of no typing.
export default function SearchBar({ value = '', onChange, placeholder = 'Search…', delay = 350 }) {
  const [text, setText] = useState(value);
  const first = useRef(true);

  // Keep in sync if parent resets the value.
  useEffect(() => { setText(value); }, [value]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const id = setTimeout(() => onChange && onChange(text), delay);
    return () => clearTimeout(id);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
      />
    </div>
  );
}
