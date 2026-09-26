import { cn } from '../../utils/helpers';

const variants = {
  default: 'bg-ink-100 text-ink-700',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  warning: 'bg-warning-50 text-warning-600',
  brand: 'bg-brand-50 text-brand-700',
  outline: 'border border-ink-200 bg-white text-ink-600',
};

export default function Badge({ children, variant = 'default', className, dot }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-success-500',
            variant === 'danger' && 'bg-danger-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'brand' && 'bg-brand-500',
            (!variant || variant === 'default' || variant === 'outline') && 'bg-ink-400'
          )}
        />
      )}
      {children}
    </span>
  );
}
