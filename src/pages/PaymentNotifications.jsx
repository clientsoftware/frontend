import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  MessageCircle,
  Wallet,
  ArrowUpDown,
  Printer,
  History,
  CheckCircle2,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  openWhatsAppShare,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, StatCard, EmptyState } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

function extractList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.customers)) return d.customers;
  if (Array.isArray(d?.dues)) return d.dues;
  return [];
}

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
];

export default function PaymentNotifications() {
  const toast = useToast();
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('amount');
  const [paymentModal, setPaymentModal] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'cash', note: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getDues({ sort: sortBy });
      setDues(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load payment dues'));
      setDues([]);
    } finally {
      setLoading(false);
    }
  }, [toast, sortBy]);

  useEffect(() => {
    load();
  }, [load]);

  const totalDue = useMemo(
    () => dues.reduce((s, d) => s + (Number(d.dueBalance ?? d.amount ?? 0) || 0), 0),
    [dues]
  );

  const totalCollected = useMemo(
    () => dues.reduce((s, d) => s + (Number(d.totalPaid || 0) || 0), 0),
    [dues]
  );

  const overdueCount = useMemo(
    () => dues.filter((d) => (d.daysOverdue || 0) > 0).length,
    [dues]
  );

  const sendReminder = (row) => {
    const phone = row.phone || row.contact;
    const name = row.name || 'Customer';
    const due = formatCurrency(row.dueBalance ?? row.amount ?? 0);
    openWhatsAppShare(
      phone,
      `Dear ${name},\n\nThis is a friendly reminder that your outstanding balance of ${due} is pending with Electric Shop.\n\nPlease arrange payment at your earliest convenience.\n\nThank you!`
    );
    toast.success('WhatsApp reminder opened');
  };

  const openPayment = (row) => {
    setPaymentModal(row);
    setPayForm({
      amount: String(row.dueBalance ?? row.amount ?? ''),
      mode: 'cash',
      note: '',
    });
  };

  const submitPayment = async (e) => {
    e?.preventDefault();
    const amount = Number(payForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSaving(true);
    try {
      const id = paymentModal._id || paymentModal.id;
      const res = await customersAPI.receivePayment(id, {
        amount,
        mode: payForm.mode,
        note: payForm.note,
      });
      const data = res.data?.data || res.data;
      toast.success('Payment recorded');
      setPaymentModal(null);
      setReceipt({
        customer: paymentModal,
        amount,
        mode: payForm.mode,
        receiptNo: data?.receiptNo || data?._id || `RCP-${Date.now()}`,
        date: new Date().toISOString(),
      });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Payment failed'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer (گاہک)',
      sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-ink-900">{v}</p>
          <p className="text-xs text-ink-400">{row.phone || row.contact || '—'}</p>
        </div>
      ),
    },
    {
      key: 'dueBalance',
      header: 'Pending Due (باقی ادھار)',
      sortable: true,
      render: (v, row) => (
        <span className="font-bold text-danger-600 text-sm">
          {formatCurrency(v ?? row.amount ?? 0)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Total Paid (کتنی رقم دے دی)',
      sortable: true,
      render: (v) => (
        <span className="font-bold text-success-600 text-sm">
          {formatCurrency(v || 0)}
        </span>
      ),
    },
    {
      key: 'lastPaymentDate',
      header: 'Last Paid & Date (آخری ادائیگی)',
      render: (_, row) => {
        if (!row.lastPaymentDate && !row.lastPaymentAmount) {
          return <span className="text-xs text-ink-400">کوئی نہیں (None)</span>;
        }
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-ink-800">
              {formatCurrency(row.lastPaymentAmount || 0)}{' '}
              <span className="text-[10px] text-ink-400 uppercase font-normal">
                ({row.lastPaymentMode || 'Cash'})
              </span>
            </p>
            <p className="text-[11px] text-ink-500">
              {row.lastPaymentDate ? formatDate(row.lastPaymentDate) : '—'}
            </p>
          </div>
        );
      },
    },
    {
      key: 'history',
      header: 'History (کب کب دی تھی)',
      render: (_, row) => {
        const count = row.paymentsHistory?.length || 0;
        return (
          <Button
            size="xs"
            variant="soft"
            leftIcon={History}
            onClick={(e) => {
              e.stopPropagation();
              setHistoryModal(row);
            }}
            className="text-xs"
          >
            {count > 0 ? `📜 History (${count})` : '📜 History'}
          </Button>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            size="xs"
            variant="soft"
            leftIcon={MessageCircle}
            onClick={() => sendReminder(row)}
          >
            Remind
          </Button>
          <Button size="xs" leftIcon={Wallet} onClick={() => openPayment(row)}>
            Receive
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Payment Notifications & Dues"
        subtitle="گاہکوں کا باقی ادھار، ادا شدہ رقم اور تمام ادائیگیوں کی ہسٹری (کب کب دی تھی)"
        actions={
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'amount', label: 'Sort by Due Amount' },
              { value: 'days', label: 'Sort by Days Overdue' },
            ]}
            className="w-48"
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Pending Dues"
          value={formatCurrency(totalDue)}
          icon={Bell}
          tone="danger"
          loading={loading}
        />
        <StatCard
          title="Total Collected From Dues"
          value={formatCurrency(totalCollected)}
          icon={CheckCircle2}
          tone="success"
          loading={loading}
        />
        <StatCard
          title="Customers with Due"
          value={String(dues.length)}
          icon={ArrowUpDown}
          tone="warning"
          loading={loading}
        />
      </div>

      {!loading && dues.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            icon={Bell}
            title="All clear"
            description="No customers with pending payments right now."
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={dues}
          loading={loading}
          searchPlaceholder="Search customer by name or phone..."
          searchKeys={['name', 'phone', 'contact']}
          emptyMessage="No pending dues"
        />
      )}

      {/* Payment History Modal */}
      <Modal
        open={!!historyModal}
        onClose={() => setHistoryModal(null)}
        title={`Payment History (ادائیگی کی تاریخ) — ${historyModal?.name || ''}`}
        footer={
          <Button variant="outline" onClick={() => setHistoryModal(null)}>
            Close (بند کریں)
          </Button>
        }
      >
        {historyModal && (
          <div className="space-y-4">
            {/* Header stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-ink-50 rounded-xl text-xs">
              <div>
                <p className="text-ink-500">Customer Phone</p>
                <p className="font-semibold text-ink-900">{historyModal.phone || historyModal.contact || '—'}</p>
              </div>
              <div>
                <p className="text-ink-500">Current Pending Due</p>
                <p className="font-bold text-danger-600">{formatCurrency(historyModal.dueBalance ?? historyModal.amount ?? 0)}</p>
              </div>
              <div>
                <p className="text-ink-500">Total Paid So Far</p>
                <p className="font-bold text-success-600">{formatCurrency(historyModal.totalPaid || 0)}</p>
              </div>
            </div>

            {/* List of payments */}
            <div>
              <h4 className="text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand-600" />
                Payments Recorded (کب کب رقم ادا کی گئی):
              </h4>

              {(!historyModal.paymentsHistory || historyModal.paymentsHistory.length === 0) ? (
                <div className="text-center py-6 text-ink-400 bg-white border border-dashed border-ink-200 rounded-xl">
                  <p className="text-sm">ابھی تک کوئی الگ پیمنٹ ریکارڈ نہیں ہے</p>
                  <p className="text-xs text-ink-400 mt-1">No separate payment history found for this customer.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-ink-200 rounded-xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-ink-50 text-ink-700 font-semibold border-b border-ink-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Date & Time (تاریخ اور وقت)</th>
                        <th className="py-2.5 px-3 text-right">Amount (رقم)</th>
                        <th className="py-2.5 px-3">Mode</th>
                        <th className="py-2.5 px-3">Receipt / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100 bg-white">
                      {historyModal.paymentsHistory.map((p, idx) => (
                        <tr key={p._id || idx} className="hover:bg-ink-50/60">
                          <td className="py-2.5 px-3 text-ink-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-ink-900">
                            {formatDateTime(p.date)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-success-600">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant={p.paymentMode === 'bank' ? 'brand' : 'default'} size="xs">
                              {p.paymentMode?.toUpperCase() || 'CASH'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-ink-600">
                            <div>
                              {p.receiptNo && <span className="font-mono text-[10px] text-brand-600 block">{p.receiptNo}</span>}
                              <span>{p.note || '—'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Receive Payment Modal */}
      <Modal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        title={`Receive Payment — ${paymentModal?.name || ''}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentModal(null)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={submitPayment}>
              Confirm Payment
            </Button>
          </>
        }
      >
        <form onSubmit={submitPayment} className="space-y-4">
          <p className="rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-700">
            Outstanding: {formatCurrency(paymentModal?.dueBalance ?? paymentModal?.amount ?? 0)}
          </p>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            required
            value={payForm.amount}
            onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Select
            label="Payment Mode"
            value={payForm.mode}
            onChange={(e) => setPayForm((f) => ({ ...f, mode: e.target.value }))}
            options={PAYMENT_MODES}
          />
          <Input
            label="Note"
            value={payForm.note}
            onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Optional"
          />
        </form>
      </Modal>

      {/* Receipt Modal */}
      <Modal
        open={!!receipt}
        onClose={() => setReceipt(null)}
        title="Payment Receipt"
        footer={
          <>
            <Button
              variant="outline"
              leftIcon={Printer}
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button
              leftIcon={MessageCircle}
              onClick={() =>
                openWhatsAppShare(
                  receipt?.customer?.phone || receipt?.customer?.contact,
                  `Payment Receipt ${receipt?.receiptNo}\nAmount: ${formatCurrency(receipt?.amount)}\nMode: ${receipt?.mode}\nThank you — Electric Shop`
                )
              }
            >
              WhatsApp
            </Button>
          </>
        }
      >
        {receipt && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-ink-400">Receipt No:</span>{' '}
              <span className="font-semibold">{receipt.receiptNo}</span>
            </p>
            <p>
              <span className="text-ink-400">Customer:</span> {receipt.customer?.name}
            </p>
            <p>
              <span className="text-ink-400">Amount:</span>{' '}
              <span className="font-semibold text-success-600">
                {formatCurrency(receipt.amount)}
              </span>
            </p>
            <p>
              <span className="text-ink-400">Mode:</span> {receipt.mode}
            </p>
            <p>
              <span className="text-ink-400">Date:</span> {formatDate(receipt.date)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

