import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Wallet,
  Printer,
  MessageCircle,
  User,
  AlertCircle,
} from 'lucide-react';
import { customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  openWhatsAppShare,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, EmptyState, Spinner } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
];

function extractData(res, fallback = null) {
  const body = res?.data;
  if (body?.data != null) return body.data;
  if (body?.customer) return body.customer;
  if (body?.payment) return body.payment;
  return body ?? fallback;
}

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.ledger)) return body.ledger;
  if (Array.isArray(body?.entries)) return body.entries;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function getDueBalance(customer) {
  return Number(customer?.dueBalance ?? customer?.currentDue ?? customer?.due ?? 0);
}

function getCreditLimit(customer) {
  return Number(customer?.creditLimit ?? 0);
}

function getCustomerStatus(customer) {
  const due = getDueBalance(customer);
  const limit = getCreditLimit(customer);
  if (due <= 0 || due <= limit) {
    return { label: 'Clear', variant: 'success' };
  }
  return { label: 'Over Limit', variant: 'danger' };
}

export default function CustomerDetail() {
  const { id } = useParams();
  const toast = useToast();

  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [error, setError] = useState(null);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'cash', note: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await customersAPI.getById(id);
      setCustomer(extractData(res));
    } catch (err) {
      setError(getErrorMessage(err, 'Customer not found'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLedger = useCallback(async () => {
    setLoadingLedger(true);
    try {
      const res = await customersAPI.getLedger(id);
      setLedger(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load ledger'));
    } finally {
      setLoadingLedger(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchCustomer();
    fetchLedger();
  }, [fetchCustomer, fetchLedger]);

  const openPaymentModal = () => {
    setPaymentForm({
      amount: String(getDueBalance(customer) || ''),
      paymentMode: 'cash',
      note: '',
    });
    setPaymentModalOpen(true);
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await customersAPI.receivePayment(id, {
        amount,
        paymentMode: paymentForm.paymentMode,
        note: paymentForm.note.trim() || undefined,
      });
      const receipt = extractData(res, {
        amount,
        paymentMode: paymentForm.paymentMode,
        customer,
        createdAt: new Date().toISOString(),
      });
      setPaymentReceipt({
        ...receipt,
        customer: receipt.customer || customer,
        amount: receipt.amount ?? amount,
        paymentMode: receipt.paymentMode ?? paymentForm.paymentMode,
      });
      setPaymentModalOpen(false);
      setReceiptOpen(true);
      toast.success('Payment recorded');
      fetchCustomer();
      fetchLedger();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record payment'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrintReceipt = () => window.print();

  const handleWhatsAppReceipt = () => {
    const phone = paymentReceipt?.customer?.phone || customer?.phone;
    const text = [
      'Payment Receipt — Electric Shop',
      `Customer: ${paymentReceipt?.customer?.name || customer?.name}`,
      `Amount: ${formatCurrency(paymentReceipt?.amount)}`,
      `Mode: ${paymentReceipt?.paymentMode}`,
      `Date: ${formatDateTime(paymentReceipt?.createdAt)}`,
    ].join('\n');
    openWhatsAppShare(phone, text);
  };

  const ledgerColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (_, row) => formatDate(row.createdAt || row.date),
    },
    {
      key: 'description',
      header: 'Description',
      render: (_, row) =>
        row.description || row.note || row.reference || row.type || '—',
    },
    {
      key: 'debit',
      header: 'Debit',
      sortable: true,
      className: 'text-right',
      render: (val, row) => {
        const debit = Number(val ?? row.debit ?? 0);
        return debit > 0 ? (
          <span className="font-medium text-danger-600">{formatCurrency(debit)}</span>
        ) : (
          '—'
        );
      },
    },
    {
      key: 'credit',
      header: 'Credit',
      sortable: true,
      className: 'text-right',
      render: (val, row) => {
        const credit = Number(val ?? row.credit ?? 0);
        return credit > 0 ? (
          <span className="font-medium text-success-600">{formatCurrency(credit)}</span>
        ) : (
          '—'
        );
      },
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      className: 'text-right',
      render: (val, row) => (
        <span className="font-semibold text-ink-900">
          {formatCurrency(val ?? row.balance ?? row.runningBalance ?? 0)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div>
        <Link
          to="/customers"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Link>
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="Customer not found"
            description={error || 'This customer may have been removed.'}
            action={
              <Link to="/customers">
                <Button variant="outline">Go to Customers</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const status = getCustomerStatus(customer);
  const due = getDueBalance(customer);

  return (
    <div>
      <Link
        to="/customers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </Link>

      <PageHeader
        title={customer.name}
        subtitle={customer.phone || customer.email || 'Customer account'}
        actions={
          <Button leftIcon={Wallet} onClick={openPaymentModal}>
            Receive Payment
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Current Due</p>
          <p className={cn('mt-1 font-display text-2xl font-bold', due > 0 ? 'text-warning-600' : 'text-ink-900')}>
            {formatCurrency(due)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Credit Limit</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900">
            {formatCurrency(getCreditLimit(customer))}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Status</p>
          <div className="mt-2">
            <Badge variant={status.variant} dot className="text-sm px-3 py-1">
              {status.label}
            </Badge>
          </div>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Contact</p>
          <div className="mt-1 space-y-0.5 text-sm text-ink-700">
            {customer.phone && <p>{customer.phone}</p>}
            {customer.email && <p className="text-ink-500">{customer.email}</p>}
            {customer.address && <p className="text-xs text-ink-400">{customer.address}</p>}
            {!customer.phone && !customer.email && !customer.address && (
              <p className="text-ink-400">No contact info</p>
            )}
          </div>
        </Card>
      </div>

      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Transaction Ledger</h2>
        <p className="text-sm text-ink-500">Full history of debits, credits, and running balance</p>
      </div>

      {loadingLedger ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : ledger.length === 0 ? (
        <Card>
          <EmptyState
            icon={User}
            title="No transactions yet"
            description="Sales on credit and payments will appear here."
            action={
              <Button leftIcon={Wallet} onClick={openPaymentModal}>
                Record Payment
              </Button>
            }
          />
        </Card>
      ) : (
        <Table
          columns={ledgerColumns}
          data={ledger}
          searchable={false}
          emptyMessage="No ledger entries"
        />
      )}

      {/* Receive Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Receive Payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={submittingPayment} onClick={handleReceivePayment}>
              Record Payment
            </Button>
          </>
        }
      >
        <form onSubmit={handleReceivePayment} className="space-y-4">
          <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm">
            <p className="text-ink-500">Outstanding due</p>
            <p className="font-display text-xl font-bold text-warning-600">
              {formatCurrency(due)}
            </p>
          </div>
          <Input
            label="Amount"
            type="number"
            min="0"
            step="any"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
            required
          />
          <Select
            label="Payment Mode"
            value={paymentForm.paymentMode}
            onChange={(e) => setPaymentForm((p) => ({ ...p, paymentMode: e.target.value }))}
            options={PAYMENT_MODES}
          />
          <Textarea
            label="Note (optional)"
            value={paymentForm.note}
            onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))}
          />
        </form>
      </Modal>

      {/* Payment Receipt */}
      <Modal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setPaymentReceipt(null);
        }}
        title="Payment Receipt"
        footer={
          <>
            <Button variant="outline" leftIcon={Printer} onClick={handlePrintReceipt}>
              Print
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsAppReceipt}>
              WhatsApp
            </Button>
            <Button onClick={() => { setReceiptOpen(false); setPaymentReceipt(null); }}>
              Done
            </Button>
          </>
        }
      >
        {paymentReceipt && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-display text-lg font-bold text-ink-900">Electric Shop</p>
              <p className="text-sm text-ink-500">Payment Receipt</p>
            </div>
            <div className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Customer</span>
                <span className="font-medium">{paymentReceipt.customer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Date</span>
                <span>{formatDateTime(paymentReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Mode</span>
                <span className="capitalize">{paymentReceipt.paymentMode}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2">
                <span className="font-medium">Amount</span>
                <span className="font-display text-lg font-bold text-success-700">
                  {formatCurrency(paymentReceipt.amount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
