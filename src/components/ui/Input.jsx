import { cn } from '../../utils/helpers';

export function Input({
  label,
  error,
  hint,
  className,
  leftIcon: LeftIcon,
  rightElement,
  id,
  ...props
}) {
  const inputId = id || props.name;
  const hasWidthClass = className && /\b(w-|flex-1|flex-auto|flex-initial|grow|shrink)\b/.test(className);
  return (
    <div className={cn(hasWidthClass ? '' : 'w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
          {props.required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        )}
        <input
          id={inputId}
          className={cn(
            'h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50 disabled:text-ink-400',
            LeftIcon && 'pl-9',
            rightElement && 'pr-10',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

export function Textarea({ label, error, className, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'min-h-[88px] w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20',
          error && 'border-danger-500'
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

export function Select({ label, error, options = [], className, placeholder, id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
          {label}
          {props.required && <span className="ml-0.5 text-danger-500">*</span>}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20',
          error && 'border-danger-500'
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}
