import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Wallet,
  Printer,
  MessageCircle,
  Users,
} from 'lucide-react';
import { customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDateTime,
  getErrorMessage,
  openWhatsAppShare,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, EmptyState } from '../components/ui/Card';
import { Input, Select, Textarea } from '../components/ui/Input';

const emptyCustomer = {
  name: '',
  phone: '',
  email: '',
  address: '',
  creditLimit: '',
};

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
];

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.customers)) return body.customers;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function extractData(res, fallback = null) {
  const body = res?.data;
  if (body?.data != null) return body.data;
  if (body?.customer) return body.customer;
  if (body?.payment) return body.payment;
  return body ?? fallback;
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

export default function Customers() {
  const toast = useToast();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'cash', note: '' });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [receiptOpen, setReceiptOpen] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll();
      setCustomers(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomer);
    setCustomerModalOpen(true);
  };

  const openEditModal = (customer, e) => {
    e?.stopPropagation();
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      creditLimit: customer.creditLimit ?? '',
    });
    setCustomerModalOpen(true);
  };

  const openPaymentModal = (customer, e) => {
    e?.stopPropagation();
    setPaymentCustomer(customer);
    setPaymentForm({
      amount: String(getDueBalance(customer) || ''),
      paymentMode: 'cash',
      note: '',
    });
    setPaymentModalOpen(true);
  };

  const handleCustomerFormChange = (e) => {
    const { name, value } = e.target;
    setCustomerForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const payload = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      address: customerForm.address.trim(),
      creditLimit: Number(customerForm.creditLimit) || 0,
    };

    setSavingCustomer(true);
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer._id, payload);
        toast.success('Customer updated');
      } else {
        await customersAPI.create(payload);
        toast.success('Customer added');
      }
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save customer'));
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleReceivePayment = async (e) => {
    e.preventDefault();
    if (!paymentCustomer) return;

    const amount = Number(paymentForm.amount);
    if (!(amount > 0)) {
      toast.error('Enter a valid payment amount');
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await customersAPI.receivePayment(paymentCustomer._id, {
        amount,
        paymentMode: paymentForm.paymentMode,
        note: paymentForm.note.trim() || undefined,
      });
      const receipt = extractData(res, {
        amount,
        paymentMode: paymentForm.paymentMode,
        customer: paymentCustomer,
        createdAt: new Date().toISOString(),
      });
      setPaymentReceipt({
        ...receipt,
        customer: receipt.customer || paymentCustomer,
        amount: receipt.amount ?? amount,
        paymentMode: receipt.paymentMode ?? paymentForm.paymentMode,
      });
      setPaymentModalOpen(false);
      setReceiptOpen(true);
      toast.success('Payment recorded');
      fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record payment'));
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleWhatsAppReceipt = () => {
    const customer = paymentReceipt?.customer;
    const phone = customer?.phone;
    const text = [
      'Payment Receipt — Electric Shop',
      `Customer: ${customer?.name || 'N/A'}`,
      `Amount: ${formatCurrency(paymentReceipt?.amount)}`,
      `Mode: ${PAYMENT_MODES.find((m) => m.value === paymentReceipt?.paymentMode)?.label || paymentReceipt?.paymentMode}`,
      `Date: ${formatDateTime(paymentReceipt?.createdAt)}`,
      'Thank you!',
    ].join('\n');
    openWhatsAppShare(phone, text);
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (val) => <span className="font-medium text-ink-900">{val}</span>,
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (_, row) => (
        <div className="text-sm">
          <p>{row.phone || '—'}</p>
          {row.email && <p className="text-xs text-ink-400">{row.email}</p>}
        </div>
      ),
    },
    {
      key: 'dueBalance',
      header: 'Current Due',
      sortable: true,
      render: (_, row) => {
        const due = getDueBalance(row);
        return (
          <span className={cn('font-semibold', due > 0 ? 'text-warning-600' : 'text-ink-700')}>
            {formatCurrency(due)}
          </span>
        );
      },
    },
    {
      key: 'creditLimit',
      header: 'Credit Limit',
      sortable: true,
      render: (_, row) => formatCurrency(getCreditLimit(row)),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const status = getCustomerStatus(row);
        return (
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-48',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="soft"
            size="sm"
            leftIcon={Wallet}
            onClick={(e) => openPaymentModal(row, e)}
          >
            Payment
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => openEditModal(row, e)}
            aria-label="Edit customer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts, credit limits, and payments"
        actions={
          <Button leftIcon={Plus} onClick={openAddModal}>
            Add Customer
          </Button>
        }
      />

      <Table
        columns={columns}
        data={customers}
        loading={loading}
        searchPlaceholder="Search customers..."
        searchKeys={['name', 'phone', 'email']}
        onRowClick={(row) => navigate(`/customers/${row._id}`)}
        emptyMessage="No customers found"
      />

      {!loading && customers.length === 0 && (
        <div className="mt-6">
          <Card>
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Add customers to track credit sales and due balances."
              action={
                <Button leftIcon={Plus} onClick={openAddModal}>
                  Add first customer
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {/* Add / Edit Customer */}
      <Modal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        footer={
          <>
            <Button variant="outline" onClick={() => setCustomerModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingCustomer} onClick={handleSaveCustomer}>
              {editingCustomer ? 'Save Changes' : 'Add Customer'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <Input
            label="Name"
            name="name"
            value={customerForm.name}
            onChange={handleCustomerFormChange}
            required
          />
          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={customerForm.phone}
            onChange={handleCustomerFormChange}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={customerForm.email}
            onChange={handleCustomerFormChange}
          />
          <Textarea
            label="Address"
            name="address"
            value={customerForm.address}
            onChange={handleCustomerFormChange}
          />
          <Input
            label="Credit Limit"
            name="creditLimit"
            type="number"
            min="0"
            step="any"
            value={customerForm.creditLimit}
            onChange={handleCustomerFormChange}
            hint="Maximum allowed outstanding balance"
          />
        </form>
      </Modal>

      {/* Receive Payment */}
      <Modal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title={`Receive Payment${paymentCustomer ? ` — ${paymentCustomer.name}` : ''}`}
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
        {paymentCustomer && (
          <form onSubmit={handleReceivePayment} className="space-y-4">
            <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3 text-sm">
              <p className="text-ink-500">Outstanding due</p>
              <p className="font-display text-xl font-bold text-warning-600">
                {formatCurrency(getDueBalance(paymentCustomer))}
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
              placeholder="Reference or remarks"
            />
          </form>
        )}
      </Modal>

      {/* Payment Receipt */}
      <Modal
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setPaymentReceipt(null);
        }}
        title="Payment Receipt"
        size="md"
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
          <div id="payment-receipt" className="space-y-4 print:p-4">
            <div className="text-center">
              <p className="font-display text-lg font-bold text-ink-900">Electric Shop</p>
              <p className="text-sm text-ink-500">Payment Receipt</p>
            </div>
            <div className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Customer</span>
                <span className="font-medium text-ink-900">
                  {paymentReceipt.customer?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Date</span>
                <span>{formatDateTime(paymentReceipt.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Payment Mode</span>
                <span className="capitalize">{paymentReceipt.paymentMode}</span>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2">
                <span className="font-medium text-ink-700">Amount Received</span>
                <span className="font-display text-lg font-bold text-success-700">
                  {formatCurrency(paymentReceipt.amount)}
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-ink-400">
              Thank you for your payment
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
