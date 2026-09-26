import { Input } from './Input';

export default function DatePicker({ label, value, onChange, className, ...props }) {
  return (
    <Input
      type="date"
      label={label}
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      className={className}
      {...props}
    />
  );
}

export function DateRangePicker({ from, to, onFromChange, onToChange, className }) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-end ${className || ''}`}>
      <DatePicker label="From" value={from} onChange={onFromChange} />
      <DatePicker label="To" value={to} onChange={onToChange} />
    </div>
  );
}
