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

      {/* Top Selling Products Today (if any sales today) */}
      {summary?.topProductsToday && summary.topProductsToday.length > 0 && (
        <Card className="mb-8" padding>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-ink-900">
                  Today's Top Selling Products (آج بکنے والے پروڈکٹس)
                </h2>
                <p className="text-xs text-ink-500">Products sold across POS and Credit Sales today</p>
              </div>
            </div>
            <Badge variant="success">
              {summary.topProductsToday.length} Product(s) Sold
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.topProductsToday.map((p, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-ink-200 bg-ink-50/40 p-3 hover:bg-white transition"
              >
                <div>
                  <p className="font-bold text-ink-900 line-clamp-1">{p.name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    Qty Sold: <span className="font-semibold text-ink-800">{p.quantity} {p.unit}</span>
                  </p>
                </div>
                <div className="mt-2 border-t border-ink-200/60 pt-1.5 flex justify-between items-center text-xs">
                  <span className="text-ink-400">Total Value:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(p.totalAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" padding>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Recent Transactions & Sales</h2>
              <p className="text-sm text-ink-500">Latest sales, items sold, and payments</p>
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
                    : typeStr.includes('credit')
                    ? 'danger'
                    : 'default';
                return (
                  <li
                    key={tx._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">
                          {tx.customerName || 'Walk-in Customer'}
                        </p>
                        <Badge variant={badgeVariant}>
                          {typeLabels[tx.type] || tx.type || 'Transaction'}
                        </Badge>
                        {tx.invoiceNumber && (
                          <span className="font-mono text-[10px] text-ink-400 bg-ink-100 px-1.5 py-0.5 rounded">
                            {tx.invoiceNumber}
                          </span>
                        )}
                      </div>

                      {/* Products / Items details inside this sale */}
                      {tx.items && tx.items.length > 0 ? (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-600">
                          <span className="text-ink-400 font-medium">📦 Items:</span>
                          {tx.items.map((it, i) => (
                            <span key={i} className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800">
                              {it.name} ({it.quantity} {it.unit || 'x'})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-xs text-ink-400">{formatDateTime(tx.createdAt)}</p>
                      )}

                      {tx.items && tx.items.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-ink-400">{formatDateTime(tx.createdAt)}</p>
                      )}
                    </div>
                    <div className="text-right sm:shrink-0">
                      <p className="font-bold text-ink-900 text-sm">
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
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
