import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export default function GlassSelect({ value, onChange, options, placeholder = 'Choose', disabled = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const selected = options.find((option) => String(option.value) === String(value));
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase())
    || String(option.value).toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const choose = (nextValue) => {
    onChange(nextValue);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={`glass-select ${open ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`} ref={ref}>
      <button type="button" className="glass-select-trigger" disabled={disabled} onClick={() => setOpen((current) => !current)}>
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={18} />
      </button>
      {open && !disabled && (
        <div className="glass-select-menu">
          <label className="glass-select-search">
            <Search size={15} />
            <input
              autoFocus
              placeholder="Search..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {filtered.length === 0 && <div className="glass-select-empty">No results</div>}
          {filtered.map((option) => (
            <button
              type="button"
              className={String(option.value) === String(value) ? 'selected' : ''}
              key={`${option.value}-${option.label}`}
              onClick={() => choose(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
