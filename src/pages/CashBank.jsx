import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  Trash2,
  Printer,
  Coins,
  FileText,
} from 'lucide-react';
import { bankAccountsAPI, cashTxnsAPI, customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getErrorMessage, formatDateTime, cn } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Dropdown from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function CashBank() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Form states
  const [txnType, setTxnType] = useState('payment_in'); // 'payment_in' | 'payment_out' | 'deposit' | 'withdraw'
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cashAmt, setCashAmt] = useState('');
  const [bankAmt, setBankAmt] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [partyId, setPartyId] = useState('');
  const [note, setNote] = useState('');
  const [discount, setDiscount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bank Account Modal
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accOpening, setAccOpening] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bankRes, txnRes, custRes] = await Promise.all([
        bankAccountsAPI.getAll(),
        cashTxnsAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setBankAccounts(Array.isArray(bankRes) ? bankRes : bankRes?.data || []);
      setTxns(Array.isArray(txnRes) ? txnRes : txnRes?.data || []);
      setCustomers(Array.isArray(custRes) ? custRes : custRes?.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load cash and bank data'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculations
  const cashInHand = txns.reduce((sum, t) => {
    if (t.type === 'payment_in') return sum + (t.method === 'split' ? Number(t.cashAmt) || 0 : t.method !== 'bank' ? Number(t.amount) || 0 : 0);
    if (t.type === 'payment_out') return sum - (t.method === 'split' ? Number(t.cashAmt) || 0 : t.method !== 'bank' ? Number(t.amount) || 0 : 0);
    if (t.type === 'deposit') return sum - (Number(t.amount) || 0);
    if (t.type === 'withdraw') return sum + (Number(t.amount) || 0);
    return sum;
  }, 0);

  const bankTotal = bankAccounts.reduce((sum, acc) => {
    const accTxns = txns.filter((t) => t.bankId === acc._id || t.bankId === acc.id);
    const net = accTxns.reduce((s, t) => {
      if (t.type === 'payment_in') return s + (t.method === 'split' ? Number(t.bankAmt) || 0 : Number(t.amount) || 0);
      if (t.type === 'payment_out') return s - (t.method === 'split' ? Number(t.bankAmt) || 0 : Number(t.amount) || 0);
      if (t.type === 'deposit') return s + Number(t.amount || 0);
      if (t.type === 'withdraw') return s - Number(t.amount || 0);
      return s;
    }, 0);
    return sum + (Number(acc.openingBalance) || 0) + net;
  }, 0);

  const handleSaveAccount = async () => {
    if (!accName.trim()) return toast.error('Bank account name required');
    try {
      await bankAccountsAPI.create({
        name: accName.trim(),
        openingBalance: Number(accOpening) || 0,
      });
      toast.success('Bank account created');
      setAccName('');
      setAccOpening('');
      setAccModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create bank account'));
    }
  };

  const handleSaveTxn = async () => {
    setSubmitting(true);
    try {
      if (txnType === 'deposit' || txnType === 'withdraw') {
        const amt = Number(amount);
        if (!amt || amt <= 0) return toast.error('Enter a valid amount');
        if (!toAccount) return toast.error('Select a bank account');

        await cashTxnsAPI.create({
          date,
          type: txnType,
          amount: amt,
          note: note.trim(),
          bankId: toAccount,
        });
      } else {
        const cAmt = Math.max(0, Number(cashAmt) || 0);
        const bAmt = Math.max(0, Number(bankAmt) || 0);
        const discAmt = Math.max(0, Number(discount) || 0);
        const totAmt = cAmt + bAmt;
        if (totAmt <= 0 && discAmt <= 0) return toast.error('Enter cash amount, bank amount or discount');

        const method = cAmt > 0 && bAmt > 0 ? 'split' : bAmt > 0 ? 'bank' : 'cash';
        const partyObj = customers.find((c) => c._id === partyId);

        await cashTxnsAPI.create({
          date,
          type: txnType,
          amount: totAmt,
          note: note.trim(),
          method,
          bankId: bAmt > 0 ? bankAccountId || bankAccounts[0]?._id : null,
          cashAmt: cAmt,
          bankAmt: bAmt,
          discount: discAmt,
          partyId: partyId || null,
          partyName: partyObj?.name || '',
        });
      }

      toast.success('Cash/Bank transaction recorded');
      setCashAmt('');
      setBankAmt('');
      setAmount('');
      setNote('');
      setDiscount('');
      setPartyId('');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record transaction'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTxn = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      await cashTxnsAPI.delete(id);
      toast.success('Transaction removed');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete transaction'));
    }
  };

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
        title="Cash & Bank Management (کیش اور بینک)"
        subtitle="Manage cash in hand, multiple bank accounts, cash deposits, withdrawals and split payments"
      />

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-100">Cash In Hand</p>
            <Wallet className="h-5 w-5 text-amber-200" />
          </div>
          <p className="font-display text-2xl font-bold mt-2 text-white">{formatCurrency(cashInHand)}</p>
        </Card>

        <Card className="bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-100">Total Bank Balance</p>
            <Building2 className="h-5 w-5 text-brand-200" />
          </div>
          <p className="font-display text-2xl font-bold mt-2 text-white">{formatCurrency(bankTotal)}</p>
          <p className="text-[11px] text-brand-200 mt-1">{bankAccounts.length} Bank Account(s)</p>
        </Card>

        <Card className="bg-gradient-to-br from-ink-900 to-ink-950 text-white shadow-md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-300">Grand Total Liquid</p>
            <Coins className="h-5 w-5 text-amber-400" />
          </div>
          <p className="font-display text-2xl font-bold mt-2 text-amber-400">
            {formatCurrency(cashInHand + bankTotal)}
          </p>
        </Card>
      </div>

      {/* Accounts List & Add Account */}
      <div className="flex justify-between items-center">
        <h3 className="font-display text-base font-bold text-ink-900">Saved Bank Accounts</h3>
        <Button size="sm" variant="outline" leftIcon={Plus} onClick={() => setAccModalOpen(true)}>
          + Add Bank Account
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {bankAccounts.length === 0 ? (
          <Card className="col-span-full text-center py-6 text-xs text-ink-400">
            No bank accounts configured yet. Click &quot;+ Add Bank Account&quot; to add Meezan, HBL, JazzCash, etc.
          </Card>
        ) : (
          bankAccounts.map((acc) => {
            const accTxns = txns.filter((t) => t.bankId === acc._id || t.bankId === acc.id);
            const net = accTxns.reduce((s, t) => {
              if (t.type === 'payment_in') return s + (t.method === 'split' ? Number(t.bankAmt) || 0 : Number(t.amount) || 0);
              if (t.type === 'payment_out') return s - (t.method === 'split' ? Number(t.bankAmt) || 0 : Number(t.amount) || 0);
              if (t.type === 'deposit') return s + Number(t.amount || 0);
              if (t.type === 'withdraw') return s - Number(t.amount || 0);
              return s;
            }, 0);
            const bal = (Number(acc.openingBalance) || 0) + net;

            return (
              <Card key={acc._id || acc.id} className="bg-white border-brand-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-ink-900">{acc.name}</h4>
                  <Badge variant="outline" className="text-[10px]">Bank</Badge>
                </div>
                <p className="font-display text-lg font-bold text-brand-700 mt-2">
                  Rs {formatCurrency(bal)}
                </p>
              </Card>
            );
          })
        )}
      </div>

      {/* Transaction Entry Form */}
      <Card className="space-y-4 border-ink-200">
        <div className="flex flex-wrap gap-2 border-b border-ink-100 pb-3">
          {[
            { id: 'payment_in', label: 'Payment In (آمدن)' },
            { id: 'payment_out', label: 'Payment Out (اخراجات/ادائیگی)' },
            { id: 'deposit', label: 'Cash Deposit to Bank' },
            { id: 'withdraw', label: 'Cash Withdraw from Bank' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTxnType(t.id)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                txnType === t.id ? 'bg-brand-600 text-white shadow-sm' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          {(txnType === 'deposit' || txnType === 'withdraw') && (
            <>
              <Input
                label="Amount (Rs)"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">
                  {txnType === 'deposit' ? 'Deposit To Bank Account' : 'Withdraw From Bank Account'}
                </label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select bank account...</option>
                  {bankAccounts.map((a) => (
                    <option key={a._id || a.id} value={a._id || a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {(txnType === 'payment_in' || txnType === 'payment_out') && (
            <>
              <Input
                label="Cash Amount (Rs)"
                type="number"
                placeholder="0"
                value={cashAmt}
                onChange={(e) => setCashAmt(e.target.value)}
              />
              <Input
                label="Bank Amount (Rs)"
                type="number"
                placeholder="0"
                value={bankAmt}
                onChange={(e) => setBankAmt(e.target.value)}
              />
              {Number(bankAmt) > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Bank Account</label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select bank account...</option>
                    {bankAccounts.map((a) => (
                      <option key={a._id || a.id} value={a._id || a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Dropdown
                label="Party (Optional)"
                options={[
                  { value: '', label: 'None / General' },
                  ...customers.map((c) => ({ value: c._id, label: c.name })),
                ]}
                value={partyId}
                onChange={setPartyId}
                placeholder="Search party..."
                searchable
              />
              {partyId && (
                <Input
                  label="Discount / Waive Off (Rs)"
                  type="number"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              )}
            </>
          )}

          <Input
            label="Note / Reference"
            placeholder="e.g. Reason / detail / ref #"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end">
          <Button loading={submitting} onClick={handleSaveTxn}>
            Save Cash/Bank Entry
          </Button>
        </div>
      </Card>

      {/* History Log */}
      <Card className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-900">Cash & Bank Transactions Log</h3>
        {txns.length === 0 ? (
          <p className="text-center py-6 text-xs text-ink-400">No transactions recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                <tr>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Type</th>
                  <th className="py-2.5">Party / Note</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {txns.map((t) => (
                  <tr key={t._id}>
                    <td className="py-2.5 text-ink-500">{t.date}</td>
                    <td className="py-2.5">
                      <Badge variant={t.type.includes('in') || t.type === 'deposit' ? 'success' : 'danger'}>
                        {t.type}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-ink-800">{t.partyName || t.note || '-'}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-brand-800">
                      Rs {formatCurrency(t.amount)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteTxn(t._id)}
                        className="text-danger-600 hover:text-danger-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Bank Account Modal */}
      <Modal open={accModalOpen} onClose={() => setAccModalOpen(false)} title="Add New Bank Account">
        <div className="space-y-4 py-2">
          <Input
            label="Bank Name / Account Title *"
            placeholder="e.g. Meezan Bank / HBL / JazzCash"
            value={accName}
            onChange={(e) => setAccName(e.target.value)}
            required
          />
          <Input
            label="Opening Balance (Rs)"
            type="number"
            placeholder="0"
            value={accOpening}
            onChange={(e) => setAccOpening(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAccModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAccount}>Save Bank Account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
