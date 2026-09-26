import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Undo2,
  Printer,
  MessageCircle,
  Package,
  Info,
  CheckSquare,
  Square,
} from 'lucide-react';
import { returnsAPI, salesAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
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

const REFUND_MODES = [
  { value: 'cash', label: 'Cash Refund' },
  { value: 'credit_note', label: 'Credit Note (adjust balance)' },
];

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.sales)) return body.sales;
  if (Array.isArray(body?.returns)) return body.returns;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function extractData(res, fallback = null) {
  const body = res?.data;
  if (Array.isArray(body) && body.length > 0) return body[0];
  if (body?.data != null) return Array.isArray(body.data) ? body.data[0] : body.data;
  if (body?.return) return body.return;
  if (body?.invoice) return body.invoice;
  if (body?.sale) return body.sale;
  return body ?? fallback;
}

function getInvoiceItems(invoice) {
  if (!invoice) return [];
  return invoice.items || invoice.lineItems || invoice.products || [];
}

function getItemUnitPrice(item) {
  if (!item) return 0;
  if (item.unitPriceCharged != null && !isNaN(Number(item.unitPriceCharged)) && Number(item.unitPriceCharged) > 0) {
    return Number(item.unitPriceCharged);
  }
  if (item.unitPrice != null && !isNaN(Number(item.unitPrice)) && Number(item.unitPrice) > 0) {
    return Number(item.unitPrice);
  }
  if (item.salePrice != null && !isNaN(Number(item.salePrice)) && Number(item.salePrice) > 0) {
    return Number(item.salePrice);
  }
  if (item.price != null && !isNaN(Number(item.price)) && Number(item.price) > 0) {
    return Number(item.price);
  }
  if (item.rate != null && !isNaN(Number(item.rate)) && Number(item.rate) > 0) {
    return Number(item.rate);
  }
  if (item.lineTotal && item.quantity) {
    return Number(item.lineTotal) / Number(item.quantity);
  }
  return 0;
}

function getMaxReturnQty(item) {
  if (!item) return 0;
  const sold = Number(item.quantity ?? item.qty ?? 0);
  const alreadyReturned = Number(item.returnedQty ?? item.alreadyReturned ?? 0);
  return Math.max(0, sold - alreadyReturned);
}

export default function Returns() {
  const toast = useToast();

  const [returns, setReturns] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loadingReturns, setLoadingReturns] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoice, setInvoice] = useState(null);

  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState('');
  const [refundMode, setRefundMode] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  const [slipOpen, setSlipOpen] = useState(false);
  const [completedReturn, setCompletedReturn] = useState(null);

  const fetchData = useCallback(async () => {
    setLoadingReturns(true);
    try {
      const [retRes, salesRes] = await Promise.all([
        returnsAPI.getAll(),
        salesAPI.getAll(),
      ]);
      setReturns(extractList(retRes));
      setRecentSales(extractList(salesRes));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load return data'));
    } finally {
      setLoadingReturns(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Auto Search on Typing / Dialing invoice # or phone #
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await returnsAPI.searchInvoice(q);
        const found = extractData(res);
        if (found && (found._id || found.id || found.invoiceNumber)) {
          setInvoice(found);
          setSelectedItems({});
        }
      } catch {
        // silent fail on live search
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectDirectInvoice = (saleObj) => {
    setInvoice(saleObj);
    setSearchQuery(saleObj.invoiceNumber || saleObj.invoiceNo || '');
    setSelectedItems({});
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      toast.error('Enter or dial an invoice number or customer phone');
      return;
    }

    setSearching(true);
    setInvoice(null);
    setSelectedItems({});
    try {
      const res = await returnsAPI.searchInvoice(q);
      const found = extractData(res);
      if (!found || (!found._id && !found.id && !found.invoiceNumber)) {
        toast.error('No matching invoice found');
        return;
      }
      setInvoice(found);
      toast.success('Invoice found');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Invoice search failed'));
    } finally {
      setSearching(false);
    }
  };

  const invoiceItems = useMemo(() => getInvoiceItems(invoice), [invoice]);

  const toggleItem = (itemKey) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[itemKey]) {
        delete next[itemKey];
      } else {
        const item = invoiceItems.find(
          (it, idx) => String(it._id || it.productId || idx) === String(itemKey)
        );
        const maxQty = getMaxReturnQty(item);
        next[itemKey] = { quantity: maxQty > 0 ? maxQty : 1 };
      }
      return next;
    });
  };

  const updateItemQty = (itemKey, qty) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemKey]: { ...prev[itemKey], quantity: qty },
    }));
  };

  const returnTotal = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [key, sel]) => {
      const item = invoiceItems.find(
        (it, idx) => String(it._id || it.productId || idx) === String(key)
      );
      if (!item) return sum;
      const price = getItemUnitPrice(item);
      const qty = Number(sel.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [selectedItems, invoiceItems]);

  const selectedCount = Object.keys(selectedItems).length;

  const resetForm = () => {
    setInvoice(null);
    setSearchQuery('');
    setSelectedItems({});
    setReason('');
    setRefundMode('cash');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invoice) {
      toast.error('Search and select an invoice first');
      return;
    }
    if (selectedCount === 0) {
      toast.error('Select at least one item to return');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }

    const items = Object.entries(selectedItems).map(([key, sel]) => {
      const item = invoiceItems.find(
        (it, idx) => String(it._id || it.productId || idx) === String(key)
      );
      const qty = Number(sel.quantity) || 0;
      const price = getItemUnitPrice(item);
      return {
        productId: item?.productId || item?.product?._id || item?._id || item?.product,
        productName: item?.productName || item?.product?.name || item?.name || 'Item',
        quantity: qty,
        unitPriceCharged: price,
        salePrice: price,
        lineTotal: qty * price,
      };
    });

    const payload = {
      saleId: invoice._id || invoice.id || invoice.saleId,
      invoiceNumber: invoice.invoiceNumber || invoice.invoiceNo,
      customerId: invoice.customerId || invoice.customer?._id,
      items,
      reason: reason.trim(),
      refundMode,
      paymentMode: refundMode,
      totalAmount: returnTotal,
    };

    setSubmitting(true);
    try {
      const res = await returnsAPI.create(payload);
      const created = extractData(res, { ...payload, createdAt: new Date().toISOString() });
      setCompletedReturn({
        ...created,
        items,
        totalAmount: created.totalAmount ?? returnTotal,
        refundMode,
        invoice,
      });
      setSlipOpen(true);
      toast.success('Return processed — stock re-added automatically');
      resetForm();
      fetchReturns();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to process return'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSlip = () => window.print();

  const handleWhatsAppSlip = () => {
    const phone =
      completedReturn?.customer?.phone ||
      completedReturn?.invoice?.customer?.phone ||
      invoice?.customer?.phone;
    const returnNo =
      completedReturn?.returnNumber ||
      completedReturn?.returnNo ||
      completedReturn?._id ||
      'N/A';
    const text = [
      'Return Slip — Electric Shop',
      `Return #: ${returnNo}`,
      `Invoice: ${completedReturn?.invoiceNumber || completedReturn?.invoice?.invoiceNumber || 'N/A'}`,
      `Total Refund: ${formatCurrency(completedReturn?.totalAmount)}`,
      `Mode: ${REFUND_MODES.find((m) => m.value === completedReturn?.refundMode)?.label}`,
      'Stock has been re-added to inventory.',
    ].join('\n');
    openWhatsAppShare(phone, text);
  };

  const historyColumns = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (_, row) => formatDate(row.createdAt || row.date),
    },
    {
      key: 'returnNumber',
      header: 'Return #',
      render: (_, row) => row.returnNumber || row.returnNo || row._id?.slice(-6) || '—',
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      render: (_, row) =>
        row.invoiceNumber || row.invoiceNo || row.sale?.invoiceNumber || '—',
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (_, row) =>
        row.customerName || row.customer?.name || row.sale?.customerName || '—',
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      sortable: true,
      render: (_, row) => formatCurrency(row.totalAmount ?? row.refundAmount ?? 0),
    },
    {
      key: 'refundMode',
      header: 'Mode',
      render: (_, row) => {
        const mode = row.refundMode || row.paymentMode || 'cash';
        return (
          <Badge variant={mode === 'credit_note' ? 'brand' : 'outline'}>
            {mode === 'credit_note' ? 'Credit Note' : 'Cash Refund'}
          </Badge>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Returns"
        subtitle="Process item returns with automatic stock re-add and balance adjustment"
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-5">
        {/* Return form */}
        <Card className="lg:col-span-3 space-y-5">
          <h2 className="font-display text-lg font-semibold text-ink-900">New Return</h2>

          <div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                leftIcon={Search}
                placeholder="Dial or type invoice #, phone # or customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                hint="Live search — receipt loads automatically as you dial or type!"
              />
              <Button type="submit" loading={searching} variant="outline">
                Find
              </Button>
            </form>

            {/* Quick-Select Recent Real Receipts */}
            {recentSales.length > 0 && !invoice && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                  Quick Select Recent Receipts:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin p-1 rounded-xl bg-ink-50 border border-ink-100">
                  {recentSales.slice(0, 10).map((sale) => (
                    <button
                      key={sale._id}
                      type="button"
                      onClick={() => selectDirectInvoice(sale)}
                      className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-800 transition hover:border-brand-400 hover:bg-brand-50"
                    >
                      <span className="font-mono font-bold text-brand-700">{sale.invoiceNumber || 'INV'}</span>
                      <span>· {sale.customerName || 'Walk-in'} ({formatCurrency(sale.totalAmount)})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {searching && (
            <div className="flex items-center justify-center gap-2 py-8 text-brand-600 text-sm font-medium">
              <Spinner />
              Searching invoice...
            </div>
          )}

          {invoice && !searching && (
            <div className="space-y-4">
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                      Invoice Found
                    </p>
                    <p className="font-display text-lg font-bold text-ink-900">
                      {invoice.invoiceNumber || invoice.invoiceNo || invoice._id}
                    </p>
                    <p className="text-sm text-ink-500">
                      {invoice.customerName ||
                        invoice.customer?.name ||
                        'Walk-in Customer'}
                      {invoice.createdAt && ` · ${formatDate(invoice.createdAt)}`}
                    </p>
                  </div>
                  <Badge variant="brand">
                    Total: {formatCurrency(invoice.totalAmount ?? invoice.total ?? 0)}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Select items to return</p>
                {invoiceItems.length === 0 ? (
                  <p className="text-sm text-ink-400">No line items on this invoice</p>
                ) : (
                  <div className="space-y-2">
                    {invoiceItems.map((item, idx) => {
                      const key = String(item._id || item.productId || idx);
                      const maxQty = getMaxReturnQty(item);
                      const isSelected = !!selectedItems[key];
                      const name =
                        item.productName || item.product?.name || item.name || 'Item';
                      const price = getItemUnitPrice(item);

                      return (
                        <div
                          key={key}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border p-3 transition',
                            isSelected
                              ? 'border-brand-300 bg-brand-50/50'
                              : 'border-ink-100 bg-white'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => maxQty > 0 && toggleItem(key)}
                            disabled={maxQty <= 0}
                            className="shrink-0 text-brand-600 disabled:opacity-40"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5" />
                            ) : (
                              <Square className="h-5 w-5 text-ink-300" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink-900">{name}</p>
                            <p className="text-xs text-ink-400">
                              Sold: {formatNumber(item.quantity ?? item.qty, 2)} ·{' '}
                              {formatCurrency(price)} each
                              {maxQty <= 0 && (
                                <span className="ml-1 text-danger-500">· Fully returned</span>
                              )}
                            </p>
                          </div>
                          {isSelected && (
                            <Input
                              type="number"
                              min="0.01"
                              max={maxQty}
                              step="any"
                              value={selectedItems[key]?.quantity ?? maxQty}
                              onChange={(e) => updateItemQty(key, e.target.value)}
                              className="w-24"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Textarea
                label="Reason for return"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Defective, wrong item, customer request..."
                required
              />

              <Select
                label="Refund / Adjustment Mode"
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
                options={REFUND_MODES}
                hint={
                  refundMode === 'cash'
                    ? 'Cash will be refunded to the customer'
                    : 'Amount will be credited to customer account as a credit note'
                }
              />

              <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                <p className="text-xs leading-relaxed text-brand-800">
                  On submit, returned quantities are <strong>automatically re-added to stock</strong>.
                  {refundMode === 'cash'
                    ? ' A cash refund will be recorded.'
                    : ' Customer due balance will be reduced via credit note.'}
                </p>
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-ink-50/50 px-4 py-3">
                  <span className="text-sm text-ink-600">
                    {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                  <span className="font-display text-lg font-bold text-ink-900">
                    {formatCurrency(returnTotal)}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Clear
                </Button>
                <Button
                  leftIcon={Undo2}
                  loading={submitting}
                  onClick={handleSubmit}
                  disabled={selectedCount === 0}
                >
                  Process Return
                </Button>
              </div>
            </div>
          )}

          {!invoice && !searching && (
            <EmptyState
              icon={Package}
              title="Search for an invoice"
              description="Enter an invoice number or customer name to begin a return."
            />
          )}
        </Card>

        {/* Info panel */}
        <Card className="lg:col-span-2 h-fit space-y-4">
          <h3 className="font-display font-semibold text-ink-900">How returns work</h3>
          <ol className="space-y-3 text-sm text-ink-600">
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                1
              </span>
              Search the original sale invoice by number or customer
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                2
              </span>
              Select items and quantities to return with a reason
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                3
              </span>
              Choose cash refund or credit note for balance adjustment
            </li>
            <li className="flex gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                4
              </span>
              Stock is restored automatically; print or share the return slip
            </li>
          </ol>
        </Card>
      </div>

      <div className="mb-4">
        <h2 className="font-display text-lg font-semibold text-ink-900">Past Returns</h2>
        <p className="text-sm text-ink-500">History of processed returns</p>
      </div>

      <Table
        columns={historyColumns}
        data={returns}
        loading={loadingReturns}
        searchPlaceholder="Search returns..."
        searchKeys={['returnNumber', 'invoiceNumber', 'customerName']}
        emptyMessage="No returns processed yet"
      />

      {/* Return slip modal */}
      <Modal
        open={slipOpen}
        onClose={() => {
          setSlipOpen(false);
          setCompletedReturn(null);
        }}
        title="Return Slip"
        size="md"
        footer={
          <>
            <Button variant="outline" leftIcon={Printer} onClick={handlePrintSlip}>
              Print
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsAppSlip}>
              WhatsApp
            </Button>
            <Button onClick={() => { setSlipOpen(false); setCompletedReturn(null); }}>
              Done
            </Button>
          </>
        }
      >
        {completedReturn && (
          <div id="return-slip" className="space-y-4 print:p-4">
            <div className="text-center">
              <p className="font-display text-lg font-bold text-ink-900">Electric Shop</p>
              <p className="text-sm text-ink-500">Return Slip</p>
            </div>

            <div className="space-y-2 rounded-xl border border-ink-100 bg-ink-50/50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-500">Return #</span>
                <span className="font-medium">
                  {completedReturn.returnNumber ||
                    completedReturn.returnNo ||
                    completedReturn._id?.slice(-8)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Date</span>
                <span>{formatDateTime(completedReturn.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Invoice</span>
                <span>
                  {completedReturn.invoiceNumber ||
                    completedReturn.invoice?.invoiceNumber ||
                    '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Refund Mode</span>
                <Badge variant={completedReturn.refundMode === 'credit_note' ? 'brand' : 'outline'}>
                  {REFUND_MODES.find((m) => m.value === completedReturn.refundMode)?.label}
                </Badge>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Returned Items
              </p>
              <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
                {(completedReturn.items || []).map((item, idx) => (
                  <li key={idx} className="flex justify-between px-3 py-2 text-sm">
                    <span>
                      {item.productName || 'Item'} × {formatNumber(item.quantity, 2)}
                    </span>
                    <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between border-t border-ink-200 pt-3">
              <span className="font-medium text-ink-700">Total Refund</span>
              <span className="font-display text-xl font-bold text-ink-900">
                {formatCurrency(completedReturn.totalAmount)}
              </span>
            </div>

            <p className="text-center text-xs text-success-600">
              ✓ Stock re-added to inventory
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
