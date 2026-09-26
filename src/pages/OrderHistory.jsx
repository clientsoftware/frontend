import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  ShoppingCart,
  Recycle,
  ArrowLeftRight,
  Truck,
  Wallet,
  Eye,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { salesAPI, exchangeAPI, dispatchAPI, customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getErrorMessage,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import SaleReceipt from '../components/SaleReceipt';

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.sales)) return body.sales;
  if (Array.isArray(body?.dispatches)) return body.dispatches;
  if (Array.isArray(body?.exchanges)) return body.exchanges;
  if (Array.isArray(body?.customers)) return body.customers;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

const TYPE_CONFIG = {
  pos: { label: 'POS Sale', variant: 'brand', icon: ShoppingCart },
  scrap: { label: 'Scrap Sale', variant: 'warning', icon: Recycle },
  exchange: { label: 'Exchange', variant: 'outline', icon: ArrowLeftRight },
  dispatch: { label: 'Bulk Dispatch', variant: 'success', icon: Truck },
  payment: { label: 'Payment Received', variant: 'soft', icon: Wallet },
};

export default function OrderHistory() {
  const toast = useToast();

  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Detail Modal (Read-only)
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, exchangeRes, dispatchRes, customerRes] = await Promise.all([
        salesAPI.getAll(),
        exchangeAPI.getAll(),
        dispatchAPI.getAll(),
        customersAPI.getAll(),
      ]);

      const salesList = extractList(salesRes);
      const exchangeList = extractList(exchangeRes);
      const dispatchList = extractList(dispatchRes);
      const customerList = extractList(customerRes);

      setCustomers(customerList);

      const unified = [
        ...salesList.map((s) => ({
          id: s._id || s.id,
          rawId: s._id,
          recordType: s.isScrapSale ? 'scrap' : 'pos',
          invoiceNo: s.invoiceNumber || s.invoiceNo || '—',
          date: s.date || s.createdAt,
          customerName: s.customerName || s.customer?.name || 'Walk-in Customer',
          customerPhone: s.customerPhone || s.customer?.phone || s.customer?.contact || '',
          amount: s.totalAmount ?? s.total ?? 0,
          paidAmount: s.amountPaid ?? s.paidAmount ?? 0,
          dueAmount: s.dueAmount ?? s.creditAmount ?? 0,
          paymentMode: s.paymentMode || 'cash',
          items: s.items || [],
          raw: s,
        })),
        ...exchangeList.map((e) => ({
          id: e._id || e.id,
          rawId: e._id,
          recordType: 'exchange',
          invoiceNo: e.receiptNumber || e.receiptNo || '—',
          date: e.date || e.createdAt,
          customerName: e.customerName || e.customer?.name || e.companyName || 'Exchange Deal',
          customerPhone: e.customerPhone || e.customer?.phone || '',
          amount: Math.max(e.itemReceived?.value || 0, e.itemGiven?.value || 0),
          paidAmount: 0,
          dueAmount: Math.abs(e.netBalance || 0),
          paymentMode: 'exchange',
          items: [
            {
              productName: `Scrap Given: ${e.itemGiven?.productName || 'Scrap'}`,
              quantity: e.itemGiven?.quantity || 0,
              unitPriceCharged: e.itemGiven?.rate || 0,
              lineTotal: e.itemGiven?.value || 0,
            },
            {
              productName: `Copper Recv: ${e.itemReceived?.productName || 'Copper'}`,
              quantity: e.itemReceived?.quantity || 0,
              unitPriceCharged: e.itemReceived?.rate || 0,
              lineTotal: e.itemReceived?.value || 0,
            },
          ],
          raw: e,
        })),
        ...dispatchList.map((d) => ({
          id: d._id || d.id,
          rawId: d._id,
          recordType: 'dispatch',
          invoiceNo: d.invoiceNumber || `DSP-${String(d._id).slice(-6)}`,
          date: d.date || d.createdAt,
          customerName: d.companyName || d.destinationCompany || 'Company Dispatch',
          customerPhone: d.driverPhone || '',
          amount: d.totalSaleValue || 0,
          paidAmount: d.totalSaleValue || 0,
          dueAmount: 0,
          paymentMode: 'dispatch',
          items: [
            {
              productName: d.itemName || d.productName || 'Bulk Dispatch',
              quantity: d.receivedQuantity || d.sentQuantity || d.quantity || 0,
              unitPriceCharged: d.saleRate || 0,
              lineTotal: d.totalSaleValue || 0,
            },
          ],
          raw: d,
        })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date));

      setRecords(unified);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load order history'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Type filter
      if (typeFilter !== 'all' && rec.recordType !== typeFilter) return false;

      // Customer filter
      if (customerFilter !== 'all') {
        const matchesCustomer =
          rec.raw?.customer === customerFilter ||
          rec.raw?.customer?._id === customerFilter ||
          rec.customerName?.toLowerCase().includes(customerFilter.toLowerCase());
        if (!matchesCustomer) return false;
      }

      // Date range filter
      if (fromDate) {
        const f = new Date(fromDate);
        f.setHours(0, 0, 0, 0);
        if (new Date(rec.date) < f) return false;
      }
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        if (new Date(rec.date) > t) return false;
      }

      // Text search
      const q = search.trim().toLowerCase();
      if (q) {
        const matchInvoice = rec.invoiceNo.toLowerCase().includes(q);
        const matchCustomer = rec.customerName.toLowerCase().includes(q);
        const matchPhone = rec.customerPhone.toLowerCase().includes(q);
        const matchItems = rec.items.some((i) =>
          (i.productName || '').toLowerCase().includes(q)
        );
        const matchDriver = (rec.raw?.driverName || '').toLowerCase().includes(q);
        const matchVehicle = (rec.raw?.vehicleNumber || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchCustomer && !matchPhone && !matchItems && !matchDriver && !matchVehicle) {
          return false;
        }
      }

      return true;
    });
  }, [records, typeFilter, customerFilter, fromDate, toDate, search]);

  const columns = [
    {
      key: 'date',
      header: 'Date & Time',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-ink-900">{formatDate(row.date)}</p>
          <p className="text-xs text-ink-400">{formatDateTime(row.date)}</p>
        </div>
      ),
    },
    {
      key: 'invoiceNo',
      header: 'Invoice / Ref #',
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-brand-700">{row.invoiceNo}</span>
      ),
    },
    {
      key: 'recordType',
      header: 'Type',
      render: (val) => {
        const cfg = TYPE_CONFIG[val] || TYPE_CONFIG.pos;
        const Icon = cfg.icon;
        return (
          <Badge variant={cfg.variant} className="flex items-center gap-1 w-fit">
            <Icon className="h-3 w-3" />
            {cfg.label}
          </Badge>
        );
      },
    },
    {
      key: 'customerName',
      header: 'Customer / Company',
      render: (_, row) => (
        <div>
          <p className="font-medium text-ink-900">{row.customerName}</p>
          {row.customerPhone && <p className="text-xs text-ink-400">{row.customerPhone}</p>}
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items Breakdown',
      render: (_, row) => (
        <div className="max-w-xs text-xs space-y-0.5">
          {row.items.slice(0, 2).map((item, idx) => (
            <p key={idx} className="truncate text-ink-700">
              • {item.productName || 'Item'} × {item.quantity} ({formatCurrency(item.lineTotal || item.unitPriceCharged * item.quantity)})
            </p>
          ))}
          {row.items.length > 2 && (
            <p className="text-[10px] text-ink-400 font-medium">+{row.items.length - 2} more items</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Total Amount',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-bold text-ink-900">{formatCurrency(row.amount)}</p>
          <p className="text-xs capitalize text-ink-500">Mode: {row.paymentMode}</p>
        </div>
      ),
    },
    {
      key: 'dueAmount',
      header: 'Due / Status',
      render: (_, row) =>
        row.dueAmount > 0 ? (
          <Badge variant="warning">Due: {formatCurrency(row.dueAmount)}</Badge>
        ) : (
          <Badge variant="success">Paid / Settled</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'View',
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={Eye}
          onClick={() => {
            setSelectedRecord(row);
            setDetailOpen(true);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Order & Transaction History"
        subtitle="Complete read-only audit log of sales, scrap, exchanges, dispatches & customer records"
        actions={
          <div className="flex items-center gap-1.5 rounded-xl bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700">
            <ShieldAlert className="h-4 w-4 text-brand-600" />
            Strictly Read-Only (Non-Editable Audit Log)
          </div>
        }
      />

      {/* Filter Bar */}
      <Card className="mb-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Search invoice, customer, item..."
            leftIcon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Record Types' },
              { value: 'pos', label: 'POS Sales' },
              { value: 'scrap', label: 'Scrap Sales' },
              { value: 'exchange', label: 'Exchanges' },
              { value: 'dispatch', label: 'Bulk Dispatches' },
            ]}
          />
          <Select
            label="Customer / Party"
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Customers / Parties' },
              ...customers.map((c) => ({ value: c._id, label: c.name })),
            ]}
          />
          <Input
            label="From Date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            label="To Date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </Card>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredRecords}
        loading={loading}
        searchPlaceholder="Search history records..."
        emptyMessage="No matching order history records found."
        mobileCard={(row) => {
          const cfg = TYPE_CONFIG[row.recordType] || TYPE_CONFIG.pos;
          return (
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between">
                <Badge variant={cfg.variant}>{cfg.label}</Badge>
                <span className="text-xs text-ink-400">{formatDate(row.date)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-brand-700">{row.invoiceNo}</span>
                <span className="font-bold text-ink-900">{formatCurrency(row.amount)}</span>
              </div>
              <p className="text-sm font-medium text-ink-800">{row.customerName}</p>
              <div className="text-xs text-ink-500">
                {row.items.map((i) => i.productName).join(', ')}
              </div>
              <Button
                variant="soft"
                size="sm"
                className="w-full mt-2"
                leftIcon={Eye}
                onClick={() => {
                  setSelectedRecord(row);
                  setDetailOpen(true);
                }}
              >
                View Complete Read-Only Record
              </Button>
            </div>
          );
        }}
      />

      {/* Read-Only Record Details Modal */}
      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedRecord(null);
        }}
        title={`Order Details — ${selectedRecord?.invoiceNo || 'Record'}`}
        size="lg"
        footer={
          <div className="flex justify-between w-full items-center">
            <span className="text-xs text-ink-400 flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5 text-brand-600" /> Read-only record (protected from editing)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
                Print Bill
              </Button>
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </div>
          </div>
        }
      >
        {selectedRecord && (
          <div className="space-y-4">
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <Badge variant={TYPE_CONFIG[selectedRecord.recordType]?.variant || 'brand'}>
                    {TYPE_CONFIG[selectedRecord.recordType]?.label}
                  </Badge>
                  <p className="mt-1 font-mono text-lg font-bold text-brand-900">
                    {selectedRecord.invoiceNo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-500">Date & Time</p>
                  <p className="text-sm font-semibold">{formatDateTime(selectedRecord.date)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 rounded-xl border border-ink-200 p-3 text-sm">
              <div>
                <p className="text-xs text-ink-400">Customer / Party Name</p>
                <p className="font-semibold text-ink-900">{selectedRecord.customerName}</p>
                {selectedRecord.customerPhone && (
                  <p className="text-xs text-ink-500">Phone: {selectedRecord.customerPhone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-ink-400">Payment Status & Mode</p>
                <p className="font-semibold text-ink-900 capitalize">
                  Mode: {selectedRecord.paymentMode}
                </p>
                {selectedRecord.dueAmount > 0 ? (
                  <span className="text-xs font-semibold text-danger-600">
                    Due Balance: {formatCurrency(selectedRecord.dueAmount)}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-success-600">Fully Paid / Settled</span>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-2">
                Purchased / Exchanged Items
              </p>
              <table className="w-full text-left text-xs border border-ink-200 rounded-xl overflow-hidden">
                <thead className="bg-ink-50 font-semibold text-ink-600 border-b border-ink-200">
                  <tr>
                    <th className="p-2">Item Name</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {selectedRecord.items.map((item, idx) => {
                    const qty = Number(item.quantity) || 0;
                    const rate = Number(item.unitPriceCharged ?? item.salePrice ?? item.rate) || 0;
                    const line = item.lineTotal != null ? Number(item.lineTotal) : qty * rate;
                    return (
                      <tr key={idx}>
                        <td className="p-2 font-medium text-ink-800">{item.productName || 'Item'}</td>
                        <td className="p-2 text-right">{formatNumber(qty, 2)}</td>
                        <td className="p-2 text-right">{formatCurrency(rate)}</td>
                        <td className="p-2 text-right font-bold text-ink-900">{formatCurrency(line)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Printable Receipt Preview component inside Modal */}
            <div className="border-t border-dashed border-ink-300 pt-3">
              <SaleReceipt sale={selectedRecord.raw || selectedRecord} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
