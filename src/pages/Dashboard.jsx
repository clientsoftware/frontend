import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Banknote,
  Users,
  Package,
  Wallet,
  ShoppingCart,
  Recycle,
  ArrowRight,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import { dashboardAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDateTime, getErrorMessage } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card, { StatCard, PageHeader, EmptyState, Skeleton } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

const quickActions = [
  { to: '/pos', label: 'New Sale', icon: ShoppingCart, variant: 'primary' },
  { to: '/scrap-sale', label: 'Scrap Sale', icon: Recycle, variant: 'soft' },
  { to: '/customers', label: 'Customers', icon: Users, variant: 'outline' },
  { to: '/products', label: 'Products', icon: Package, variant: 'outline' },
];

const typeLabels = {
  sale: 'Sale',
  Sale: 'Sale',
  'Scrap Sale': 'Scrap Sale',
  Exchange: 'Exchange',
  'Bulk Dispatch': 'Bulk Dispatch',
  return: 'Return',
  Payment: 'Payment',
};

function extractData(res, fallback = null) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (body?.data != null) return body.data;
  return fallback ?? body ?? null;
}

export default function Dashboard() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTx, setLoadingTx] = useState(true);
  const [loadingStock, setLoadingStock] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoadingSummary(true);
      try {
        const res = await dashboardAPI.getSummary();
        if (!cancelled) setSummary(extractData(res, {}));
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, 'Failed to load dashboard summary'));
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    };

    const loadTransactions = async () => {
      setLoadingTx(true);
      try {
        const res = await dashboardAPI.getRecentTransactions();
        if (!cancelled) setTransactions(extractData(res, []));
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, 'Failed to load recent transactions'));
      } finally {
        if (!cancelled) setLoadingTx(false);
      }
    };

    const loadLowStock = async () => {
      setLoadingStock(true);
      try {
        const res = await dashboardAPI.getLowStock();
        if (!cancelled) setLowStock(extractData(res, []));
      } catch (err) {
        if (!cancelled) toast.error(getErrorMessage(err, 'Failed to load low stock alerts'));
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    };

    loadSummary();
    loadTransactions();
    loadLowStock();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of today's business at a glance"
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(summary?.todaySales ?? 0)}
          icon={Banknote}
          tone="brand"
          loading={loadingSummary}
        />
        <StatCard
          title="Total Due from Customers"
          value={formatCurrency(summary?.totalDue ?? 0)}
          icon={Users}
          tone="warning"
          loading={loadingSummary}
        />
        <StatCard
          title="Stock Value"
          value={formatCurrency(summary?.stockValue ?? 0)}
          icon={Package}
          tone="success"
          loading={loadingSummary}
        />
        <StatCard
          title="Cash in Hand"
          value={formatCurrency(summary?.cashInHand ?? 0)}
          icon={Wallet}
          tone="ink"
          loading={loadingSummary}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ to, label, icon: Icon, variant }) => (
            <Link key={to} to={to}>
              <Button variant={variant} leftIcon={Icon}>
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Recent Transactions</h2>
              <p className="text-sm text-ink-500">Latest sales and payments</p>
            </div>
            <Link to="/reports">
              <Button variant="ghost" size="sm" rightIcon={ArrowRight}>
                View all
              </Button>
            </Link>
          </div>

          {loadingTx ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Start a sale from POS or Scrap Sale to see activity here."
              action={
                <Link to="/pos">
                  <Button leftIcon={ShoppingCart}>Go to POS</Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {transactions.slice(0, 15).map((tx) => {
                const typeStr = (tx.type || '').toLowerCase();
                const badgeVariant =
                  typeStr.includes('return')
                    ? 'warning'
                    : typeStr.includes('payment')
                    ? 'success'
                    : typeStr.includes('scrap')
                    ? 'soft'
                    : 'outline';
                return (
                  <li
                    key={tx._id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-ink-800">
                          {tx.customerName || 'Walk-in Customer'}
                        </p>
                        <Badge variant={badgeVariant}>
                          {typeLabels[tx.type] || tx.type || 'Transaction'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(tx.createdAt)}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-ink-900">
                      {formatCurrency(tx.amount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card padding>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-50 text-warning-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Low Stock Alerts</h2>
              <p className="text-sm text-ink-500">Items running low</p>
            </div>
          </div>

          {loadingStock ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : lowStock.length === 0 ? (
            <EmptyState
              icon={Package}
              title="All stocked up"
              description="No products are below the low stock threshold."
            />
          ) : (
            <ul className="space-y-2">
              {lowStock.slice(0, 6).map((item) => (
                <li
                  key={item._id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-warning-100 bg-warning-50/50 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">{item.name}</p>
                    <p className="text-xs text-ink-500">
                      {item.currentStock ?? 0} {item.primaryUnit || 'units'} left
                    </p>
                  </div>
                  <Badge variant="warning" dot>
                    Low
                  </Badge>
                </li>
              ))}
              {lowStock.length > 6 && (
                <Link
                  to="/products"
                  className="block pt-1 text-center text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  +{lowStock.length - 6} more items
                </Link>
              )}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
