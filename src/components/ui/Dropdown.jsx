import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function Dropdown({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  label,
  searchable = false,
  className,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find((o) => o.value === value);
  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div className={cn('relative w-full', className)} ref={ref}>
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-xl border border-ink-200 bg-white px-3 text-left text-sm transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50',
          open && 'border-brand-400 ring-2 ring-brand-500/20'
        )}
      >
        <span className={selected ? 'text-ink-900' : 'text-ink-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-ink-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-60 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl shadow-ink-900/10">
          {searchable && (
            <div className="border-b border-ink-100 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-lg border border-ink-200 px-2.5 text-sm outline-none focus:border-brand-400"
              />
            </div>
          )}
          <ul className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink-400">No options</li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.(opt.value, opt);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-brand-50',
                      value === opt.value && 'bg-brand-50 font-medium text-brand-700'
                    )}
                  >
                    {opt.label}
                    {value === opt.value && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
