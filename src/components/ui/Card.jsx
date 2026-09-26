import { cn } from '../../utils/helpers';

export default function Card({ children, className, hover = false, padding = true, onClick }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border border-ink-200 bg-white shadow-sm shadow-ink-900/[0.03]',
        padding && 'p-5',
        hover && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-ink-900/5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, tone = 'brand', loading }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700',
    success: 'from-success-500 to-success-700',
    warning: 'from-warning-500 to-warning-600',
    danger: 'from-danger-500 to-danger-700',
    ink: 'from-ink-600 to-ink-900',
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="mb-3 h-10 w-10 rounded-xl bg-ink-100" />
        <div className="mb-2 h-3 w-24 rounded bg-ink-100" />
        <div className="h-7 w-32 rounded bg-ink-100" />
      </Card>
    );
  }

  return (
    <Card hover className="relative overflow-hidden">
      <div
        className={cn(
          'absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-[0.08]',
          tones[tone]
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-500">{title}</p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-ink-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-ink-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
              tones[tone]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-ink-100', className)} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <div
      className={cn(
        'h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600',
        className
      )}
    />
  );
}
