import { cn } from '../../utils/helpers';

const variants = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20 active:scale-[0.98]',
  secondary:
    'bg-ink-100 text-ink-800 hover:bg-ink-200 active:scale-[0.98]',
  outline:
    'border border-ink-200 bg-white text-ink-700 hover:bg-ink-50 active:scale-[0.98]',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger:
    'bg-danger-600 text-white hover:bg-danger-700 shadow-sm shadow-danger-600/20 active:scale-[0.98]',
  success:
    'bg-success-600 text-white hover:bg-success-700 shadow-sm shadow-success-600/20 active:scale-[0.98]',
  soft:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 active:scale-[0.98]',
};

const sizes = {
  xs: 'h-7 px-2.5 text-xs gap-1 rounded-lg',
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-base gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl p-0 justify-center',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading = false,
  disabled,
  type = 'button',
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        LeftIcon && <LeftIcon className="h-4 w-4 shrink-0" />
      )}
      {children}
      {!loading && RightIcon && <RightIcon className="h-4 w-4 shrink-0" />}
    </button>
  );
}
