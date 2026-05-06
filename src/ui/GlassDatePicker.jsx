import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const localKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseKey = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const label = (value) => {
  if (!value) return 'Select date';
  const [year, month, day] = value.split('-');
  return `${day}-${month}-${year}`;
};

export default function GlassDatePicker({ value, onChange, min, max, className = '' }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(parseKey(value));
  const ref = useRef(null);

  useEffect(() => setCursor(parseKey(value)), [value]);
  useEffect(() => {
    const close = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [cursor]);

  const moveMonth = (amount) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + amount, 1));
  };

  const choose = (date) => {
    const next = localKey(date);
    onChange(next);
    setOpen(false);
  };

  const disabled = (key) => (min && key < min) || (max && key > max);

  return (
    <div className={`glass-date ${open ? 'open' : ''} ${className}`} ref={ref}>
      <button type="button" className="glass-date-trigger" onClick={() => setOpen((current) => !current)}>
        <span>{label(value)}</span>
        <CalendarDays size={18} />
      </button>
      {open && (
        <div className="glass-date-popover">
          <div className="glass-date-head">
            <button type="button" onClick={() => moveMonth(-1)}><ChevronLeft size={18} /></button>
            <strong>{cursor.toLocaleString([], { month: 'long', year: 'numeric' })}</strong>
            <button type="button" onClick={() => moveMonth(1)}><ChevronRight size={18} /></button>
          </div>
          <div className="glass-date-week">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="glass-date-grid">
            {days.map((date) => {
              const key = localKey(date);
              const outside = date.getMonth() !== cursor.getMonth();
              return (
                <button
                  type="button"
                  className={`${key === value ? 'selected' : ''} ${outside ? 'outside' : ''}`}
                  disabled={disabled(key)}
                  key={key}
                  onClick={() => choose(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
