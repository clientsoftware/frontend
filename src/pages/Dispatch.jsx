import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Truck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { dispatchAPI, productsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getErrorMessage,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, EmptyState } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';

const emptyExpense = { description: '', amount: '' };

const initialForm = {
  destinationCompany: '',
  productId: '',
  quantity: '',
  saleRate: '',
  expenses: [{ ...emptyExpense }],
};

function extractList(res, key) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (key && Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body?.dispatches)) return body.dispatches;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function getDispatchProfit(row) {
  const profit =
    row.netProfit ??
    row.netProfitLoss ??
    row.profit ??
    (Number(row.totalSaleValue ?? row.saleValue ?? 0) -
      Number(row.totalExpense ?? row.totalExpenses ?? 0));
  return Number(profit) || 0;
}

export default function Dispatch() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getAll();
      setProducts(extractList(res, 'products'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoadingProducts(false);
    }
  }, [toast]);

  const fetchDispatches = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await dispatchAPI.getAll();
      setDispatches(extractList(res, 'dispatches'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load dispatch history'));
    } finally {
      setLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
    fetchDispatches();
  }, [fetchProducts, fetchDispatches]);

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p._id,
        label: `${p.name} (${formatNumber(p.currentStock, 2)} ${p.primaryUnit || 'units'})`,
      })),
    [products]
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p._id === form.productId),
    [products, form.productId]
  );

  const totalSaleValue = useMemo(() => {
    const qty = Number(form.quantity) || 0;
    const rate = Number(form.saleRate) || 0;
    return qty * rate;
  }, [form.quantity, form.saleRate]);

  const totalExpense = useMemo(
    () =>
      form.expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0),
    [form.expenses]
  );

  const netProfit = totalSaleValue - totalExpense;

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductSelect = (productId) => {
    const product = products.find((p) => p._id === productId);
    setForm((prev) => ({
      ...prev,
      productId,
      saleRate: product?.salePrice != null ? String(product.salePrice) : prev.saleRate,
    }));
  };

  const updateExpense = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const addExpenseRow = () => {
    setForm((prev) => ({
      ...prev,
      expenses: [...prev.expenses, { ...emptyExpense }],
    }));
  };

  const removeExpenseRow = (index) => {
    setForm((prev) => ({
      ...prev,
      expenses:
        prev.expenses.length <= 1
          ? [{ ...emptyExpense }]
          : prev.expenses.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.destinationCompany.trim()) {
      toast.error('Destination company is required');
      return;
    }
    if (!form.productId) {
      toast.error('Select a product');
      return;
    }
    if (!(Number(form.quantity) > 0)) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (!(Number(form.saleRate) >= 0)) {
      toast.error('Enter a valid sale rate');
      return;
    }

    const expenses = form.expenses
      .filter((exp) => exp.description.trim() || Number(exp.amount) > 0)
      .map((exp) => ({
        description: exp.description.trim() || 'Expense',
        amount: Number(exp.amount) || 0,
      }));

    const payload = {
      destinationCompany: form.destinationCompany.trim(),
      productId: form.productId,
      quantity: Number(form.quantity),
      saleRate: Number(form.saleRate),
      expenses,
      totalSaleValue,
      totalExpense,
      netProfit,
    };

    setSubmitting(true);
    try {
      await dispatchAPI.create(payload);
      toast.success('Dispatch recorded successfully');
      resetForm();
      setFormOpen(false);
      fetchDispatches();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create dispatch'));
    } finally {
      setSubmitting(false);
    }
  };

  const [editItem, setEditItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReceivedQty, setEditReceivedQty] = useState('');
  const [editVehicleNumber, setEditVehicleNumber] = useState('');
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverPhone, setEditDriverPhone] = useState('');
  const [editBoxCount, setEditBoxCount] = useState('');
  const [editBoxCostPerUnit, setEditBoxCostPerUnit] = useState('');
  const [editFreightCost, setEditFreightCost] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const openEditModal = (row) => {
    setEditItem(row);
    setEditReceivedQty(String(row.receivedQuantity ?? row.sentQuantity ?? row.quantity ?? ''));
    setEditVehicleNumber(row.vehicleNumber || '');
    setEditDriverName(row.driverName || '');
    setEditDriverPhone(row.driverPhone || '');
    setEditBoxCount(String(row.boxCount ?? ''));
    setEditBoxCostPerUnit(String(row.boxCostPerUnit ?? ''));
    setEditFreightCost(String(row.freightCost ?? ''));
    setEditNotes(row.notes || '');
    setEditModalOpen(true);
  };

  const handleUpdateDispatch = async () => {
    if (!editItem) return;
    setSubmitting(true);
    try {
      await dispatchAPI.update(editItem._id || editItem.id, {
        receivedQuantity: Number(editReceivedQty),
        vehicleNumber: editVehicleNumber.trim(),
        driverName: editDriverName.trim(),
        driverPhone: editDriverPhone.trim(),
        boxCount: Number(editBoxCount) || 0,
        boxCostPerUnit: Number(editBoxCostPerUnit) || 0,
        freightCost: Number(editFreightCost) || 0,
        notes: editNotes.trim(),
      });
      toast.success('Dispatch details updated successfully');
      setEditModalOpen(false);
      setEditItem(null);
      fetchDispatches();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update dispatch'));
    } finally {
      setSubmitting(false);
    }
  };

  const historyColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (_, row) => formatDate(row.createdAt || row.date),
    },
    {
      key: 'destinationCompany',
      header: 'Company / Driver',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-semibold text-ink-900">{row.destinationCompany || row.companyName || row.company || '—'}</p>
          {(row.vehicleNumber || row.driverName) && (
            <p className="text-xs text-ink-500">
              🚛 {row.vehicleNumber || 'No vehicle'} {row.driverName ? `· ${row.driverName}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'productName',
      header: 'Item',
      render: (_, row) =>
        row.productName ||
        row.itemName ||
        row.product?.name ||
        products.find((p) => p._id === row.productId)?.name ||
        '—',
    },
    {
      key: 'quantity',
      header: 'Sent vs Received Qty',
      sortable: true,
      render: (val, row) => {
        const unit = row.unit || row.product?.primaryUnit || 'kg';
        const sent = row.sentQuantity ?? row.quantity ?? val ?? 0;
        const received = row.receivedQuantity ?? sent;
        const shortage = Math.max(0, sent - received);
        return (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-ink-800">
              Sent: {formatNumber(sent, 2)} {unit}
            </p>
            <p className="text-xs text-brand-700">
              Recv: {formatNumber(received, 2)} {unit}
            </p>
            {shortage > 0 && (
              <Badge variant="danger" size="sm">
                Shortage: -{formatNumber(shortage, 2)} {unit}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalSaleValue',
      header: 'Sale Value',
      sortable: true,
      render: (_, row) =>
        formatCurrency(row.totalSaleValue ?? row.saleValue ?? 0),
    },
    {
      key: 'totalExpense',
      header: 'Expenses & Packing',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-ink-900">{formatCurrency(row.totalExpense ?? row.totalExpenses ?? 0)}</p>
          {row.boxCount > 0 && (
            <p className="text-xs text-ink-500">📦 {row.boxCount} boxes @ Rs.{row.boxCostPerUnit}</p>
          )}
        </div>
      ),
    },
    {
      key: 'netProfit',
      header: 'Net Profit / Loss',
      sortable: true,
      render: (_, row) => {
        const profit = getDispatchProfit(row);
        const isProfit = profit >= 0;
        return (
          <div className="space-y-1">
            <Badge variant={isProfit ? 'success' : 'danger'} dot>
              {isProfit ? '+' : ''}
              {formatCurrency(profit)}
            </Badge>
            {row.shortageLoss > 0 && (
              <p className="text-[11px] text-danger-600">Theft loss: -{formatCurrency(row.shortageLoss)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
          Edit / Details
        </Button>
      ),
    },
  ];

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Destination Company"
        name="destinationCompany"
        placeholder="e.g. ABC Metals Pvt Ltd"
        value={form.destinationCompany}
        onChange={handleFormChange}
        required
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Item / Product"
          name="productId"
          value={form.productId}
          onChange={(e) => handleProductSelect(e.target.value)}
          options={productOptions}
          placeholder="Select product"
          required
          disabled={loadingProducts}
        />
        <Input
          label={`Quantity${selectedProduct ? ` (${selectedProduct.primaryUnit || 'units'})` : ''}`}
          name="quantity"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={form.quantity}
          onChange={handleFormChange}
          required
        />
        <Input
          label="Sale Rate (per unit)"
          name="saleRate"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={form.saleRate}
          onChange={handleFormChange}
          required
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-ink-700">
            Expenses <span className="text-ink-400">(packing, labour, transport…)</span>
          </label>
          <Button type="button" variant="ghost" size="sm" leftIcon={Plus} onClick={addExpenseRow}>
            Add row
          </Button>
        </div>
        <div className="space-y-2">
          {form.expenses.map((exp, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Description"
                value={exp.description}
                onChange={(e) => updateExpense(index, 'description', e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                step="any"
                placeholder="Amount"
                value={exp.amount}
                onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                className="w-36"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeExpenseRow(index)}
                aria-label="Remove expense"
              >
                <Trash2 className="h-4 w-4 text-ink-400" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Card className="border-brand-100 bg-brand-50/40">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Total Sale Value
            </p>
            <p className="mt-1 font-display text-xl font-bold text-ink-900">
              {formatCurrency(totalSaleValue)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Total Expense
            </p>
            <p className="mt-1 font-display text-xl font-bold text-ink-900">
              {formatCurrency(totalExpense)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
              Net Profit / Loss
            </p>
            <p
              className={cn(
                'mt-1 flex items-center gap-1.5 font-display text-xl font-bold',
                netProfit >= 0 ? 'text-success-700' : 'text-danger-700'
              )}
            >
              {netProfit >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            resetForm();
            setFormOpen(false);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" loading={submitting} leftIcon={Truck}>
          Submit Dispatch
        </Button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Bulk Dispatch"
        subtitle="Company sales with expense, shortage loss & packing box tracking"
        actions={
          <Button leftIcon={Plus} onClick={() => setFormOpen(true)}>
            New Dispatch
          </Button>
        }
      />

      <Table
        columns={historyColumns}
        data={dispatches}
        loading={loadingHistory}
        searchPlaceholder="Search dispatches..."
        searchKeys={['destinationCompany', 'company', 'companyName', 'productName', 'itemName', 'vehicleNumber', 'driverName']}
        emptyMessage="No dispatches recorded yet"
        toolbar={
          !formOpen ? (
            <Button variant="outline" size="sm" leftIcon={Plus} onClick={() => setFormOpen(true)}>
              Quick add
            </Button>
          ) : null
        }
        mobileCard={(row) => {
          const sent = row.sentQuantity ?? row.quantity ?? 0;
          const received = row.receivedQuantity ?? sent;
          const shortage = Math.max(0, sent - received);
          const profit = getDispatchProfit(row);
          return (
            <div className="space-y-2 p-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink-900">{row.destinationCompany || row.companyName || 'Dispatch'}</span>
                <span className="text-xs text-ink-400">{formatDate(row.createdAt || row.date)}</span>
              </div>
              <div className="text-sm font-medium text-brand-800">
                Item: {row.productName || row.itemName || '—'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ink-400">Sent Qty:</span> {formatNumber(sent, 2)}
                </div>
                <div>
                  <span className="text-ink-400">Recv Qty:</span> {formatNumber(received, 2)}
                </div>
              </div>
              {shortage > 0 && (
                <div className="rounded-lg bg-danger-50 px-2 py-1 text-xs font-semibold text-danger-700">
                  ⚠️ Theft Shortage: -{formatNumber(shortage, 2)} (Loss: {formatCurrency(row.shortageLoss || 0)})
                </div>
              )}
              <div className="flex items-center justify-between border-t border-ink-100 pt-2 text-xs">
                <span>Sale: {formatCurrency(row.totalSaleValue || 0)}</span>
                <Badge variant={profit >= 0 ? 'success' : 'danger'}>
                  Net: {formatCurrency(profit)}
                </Badge>
              </div>
              <Button variant="soft" size="sm" className="w-full mt-2" onClick={() => openEditModal(row)}>
                Edit Details / Update Delivery
              </Button>
            </div>
          );
        }}
      />

      {!formOpen && dispatches.length === 0 && !loadingHistory && (
        <div className="mt-6">
          <Card>
            <EmptyState
              icon={Truck}
              title="No bulk dispatches yet"
              description="Record company sales with packing, labour, vehicle freight, and shortage loss tracking."
              action={
                <Button leftIcon={Plus} onClick={() => setFormOpen(true)}>
                  Create first dispatch
                </Button>
              }
            />
          </Card>
        </div>
      )}

      {/* New Dispatch Modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          resetForm();
          setFormOpen(false);
        }}
        title="New Bulk Dispatch"
        size="lg"
      >
        {renderForm()}
      </Modal>

      {/* Edit / Update Delivery Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditItem(null);
        }}
        title={`Update Dispatch — ${editItem?.destinationCompany || editItem?.companyName || 'Company'}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50/50 p-3 border border-brand-100">
            <p className="text-xs text-brand-800 font-medium">
              Item: {editItem?.productName || editItem?.itemName} | Sent Qty: {formatNumber(editItem?.sentQuantity ?? editItem?.quantity ?? 0, 2)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Actual Received Qty (Company Weight)"
              type="number"
              min="0"
              step="any"
              value={editReceivedQty}
              onChange={(e) => setEditReceivedQty(e.target.value)}
              hint="Actual quantity weighed by company at destination"
            />
            <Input
              label="Vehicle / Truck No."
              value={editVehicleNumber}
              onChange={(e) => setEditVehicleNumber(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Driver Name"
              value={editDriverName}
              onChange={(e) => setEditDriverName(e.target.value)}
            />
            <Input
              label="Driver Phone"
              value={editDriverPhone}
              onChange={(e) => setEditDriverPhone(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              label="Packing Boxes Count"
              type="number"
              min="0"
              value={editBoxCount}
              onChange={(e) => setEditBoxCount(e.target.value)}
            />
            <Input
              label="Cost Per Box (Rs)"
              type="number"
              min="0"
              step="0.01"
              value={editBoxCostPerUnit}
              onChange={(e) => setEditBoxCostPerUnit(e.target.value)}
            />
            <Input
              label="Freight / Gadi Rent (Rs)"
              type="number"
              min="0"
              step="0.01"
              value={editFreightCost}
              onChange={(e) => setEditFreightCost(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink-700 block mb-1">Notes / Special Remarks</label>
            <textarea
              className="w-full rounded-xl border border-ink-200 p-2 text-sm outline-none focus:border-brand-400"
              rows={2}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="e.g. Driver paid cash, gate pass details..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} onClick={handleUpdateDispatch}>
              Save Updates
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
