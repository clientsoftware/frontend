import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Send, CheckCircle2, UserCheck, ShieldAlert, History } from 'lucide-react';
import { customersAPI, partyTransfersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, getErrorMessage, formatDateTime } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Dropdown from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';

export default function PartyTransfer() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [fromPartyId, setFromPartyId] = useState('');
  const [toPartyId, setToPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [custRes, transRes] = await Promise.all([
        customersAPI.getAll(),
        partyTransfersAPI.getAll(),
      ]);
      const list = Array.isArray(custRes) ? custRes : custRes?.data || [];
      const transList = Array.isArray(transRes) ? transRes : transRes?.data || [];
      setCustomers(list);
      setTransfers(transList);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load parties data'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const partyOptions = customers.map((c) => ({
    value: c._id,
    label: `${c.name} (${c.phone ? c.phone + ' · ' : ''}Balance: Rs ${formatCurrency(c.currentDueBalance || c.dueBalance || 0)})`,
  }));

  const fromParty = customers.find((c) => c._id === fromPartyId);
  const toParty = customers.find((c) => c._id === toPartyId);

  const handleTransfer = async () => {
    if (!fromPartyId) return toast.error('Select From Party (Jo Denay Wala)');
    if (!toPartyId) return toast.error('Select To Party (Jo Lenay Wala)');
    if (fromPartyId === toPartyId) return toast.error('Sender aur Receiver different parties honi chahiye');
    if (!amount || Number(amount) <= 0) return toast.error('Valid transfer amount enter karein');

    setSubmitting(true);
    try {
      await partyTransfersAPI.create({
        fromPartyId,
        toPartyId,
        amount: Number(amount),
        reference: reference.trim(),
        date: new Date().toISOString().slice(0, 10),
      });
      toast.success(`Rs ${formatCurrency(Number(amount))} successfully transferred!`);
      setFromPartyId('');
      setToPartyId('');
      setAmount('');
      setReference('');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to transfer balance'));
    } finally {
      setSubmitting(false);
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
        title="Party to Party Balance Transfer (پارٹی ٹرانسفر)"
        subtitle="Ek party se doosri party ko khata / balance direct transfer karein"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Transfer Form */}
        <Card className="space-y-4 lg:col-span-2 border-brand-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-ink-100 pb-3">
            <ArrowLeftRight className="h-5 w-5 text-brand-600" />
            <h3 className="font-display text-base font-bold text-ink-900">
              New Party Balance Transfer Entry
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Dropdown
              label="📤 From Party (Jo Denay Wala / Transferring From) *"
              options={partyOptions}
              value={fromPartyId}
              onChange={setFromPartyId}
              placeholder="Select sender party..."
              searchable
            />

            <Dropdown
              label="📥 To Party (Jo Lenay Wala / Transferring To) *"
              options={partyOptions}
              value={toPartyId}
              onChange={setToPartyId}
              placeholder="Select receiver party..."
              searchable
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Transfer Amount (Rs) *"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <Input
              label="Reference / Cheque No. / Note (Optional)"
              placeholder="e.g. Bank ref, Cheque #4920, Settlement note..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {fromParty && toParty && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3 text-xs space-y-1">
              <p className="font-bold text-brand-900">Transfer Impact Preview:</p>
              <p className="text-ink-700">
                • <span className="font-semibold text-brand-800">{fromParty.name}</span> ka due balance{' '}
                <span className="font-mono font-bold text-success-700">+Rs {formatCurrency(Number(amount) || 0)}</span> se increase hoga.
              </p>
              <p className="text-ink-700">
                • <span className="font-semibold text-brand-800">{toParty.name}</span> ka due balance{' '}
                <span className="font-mono font-bold text-danger-700">-Rs {formatCurrency(Number(amount) || 0)}</span> se decrease hoga.
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              size="lg"
              loading={submitting}
              onClick={handleTransfer}
              leftIcon={Send}
              className="px-8 font-bold"
            >
              Confirm Balance Transfer
            </Button>
          </div>
        </Card>

        {/* Transfer Stats Card */}
        <Card className="space-y-4 lg:col-span-1 bg-gradient-to-br from-ink-900 to-brand-950 text-white">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <History className="h-4 w-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Transfer Summary</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-brand-200">Total Transfers Recorded</p>
              <p className="font-display text-2xl font-bold text-white">{transfers.length}</p>
            </div>
            <div className="border-t border-white/10 pt-2">
              <p className="text-xs text-brand-200">Total Amount Transferred</p>
              <p className="font-display text-xl font-bold text-amber-400">
                Rs {formatCurrency(transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* History Table */}
      <Card className="space-y-4">
        <h3 className="font-display text-base font-bold text-ink-900">Party Transfer History Log</h3>
        {transfers.length === 0 ? (
          <p className="text-center py-8 text-xs text-ink-400">No party balance transfers recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                <tr>
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">From Party (Sender)</th>
                  <th className="py-2.5">To Party (Receiver)</th>
                  <th className="py-2.5 text-right">Amount</th>
                  <th className="py-2.5">Reference / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {transfers.map((t) => (
                  <tr key={t._id}>
                    <td className="py-2.5 text-ink-500">{t.date}</td>
                    <td className="py-2.5 font-bold text-ink-900">{t.fromPartyName}</td>
                    <td className="py-2.5 font-bold text-brand-700">{t.toPartyName}</td>
                    <td className="py-2.5 text-right font-mono font-bold text-brand-800">
                      Rs {formatCurrency(t.amount)}
                    </td>
                    <td className="py-2.5 text-ink-600">{t.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
