import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeftRight,
  ArrowDown,
  ArrowUp,
  Printer,
  MessageCircle,
  ChevronDown,
  X,
  Truck,
  Building2,
  User,
  Package,
  PackageCheck,
  FileText,
  AlertTriangle,
  Coins,
  Plus,
  Trash2,
  Calculator,
  Receipt,
} from 'lucide-react';
import { exchangeAPI, productsAPI, customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatNumber,
  formatDateTime,
  getErrorMessage,
  openWhatsAppShare,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Dropdown from '../components/ui/Dropdown';
import { Input, Textarea } from '../components/ui/Input';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.customers)) return body.customers;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function extractData(res, fallback = null) {
  const body = res?.data;
  if (body?.data != null) return body.data;
  if (body?.exchange) return body.exchange;
  return body ?? fallback;
}

/**
 * ComboboxInput — Dropdown list + custom free-text typing.
 */
function ComboboxInput({
  options = [],
  value,
  inputValue,
  onSelect,
  onInputChange,
  placeholder = 'Select from list or type custom name...',
  label,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes((inputValue || '').toLowerCase())
  );

  const handleInput = (e) => {
    onInputChange(e.target.value);
    onSelect('', e.target.value);
    setOpen(true);
  };

  const handleSelect = (opt) => {
    onSelect(opt.value, opt.product?.name || opt.label);
    onInputChange(opt.product?.name || opt.label);
    setOpen(false);
  };

  const handleClear = () => {
    onSelect('', '');
    onInputChange('');
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={ref}>
      {label && <label className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>}
      <div className="relative">
        <input
          type="text"
          value={inputValue || ''}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 pr-16 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 text-ink-400 hover:text-ink-700"
              title="Clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded p-0.5 text-ink-400 hover:text-ink-700"
            title="Toggle list"
          >
            <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-60 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl shadow-ink-900/10">
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
            {inputValue && !options.find((o) => o.label.toLowerCase() === inputValue.toLowerCase()) && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelect('', inputValue);
                    onInputChange(inputValue);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 border-b border-ink-100 px-3 py-2 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    +
                  </span>
                  Use &ldquo;{inputValue}&rdquo; as custom item
                </button>
              </li>
            )}
            {filtered.length === 0 && !inputValue ? (
              <li className="px-3 py-2 text-sm text-ink-400">Type item name or choose from products below</li>
            ) : filtered.length === 0 && inputValue ? null : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-brand-50',
                      value === opt.value && 'bg-brand-50 font-medium text-brand-700'
                    )}
                  >
                    <span>{opt.label}</span>
                    {opt.category && (
                      <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                        {opt.category}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Exchange() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Party & Delivery Options
  const [partyType, setPartyType] = useState('customer'); // 'customer' | 'company'
  const [companyName, setCompanyName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('self'); // 'self' | 'dispatch'

  const [customerId, setCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  // Item Given (جو مال دیا / بھیجا)
  const [givenProductId, setGivenProductId] = useState('');
  const [givenProductName, setGivenProductName] = useState('');
  const [givenQty, setGivenQty] = useState('');
  const [givenRate, setGivenRate] = useState('');

  // Item Received (جو مال ملا / وصول کیا)
  const [receivedProductId, setReceivedProductId] = useState('');
  const [receivedProductName, setReceivedProductName] = useState('');
  const [receivedQty, setReceivedQty] = useState('');
  const [receivedRate, setReceivedRate] = useState('');

  // Extra Charges / Custom Prices (خالی باکسز - اپنی مرضی سے ایکسٹرا پرائس یا کٹوتی شامل کرنے کے لیے)
  const [extraCharges, setExtraCharges] = useState([
    { id: '1', label: 'Labour / Mazdoori (مزدوری)', amount: '', type: 'add' },
    { id: '2', label: 'Freight / Gari Kiraya (کرایہ)', amount: '', type: 'add' },
  ]);

  // Dispatch / Weight Loss Tracking (Optional when dealing with dispatch/mills)
  const [trackWeightShortage, setTrackWeightShortage] = useState(false);
  const [sentQuantity, setSentQuantity] = useState('');
  const [actualReceivedQuantity, setActualReceivedQuantity] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedExchange, setCompletedExchange] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, customersRes] = await Promise.all([
        productsAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setProducts(extractList(productsRes));
      setCustomers(extractList(customersRes));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products and customers data'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Product options available for both Given and Received
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p._id,
        label: `${p.name} (${p.primaryUnit || 'units'})`,
        category: p.category || '',
        product: p,
      })),
    [products]
  );

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Walk-in / Custom Party' },
      ...customers.map((c) => ({
        value: c._id,
        label: c.name + (c.phone ? ` · ${c.phone}` : ''),
      })),
    ],
    [customers]
  );

  const selectedGivenProduct = useMemo(
    () => products.find((p) => p._id === givenProductId),
    [products, givenProductId]
  );

  const selectedReceivedProduct = useMemo(
    () => products.find((p) => p._id === receivedProductId),
    [products, receivedProductId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId) || null,
    [customers, customerId]
  );

  // Extra charges helpers
  const addExtraCharge = () => {
    setExtraCharges((prev) => [
      ...prev,
      { id: String(Date.now()), label: '', amount: '', type: 'add' },
    ]);
  };

  const updateExtraCharge = (id, field, value) => {
    setExtraCharges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeExtraCharge = (id) => {
    setExtraCharges((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const givenValue = useMemo(() => {
    const qty = Number(givenQty) || 0;
    const rate = Number(givenRate) || 0;
    return qty * rate;
  }, [givenQty, givenRate]);

  const receivedValue = useMemo(() => {
    const effectiveQty =
      trackWeightShortage && actualReceivedQuantity !== ''
        ? Number(actualReceivedQuantity) || 0
        : Number(receivedQty) || 0;
    const rate = Number(receivedRate) || 0;
    return effectiveQty * rate;
  }, [receivedQty, actualReceivedQuantity, trackWeightShortage, receivedRate]);

  // Total Extra Charges Sum (+ / -)
  const totalExtraCharges = useMemo(() => {
    return extraCharges.reduce((sum, item) => {
      const val = Number(item.amount) || 0;
      if (val === 0) return sum;
      return item.type === 'deduct' ? sum - val : sum + val;
    }, 0);
  }, [extraCharges]);

  // Base exchange difference (Received - Given)
  const baseBalance = useMemo(() => receivedValue - givenValue, [receivedValue, givenValue]);

  // Final Net Balance including extra charges/deductions
  const netBalance = useMemo(() => baseBalance + totalExtraCharges, [baseBalance, totalExtraCharges]);

  const handleGivenProductChange = (id, name) => {
    setGivenProductId(id);
    if (id) {
      const product = products.find((p) => p._id === id);
      setGivenProductName(product?.name || name || '');
      if (product?.salePrice != null && (!givenRate || givenRate === '0')) {
        setGivenRate(String(product.salePrice));
      }
    } else {
      setGivenProductName(name || '');
    }
  };

  const handleReceivedProductChange = (id, name) => {
    setReceivedProductId(id);
    if (id) {
      const product = products.find((p) => p._id === id);
      setReceivedProductName(product?.name || name || '');
      if (product?.salePrice != null && (!receivedRate || receivedRate === '0')) {
        setReceivedRate(String(product.salePrice));
      }
    } else {
      setReceivedProductName(name || '');
    }
  };

  const resetForm = () => {
    setPartyType('customer');
    setCompanyName('');
    setDeliveryMethod('self');
    setCustomerId('');
    setWalkInName('');
    setWalkInPhone('');
    setGivenProductId('');
    setGivenProductName('');
    setGivenQty('');
    setGivenRate('');
    setReceivedProductId('');
    setReceivedProductName('');
    setReceivedQty('');
    setReceivedRate('');
    setExtraCharges([
      { id: '1', label: 'Labour / Mazdoori (مزدوری)', amount: '', type: 'add' },
      { id: '2', label: 'Freight / Gari Kiraya (کرایہ)', amount: '', type: 'add' },
    ]);
    setTrackWeightShortage(false);
    setSentQuantity('');
    setActualReceivedQuantity('');
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setNotes('');
  };

  const validate = () => {
    if (!givenProductId && !givenProductName.trim()) {
      toast.error('Item Given (جو مال دیا) ka naam select ya type karein');
      return false;
    }
    if (!receivedProductId && !receivedProductName.trim()) {
      toast.error('Item Received (جو مال ملا) ka naam select ya type karein');
      return false;
    }
    if (!(Number(givenQty) > 0)) {
      toast.error('Item Given ki quantity enter karein');
      return false;
    }
    if (!(Number(receivedQty) > 0) && !(Number(actualReceivedQuantity) > 0)) {
      toast.error('Item Received ki quantity enter karein');
      return false;
    }
    if (!(Number(givenRate) >= 0) || !(Number(receivedRate) >= 0)) {
      toast.error('Dono items ke rates enter karein');
      return false;
    }
    if (partyType === 'customer' && netBalance !== 0 && !customerId && !walkInName.trim()) {
      toast.error('Party / Customer ka naam select ya enter karein');
      return false;
    }
    if (partyType === 'company' && !companyName.trim() && !customerId && !walkInName.trim()) {
      toast.error('Company ya Party ka naam enter karein');
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validate()) return;

    const finalGivenName = selectedGivenProduct?.name || givenProductName.trim();
    const finalReceivedName = selectedReceivedProduct?.name || receivedProductName.trim();
    const finalPartyName =
      companyName.trim() || selectedCustomer?.name || walkInName.trim() || 'Direct Exchange Party';

    // Filter valid non-empty extra charges
    const validExtraCharges = extraCharges
      .filter((e) => Number(e.amount) > 0 && e.label.trim())
      .map((e) => ({
        label: e.label.trim(),
        amount: Number(e.amount),
        type: e.type,
      }));

    setSubmitting(true);
    try {
      const payload = {
        partyType,
        companyName: finalPartyName,
        deliveryMethod,
        customerId: customerId || null,
        customerName: !customerId ? finalPartyName : undefined,
        customerPhone: !customerId ? walkInPhone.trim() : undefined,
        itemGiven: {
          productId: givenProductId || undefined,
          productName: finalGivenName,
          quantity: Number(givenQty),
          rate: Number(givenRate),
          value: givenValue,
        },
        itemReceived: {
          productId: receivedProductId || undefined,
          productName: finalReceivedName,
          quantity: Number(actualReceivedQuantity !== '' ? actualReceivedQuantity : receivedQty),
          rate: Number(receivedRate),
          value: receivedValue,
        },
        // Backward compatibility keys
        scrapGiven: {
          productId: givenProductId || undefined,
          productName: finalGivenName,
          quantity: Number(givenQty),
          rate: Number(givenRate),
          value: givenValue,
        },
        copperReceived: {
          productId: receivedProductId || undefined,
          productName: finalReceivedName,
          quantity: Number(actualReceivedQuantity !== '' ? actualReceivedQuantity : receivedQty),
          rate: Number(receivedRate),
          value: receivedValue,
        },
        scrapProductId: givenProductId || undefined,
        copperProductId: receivedProductId || undefined,
        scrapProductName: finalGivenName,
        copperProductName: finalReceivedName,
        scrapQuantity: Number(givenQty),
        scrapRate: Number(givenRate),
        copperQuantity: Number(actualReceivedQuantity !== '' ? actualReceivedQuantity : receivedQty),
        copperRate: Number(receivedRate),
        scrapValue: givenValue,
        copperValue: receivedValue,
        netBalance,
        dispatchDetails: {
          vehicleNumber: vehicleNumber.trim(),
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim(),
          sentQuantity: Number(sentQuantity || receivedQty || 0),
          receivedQuantity: Number(actualReceivedQuantity || sentQuantity || receivedQty || 0),
          notes: notes.trim(),
          customFields: validExtraCharges.map((c) => ({
            label: `${c.type === 'deduct' ? '(-)' : '(+)'} ${c.label}`,
            value: `Rs. ${c.amount}`,
          })),
        },
      };

      const res = await exchangeAPI.create(payload);
      const exchange = extractData(res, payload);
      setCompletedExchange({
        ...exchange,
        receiptNumber: exchange.receiptNumber || `EX-${Date.now().toString().slice(-6)}`,
        customerName:
          exchange.customerName ||
          selectedCustomer?.name ||
          finalPartyName,
        customerPhone:
          exchange.customerPhone || selectedCustomer?.phone || walkInPhone.trim() || '',
        itemGivenName: finalGivenName,
        itemReceivedName: finalReceivedName,
        givenQuantity: Number(givenQty),
        givenRate: Number(givenRate),
        givenValue,
        receivedQuantity: Number(actualReceivedQuantity !== '' ? actualReceivedQuantity : receivedQty),
        receivedRate: Number(receivedRate),
        receivedValue,
        baseBalance,
        totalExtraCharges,
        extraChargesList: validExtraCharges,
        netBalance,
        createdAt: new Date(),
      });
      setSuccessOpen(true);
      toast.success('Exchange & extra charges bill recorded successfully');
      if (!customerId && walkInName.trim()) fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record exchange'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const phone = selectedCustomer?.phone || completedExchange?.customerPhone;
    const balanceText =
      netBalance > 0
        ? `Payable: ${formatCurrency(netBalance)} (Aapne dene hain)`
        : netBalance < 0
          ? `Receivable: ${formatCurrency(Math.abs(netBalance))} (Aapne lene hain)`
          : 'Settled (Hisab Barabar)';

    let extraText = '';
    const validExtras = extraCharges.filter((e) => Number(e.amount) > 0 && e.label.trim());
    if (validExtras.length > 0) {
      extraText = '\n*Extra Charges / Adjustments:*\n' +
        validExtras.map((e) => `• ${e.label}: ${e.type === 'deduct' ? '-' : '+'}${formatCurrency(Number(e.amount))}`).join('\n') +
        `\n*Total Extras:* ${totalExtraCharges >= 0 ? '+' : '-'}${formatCurrency(Math.abs(totalExtraCharges))}\n`;
    }

    const text = `*Item Exchange & Bill Slip*\n` +
      `--------------------------\n` +
      `*Item Given:* ${givenProductName || 'Item'} (${givenQty} @ Rs.${givenRate}) = ${formatCurrency(givenValue)}\n` +
      `*Item Received:* ${receivedProductName || 'Item'} (${receivedQty} @ Rs.${receivedRate}) = ${formatCurrency(receivedValue)}\n` +
      `*Exchange Diff:* ${formatCurrency(Math.abs(baseBalance))}\n` +
      extraText +
      `--------------------------\n` +
      `*Final Net Amount:* ${balanceText}\n` +
      `— Electric Shop`;
    openWhatsAppShare(phone, text);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setCompletedExchange(null);
    resetForm();
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
        title="Item Exchange (مال کا تبادلہ)"
        subtitle="Kisi bhi item ko doosri item ke sath exchange karein, extra kharchay/katoti add karein aur print slip banayein"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Item Given (جو دیا / بھیجا) */}
        <Card className="space-y-4 border-amber-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-ink-100 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-sm">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-ink-900">Item Given (جو دیا / بھیجا)</h2>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Outgoing
                </span>
              </div>
              <p className="text-xs text-ink-500">Aapne ya party ne jo cheez/maal diya hai</p>
            </div>
          </div>

          <ComboboxInput
            label="Product / Item Name (Select karein ya naya naam likhein)"
            options={productOptions}
            value={givenProductId}
            inputValue={givenProductName}
            onSelect={handleGivenProductChange}
            onInputChange={setGivenProductName}
            placeholder="Search product or type custom item name..."
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Quantity / Weight${selectedGivenProduct ? ` (${selectedGivenProduct.primaryUnit})` : ''}`}
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 50"
              value={givenQty}
              onChange={(e) => setGivenQty(e.target.value)}
            />
            <Input
              label="Rate per unit (Rs)"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 2400"
              value={givenRate}
              onChange={(e) => setGivenRate(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Total Given Value (دیے گئے مال کی کل رقم)
                </p>
                <p className="text-xs text-amber-600/80">
                  {givenQty ? `${givenQty} × Rs. ${givenRate || 0}` : '0 Qty'}
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-amber-800">
                {formatCurrency(givenValue)}
              </p>
            </div>
          </div>
        </Card>

        {/* Card 2: Item Received (جو ملا / وصول کیا) */}
        <Card className="space-y-4 border-brand-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-ink-100 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 shadow-sm">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-ink-900">Item Received (جو ملا / وصول کیا)</h2>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                  Incoming
                </span>
              </div>
              <p className="text-xs text-ink-500">Badlay me jo cheez/maal wapas mila hai</p>
            </div>
          </div>

          <ComboboxInput
            label="Product / Item Name (Select karein ya naya naam likhein)"
            options={productOptions}
            value={receivedProductId}
            inputValue={receivedProductName}
            onSelect={handleReceivedProductChange}
            onInputChange={setReceivedProductName}
            placeholder="Search product or type custom item name..."
          />

          {!trackWeightShortage ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={`Quantity / Weight${selectedReceivedProduct ? ` (${selectedReceivedProduct.primaryUnit})` : ''}`}
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 40"
                value={receivedQty}
                onChange={(e) => {
                  setReceivedQty(e.target.value);
                  setSentQuantity(e.target.value);
                }}
              />
              <Input
                label="Rate per unit (Rs)"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 3000"
                value={receivedRate}
                onChange={(e) => setReceivedRate(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Sent Qty (Bheja)"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={sentQuantity}
                onChange={(e) => setSentQuantity(e.target.value)}
                hint="Loaded weight"
              />
              <Input
                label="Received Qty (Mila)"
                type="number"
                min="0"
                step="any"
                placeholder={sentQuantity || '0'}
                value={actualReceivedQuantity}
                onChange={(e) => setActualReceivedQuantity(e.target.value)}
                hint="Weighed weight"
              />
              <Input
                label="Rate (Rs)"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={receivedRate}
                onChange={(e) => setReceivedRate(e.target.value)}
              />
            </div>
          )}

          {/* Shortage tracking toggle */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setTrackWeightShortage(!trackWeightShortage)}
              className="text-xs font-medium text-brand-600 hover:text-brand-800 hover:underline"
            >
              {trackWeightShortage ? '← Single Quantity Mode' : '+ Add Sent vs Received Weight Tracking (Shortage)'}
            </button>
          </div>

          {/* Shortage alert if applicable */}
          {trackWeightShortage && (() => {
            const s = Number(sentQuantity || receivedQty) || 0;
            const r = Number(actualReceivedQuantity !== '' ? actualReceivedQuantity : s) || 0;
            const shortage = Math.max(0, s - r);
            const loss = shortage * (Number(receivedRate) || 0);
            if (shortage <= 0) return null;
            return (
              <div className="flex items-center justify-between rounded-xl border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-800">
                <span className="font-semibold">⚠️ Weight Loss / Shortage: -{formatNumber(shortage, 2)} {selectedReceivedProduct?.primaryUnit || 'units'}</span>
                <span className="font-bold text-danger-900">-{formatCurrency(loss)}</span>
              </div>
            );
          })()}

          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Total Received Value (وصول مال کی کل رقم)
                </p>
                <p className="text-xs text-brand-600/80">
                  {(actualReceivedQuantity || receivedQty)
                    ? `${actualReceivedQuantity || receivedQty} × Rs. ${receivedRate || 0}`
                    : '0 Qty'}
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-brand-800">
                {formatCurrency(receivedValue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Extra Charges / Custom Prices Box (خالی باکسز - کسٹمر کے لیے ایکسٹرا پرائسز/کٹوتی) */}
      <Card className="space-y-4 border-emerald-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-sm">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold text-ink-900">
                Extra Charges, Labour & Custom Prices (اضافی اخراجات / کٹوتی)
              </h2>
              <p className="text-xs text-ink-500">
                Aap apni marzi se Mazdoori, Kiraya, Katoti ya koi bhi extra price add kar sakte hain
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={Plus}
            onClick={addExtraCharge}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
          >
            Add More Extra Price Box (+ باکس شامل کریں)
          </Button>
        </div>

        {/* Dynamic List of Extra Boxes */}
        <div className="space-y-3">
          {extraCharges.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 bg-ink-50/50 p-3"
            >
              <div className="w-8 shrink-0 text-center font-bold text-xs text-ink-400">
                #{index + 1}
              </div>

              {/* Charge Description / Label */}
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="e.g. Mazdoori, Gari Kiraya, Katoti, Dabba charge..."
                  value={item.label}
                  onChange={(e) => updateExtraCharge(item.id, 'label', e.target.value)}
                />
              </div>

              {/* Type: Add (+) or Deduct (-) */}
              <div className="w-[140px] shrink-0">
                <select
                  value={item.type}
                  onChange={(e) => updateExtraCharge(item.id, 'type', e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-xs font-semibold text-ink-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="add">+ Add to Bill (جمع کریں)</option>
                  <option value="deduct">- Deduct / Katoti (منفی کریں)</option>
                </select>
              </div>

              {/* Amount (Rs) */}
              <div className="w-[150px] shrink-0">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Amount (Rs)"
                  value={item.amount}
                  onChange={(e) => updateExtraCharge(item.id, 'amount', e.target.value)}
                />
              </div>

              {/* Delete Box */}
              <button
                type="button"
                onClick={() => removeExtraCharge(item.id)}
                className="rounded-lg p-2 text-ink-400 hover:bg-danger-50 hover:text-danger-600 transition"
                title="Remove box"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Extra summary banner */}
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-2.5">
            <span className="text-xs font-semibold text-emerald-800">
              Total Extra Adjustments / Net Charges:
            </span>
            <span
              className={cn(
                'font-display text-base font-bold',
                totalExtraCharges > 0
                  ? 'text-emerald-800'
                  : totalExtraCharges < 0
                    ? 'text-danger-700'
                    : 'text-ink-700'
              )}
            >
              {totalExtraCharges > 0 ? '+' : ''}
              {formatCurrency(totalExtraCharges)}
            </span>
          </div>
        </div>
      </Card>

      {/* Transaction & Party Options */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink-900">Party & Transaction Settings</h2>
            <p className="text-xs text-ink-400">Select party type and delivery / dispatch preferences</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-ink-100 p-1">
              <button
                type="button"
                onClick={() => setPartyType('customer')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  partyType === 'customer'
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-800'
                )}
              >
                <User className="h-3.5 w-3.5" />
                Local Customer / Party
              </button>
              <button
                type="button"
                onClick={() => setPartyType('company')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  partyType === 'company'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-500 hover:text-ink-800'
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                Company / Factory Deal
              </button>
            </div>

            <div className="flex rounded-xl bg-ink-100 p-1">
              <button
                type="button"
                onClick={() => setDeliveryMethod('self')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  deliveryMethod === 'self'
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-800'
                )}
              >
                Self Handover / Shop Pickup
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeliveryMethod('dispatch');
                  setTrackWeightShortage(true);
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                  deliveryMethod === 'dispatch'
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-ink-500 hover:text-ink-800'
                )}
              >
                <Truck className="h-3.5 w-3.5" />
                Vehicle Dispatch
              </button>
            </div>
          </div>
        </div>

        {/* Dispatch details when Dispatch is enabled */}
        {deliveryMethod === 'dispatch' && (
          <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4">
            <div className="flex items-center gap-2 text-brand-800">
              <Truck className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">
                Vehicle Dispatch & Transport Details
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Destination / Factory Name"
                placeholder="e.g. Atlas Mills / Standard Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
              <Input
                label="Vehicle / Truck No."
                placeholder="e.g. LES-4921"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Driver Name"
                  placeholder="e.g. Tariq"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
                <Input
                  label="Driver Phone"
                  placeholder="03XX-XXXXXXX"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>
            </div>

            <Textarea
              label="Gate Pass / Bilti / Additional Notes"
              placeholder="e.g. Gate pass no., bilti details, weight slip notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}
      </Card>

      {/* Party Selection & Final Settlement Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer / Party Information */}
        <Card className="space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2 border-b border-ink-100 pb-2">
            <User className="h-4 w-4 text-ink-500" />
            <h3 className="font-semibold text-ink-900">Customer / Party Information</h3>
          </div>

          <Dropdown
            label="Select Saved Customer"
            searchable
            options={customerOptions}
            value={customerId}
            onChange={(val) => {
              setCustomerId(val);
              if (val) {
                setWalkInName('');
                setWalkInPhone('');
              }
            }}
            placeholder="Select customer..."
          />

          {!customerId && (
            <div className="space-y-3 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-3">
              <p className="text-xs font-semibold text-ink-700">
                Or Enter Custom Party / Walk-in Details:
              </p>
              <Input
                label="Party / Person Name"
                placeholder="e.g. Bilal Traders / Usman"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
              />
              <Input
                label="Phone Number"
                placeholder="03XX-XXXXXXX"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* Balance Breakdown & Actions */}
        <Card className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2 border-b border-ink-100 pb-2">
            <Coins className="h-4 w-4 text-brand-600" />
            <h3 className="font-semibold text-ink-900">Exchange Settlement & Grand Total (حساب کتاب)</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {/* Total Given */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-xs font-medium text-amber-700">Total Given (جو دیا)</p>
              <p className="font-display text-lg font-bold text-amber-900">
                {formatCurrency(givenValue)}
              </p>
              <p className="truncate text-[11px] text-amber-700/80">
                {givenProductName || 'Item'} ({givenQty || 0})
              </p>
            </div>

            {/* Total Received */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3">
              <p className="text-xs font-medium text-brand-700">Total Received (جو ملا)</p>
              <p className="font-display text-lg font-bold text-brand-900">
                {formatCurrency(receivedValue)}
              </p>
              <p className="truncate text-[11px] text-brand-700/80">
                {receivedProductName || 'Item'} ({actualReceivedQuantity || receivedQty || 0})
              </p>
            </div>

            {/* Extra Charges */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
              <p className="text-xs font-medium text-emerald-700">Extra Charges / Katoti</p>
              <p
                className={cn(
                  'font-display text-lg font-bold',
                  totalExtraCharges >= 0 ? 'text-emerald-900' : 'text-danger-700'
                )}
              >
                {totalExtraCharges > 0 ? '+' : ''}
                {formatCurrency(totalExtraCharges)}
              </p>
              <p className="truncate text-[11px] text-emerald-700/80">
                {extraCharges.filter((e) => Number(e.amount) > 0).length} Extra Items
              </p>
            </div>

            {/* Net Difference */}
            <div
              className={cn(
                'rounded-xl border p-3',
                netBalance > 0
                  ? 'border-danger-200 bg-danger-50/70'
                  : netBalance < 0
                    ? 'border-success-200 bg-success-50/70'
                    : 'border-ink-200 bg-ink-50/80'
              )}
            >
              <p className="text-xs font-medium text-ink-600">Grand Total Net</p>
              <div className="flex items-center gap-1.5">
                {netBalance > 0 && <ArrowUp className="h-4 w-4 text-danger-600" />}
                {netBalance < 0 && <ArrowDown className="h-4 w-4 text-success-600" />}
                <p
                  className={cn(
                    'font-display text-lg font-bold',
                    netBalance > 0
                      ? 'text-danger-700'
                      : netBalance < 0
                        ? 'text-success-700'
                        : 'text-ink-800'
                  )}
                >
                  {formatCurrency(Math.abs(netBalance))}
                </p>
              </div>
              <Badge
                variant={netBalance > 0 ? 'danger' : netBalance < 0 ? 'success' : 'default'}
                className="mt-1 text-[10px]"
                dot
              >
                {netBalance > 0
                  ? 'Payable (دینے ہیں)'
                  : netBalance < 0
                    ? 'Receivable (لینے ہیں)'
                    : 'Settled (برابر)'}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={submitting}
            >
              Reset Form
            </Button>
            <Button
              size="lg"
              loading={submitting}
              onClick={handleConfirm}
              className="px-8"
            >
              Record & Generate Bill Slip
            </Button>
          </div>
        </Card>
      </div>

      {/* Completion Modal with Full Printable Receipt */}
      <Modal
        open={successOpen}
        onClose={handleSuccessClose}
        title="Exchange Bill & Receipt Slip"
        footer={
          <>
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print Full Slip (پرنٹ رسید)
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsApp}>
              Share on WhatsApp
            </Button>
            <Button onClick={handleSuccessClose}>Create New Exchange</Button>
          </>
        }
      >
        <div className="space-y-4 py-2">
          {/* Printable Receipt Container */}
          <div
            id="print-receipt"
            className="print-receipt rounded-2xl border border-ink-200 bg-white p-4 shadow-sm text-ink-900"
          >
            {/* Receipt Header */}
            <div className="border-b border-dashed border-ink-300 pb-3 text-center">
              <h2 className="font-display text-xl font-bold tracking-tight text-ink-950">
                Electric Shop
              </h2>
              <div className="mt-1 inline-block rounded bg-brand-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-800">
                ITEM EXCHANGE & BILL SLIP
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Trading & Custom Billing Receipt
              </p>
            </div>

            {/* Meta details */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-b border-ink-100 pb-3">
              <div>
                <span className="text-ink-400">Slip No:</span>{' '}
                <span className="font-bold text-ink-800">
                  {completedExchange?.receiptNumber || 'EX-001'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-ink-400">Date:</span>{' '}
                <span className="font-medium text-ink-800">
                  {formatDateTime(completedExchange?.createdAt || new Date())}
                </span>
              </div>
              <div>
                <span className="text-ink-400">Party:</span>{' '}
                <span className="font-bold text-ink-900">
                  {completedExchange?.customerName || 'Direct Exchange Party'}
                </span>
              </div>
              {completedExchange?.customerPhone && (
                <div className="text-right">
                  <span className="text-ink-400">Phone:</span>{' '}
                  <span className="font-medium text-ink-800">
                    {completedExchange?.customerPhone}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="mt-3 space-y-3">
              {/* Item Given Row */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 border-b border-amber-200 pb-1 mb-1">
                  <span>ITEM GIVEN (جو مال دیا)</span>
                  <span>OUTGOING</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink-900">
                    {completedExchange?.itemGivenName || givenProductName}
                  </span>
                  <span className="font-bold text-amber-900">
                    {formatCurrency(completedExchange?.givenValue ?? givenValue)}
                  </span>
                </div>
                <div className="text-xs text-ink-500">
                  Quantity: {formatNumber(completedExchange?.givenQuantity ?? givenQty)} × Rate: Rs.{formatNumber(completedExchange?.givenRate ?? givenRate)}
                </div>
              </div>

              {/* Item Received Row */}
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-brand-800 border-b border-brand-200 pb-1 mb-1">
                  <span>ITEM RECEIVED (جو مال ملا)</span>
                  <span>INCOMING</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-ink-900">
                    {completedExchange?.itemReceivedName || receivedProductName}
                  </span>
                  <span className="font-bold text-brand-900">
                    {formatCurrency(completedExchange?.receivedValue ?? receivedValue)}
                  </span>
                </div>
                <div className="text-xs text-ink-500">
                  Quantity: {formatNumber(completedExchange?.receivedQuantity ?? receivedQty)} × Rate: Rs.{formatNumber(completedExchange?.receivedRate ?? receivedRate)}
                </div>
              </div>

              {/* Extra Charges Breakdown if any */}
              {completedExchange?.extraChargesList && completedExchange.extraChargesList.length > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs">
                  <p className="font-bold text-emerald-800 border-b border-emerald-200 pb-1 mb-1">
                    EXTRA CHARGES & ADJUSTMENTS (اضافی اخراجات / کٹوتی)
                  </p>
                  <div className="space-y-1 pt-1">
                    {completedExchange.extraChargesList.map((ch, idx) => (
                      <div key={idx} className="flex justify-between text-ink-700">
                        <span>{ch.label}</span>
                        <span className="font-semibold">
                          {ch.type === 'deduct' ? '-' : '+'}
                          {formatCurrency(ch.amount)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold border-t border-emerald-200 pt-1 text-emerald-900">
                      <span>Total Extra Adjustments</span>
                      <span>
                        {completedExchange.totalExtraCharges > 0 ? '+' : ''}
                        {formatCurrency(completedExchange.totalExtraCharges)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Settlement Calculation */}
            <div className="mt-4 border-t border-dashed border-ink-300 pt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Base Exchange Difference</span>
                <span className="font-medium">
                  {formatCurrency(Math.abs(completedExchange?.baseBalance ?? baseBalance))}
                </span>
              </div>
              {completedExchange?.totalExtraCharges !== 0 && (
                <div className="flex justify-between text-ink-600">
                  <span>Extra Net Adjustments</span>
                  <span className="font-medium">
                    {completedExchange?.totalExtraCharges > 0 ? '+' : ''}
                    {formatCurrency(completedExchange?.totalExtraCharges ?? totalExtraCharges)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-ink-200 pt-2 text-sm">
                <span className="font-bold text-ink-900">
                  FINAL NET BALANCE (کل بقایا رقم):
                </span>
                <span
                  className={cn(
                    'font-display text-lg font-bold',
                    netBalance > 0
                      ? 'text-danger-700'
                      : netBalance < 0
                        ? 'text-success-700'
                        : 'text-ink-900'
                  )}
                >
                  {formatCurrency(Math.abs(completedExchange?.netBalance ?? netBalance))}
                </span>
              </div>
              <div className="text-center pt-1">
                <Badge
                  variant={netBalance > 0 ? 'danger' : netBalance < 0 ? 'success' : 'default'}
                  className="text-xs px-3 py-1 font-semibold"
                >
                  {netBalance > 0
                    ? '🔴 Payable — Aapne party ko dene hain'
                    : netBalance < 0
                      ? '🟢 Receivable — Aapne party se lene hain'
                      : '⚪ Settled — Hisaab Barabar'}
                </Badge>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="mt-4 border-t border-ink-100 pt-2 text-center text-[11px] text-ink-400">
              <p>Thank you for your business · All amounts in Pakistani Rupees (PKR)</p>
              <p className="mt-0.5 text-[10px] font-medium text-brand-700">
                Electric Shop Trading POS System
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
