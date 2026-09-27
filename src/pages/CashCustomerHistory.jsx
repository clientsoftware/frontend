import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Phone, ShoppingBag, ArrowLeft, Calendar, Coins } from 'lucide-react';
import { salesAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDateTime, getErrorMessage } from '../utils/helpers';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

export default function CashCustomerHistory() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesAPI.getAll();
      const list = Array.isArray(res) ? res : res?.data || [];
      setSales(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load sales history'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Group cash sales by customer phone or customer name
  const cashCustomersMap = useMemo(() => {
    const map = {};
    sales.forEach((inv) => {
      // Walk-in / Cash sales (either no customer object or customerName)
      const phone = (inv.customerPhone || '').trim();
      const name = (inv.customerName || inv.partyName || 'Walk-in Customer').trim();
      const key = `${phone || 'no-phone'}_${name.toLowerCase()}`;

      if (!map[key]) {
        map[key] = {
          key,
          name,
          phone,
          transactions: [],
        };
      }
      map[key].transactions.push(inv);
    });
    return map;
  }, [sales]);

  const filteredCustomers = useMemo(() => {
    const list = Object.values(cashCustomersMap);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [cashCustomersMap, searchQuery]);

  const selectedCustomer = selectedCustomerKey ? cashCustomersMap[selectedCustomerKey] : null;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cash Customer History (کیش کسٹمر ہسٹری)"
        subtitle="Search walk-in & cash customers by name or phone number to view their complete purchase history"
      />

      {!selectedCustomer ? (
        <div className="space-y-4">
          <div className="max-w-md">
            <Input
              placeholder="Search by customer name or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={Search}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.length === 0 ? (
              <Card className="col-span-full py-12 text-center text-ink-400">
                No matching cash customer records found.
              </Card>
            ) : (
              filteredCustomers.map((cust) => {
                const totalSpent = cust.transactions.reduce(
                  (sum, inv) => sum + (Number(inv.totalAmount || inv.total) || 0),
                  0
                );

                return (
                  <Card
                    key={cust.key}
                    className="space-y-3 bg-white shadow-sm border-ink-200 hover:border-brand-300 transition cursor-pointer"
                    onClick={() => setSelectedCustomerKey(cust.key)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-ink-900">{cust.name}</h4>
                          <p className="text-xs text-ink-500">{cust.phone || 'Phone N/A'}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {cust.transactions.length} Order(s)
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-xs">
                      <span className="text-ink-500">Total Purchases:</span>
                      <span className="font-display font-bold text-brand-700 text-sm">
                        Rs {formatCurrency(totalSpent)}
                      </span>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" leftIcon={ArrowLeft} onClick={() => setSelectedCustomerKey(null)}>
            Back to Customers List
          </Button>

          <Card className="bg-gradient-to-r from-brand-900 to-ink-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-white">{selectedCustomer.name}</h3>
                <p className="text-xs text-brand-200">Phone: {selectedCustomer.phone || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-brand-200">Total Spent Across All Visits</p>
                <p className="font-display text-2xl font-bold text-amber-400">
                  Rs{' '}
                  {formatCurrency(
                    selectedCustomer.transactions.reduce(
                      (sum, inv) => sum + (Number(inv.totalAmount || inv.total) || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h4 className="font-bold text-sm text-ink-900">
              Purchase Invoices ({selectedCustomer.transactions.length})
            </h4>

            <div className="space-y-3">
              {selectedCustomer.transactions.map((inv) => (
                <div
                  key={inv._id || inv.id}
                  className="rounded-xl border border-ink-200 bg-ink-50/40 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs border-b border-ink-200 pb-2">
                    <span className="font-mono font-bold text-brand-800">
                      Invoice: {inv.invoiceNumber || inv.number}
                    </span>
                    <span className="text-ink-500">
                      Date: {formatDateTime(inv.date || inv.createdAt)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {(inv.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-ink-700">
                        <span>
                          {item.productName || item.name} × {item.quantity || item.qty}
                        </span>
                        <span className="font-mono">
                          Rs {formatCurrency((item.unitPriceCharged || item.price || 0) * (item.quantity || item.qty || 1))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center text-xs font-bold border-t border-ink-200 pt-2">
                    <span className="text-ink-600">Total Paid:</span>
                    <span className="font-display text-sm text-success-700">
                      Rs {formatCurrency(inv.totalAmount || inv.total || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
