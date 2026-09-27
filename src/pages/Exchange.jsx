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
  Keyboard,
  Save,
  CheckCircle2,
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

  // Items Given List (جو مال دیا / بھیجا)
  const [givenItems, setGivenItems] = useState([
    { id: '1', productId: '', productName: '', quantity: '', rate: '', labour: '', extraCharge: '', katoti: '' },
  ]);

  // Items Received List (جو مال ملا / وصول کیا)
  const [receivedItems, setReceivedItems] = useState([
    { id: '1', productId: '', productName: '', quantity: '', rate: '', sentQuantity: '', actualReceivedQuantity: '', labour: '', extraCharge: '', katoti: '' },
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

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
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
      if (showLoader) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData(true);
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

  // Multi-item given helpers
  const addGivenItem = () => {
    setGivenItems((prev) => [
      ...prev,
      { id: String(Date.now()), productId: '', productName: '', quantity: '', rate: '', labour: '', extraCharge: '', katoti: '' },
    ]);
  };

  const updateGivenItem = (id, field, value) => {
    setGivenItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          if (value) {
            const product = products.find((p) => p._id === value);
            updated.productName = product?.name || '';
            if (product?.salePrice != null && (!updated.rate || updated.rate === '0')) {
              updated.rate = String(product.salePrice);
            }
          }
        }
        return updated;
      })
    );
  };

  const removeGivenItem = (id) => {
    setGivenItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  // Multi-item received helpers
  const addReceivedItem = () => {
    setReceivedItems((prev) => [
      ...prev,
      { id: String(Date.now()), productId: '', productName: '', quantity: '', rate: '', sentQuantity: '', actualReceivedQuantity: '', labour: '', extraCharge: '', katoti: '' },
    ]);
  };

  const updateReceivedItem = (id, field, value) => {
    setReceivedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          if (value) {
            const product = products.find((p) => p._id === value);
            updated.productName = product?.name || '';
            if (product?.salePrice != null && (!updated.rate || updated.rate === '0')) {
              updated.rate = String(product.salePrice);
            }
          }
        }
        return updated;
      })
    );
  };

  const removeReceivedItem = (id) => {
    setReceivedItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  // Calculations
  const givenBaseValue = useMemo(() => {
    return givenItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return sum + qty * rate;
    }, 0);
  }, [givenItems]);

  const givenValue = useMemo(() => {
    return givenItems.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const labour = Number(item.labour) || 0;
      const extra = Number(item.extraCharge) || 0;
      const katoti = Number(item.katoti) || 0;
      return sum + (qty * rate) + labour + extra - katoti;
    }, 0);
  }, [givenItems]);

  const receivedBaseValue = useMemo(() => {
    return receivedItems.reduce((sum, item) => {
      const effectiveQty =
        trackWeightShortage && item.actualReceivedQuantity !== ''
          ? Number(item.actualReceivedQuantity) || 0
          : Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      return sum + effectiveQty * rate;
    }, 0);
  }, [receivedItems, trackWeightShortage]);

  const receivedValue = useMemo(() => {
    return receivedItems.reduce((sum, item) => {
      const effectiveQty =
        trackWeightShortage && item.actualReceivedQuantity !== ''
          ? Number(item.actualReceivedQuantity) || 0
          : Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const labour = Number(item.labour) || 0;
      const extra = Number(item.extraCharge) || 0;
      const katoti = Number(item.katoti) || 0;
      return sum + (effectiveQty * rate) + labour + extra - katoti;
    }, 0);
  }, [receivedItems, trackWeightShortage]);

  // Total Extra Charges Sum
  const totalExtraCharges = useMemo(() => {
    const givenExtras = givenItems.reduce((sum, item) => sum + (Number(item.labour) || 0) + (Number(item.extraCharge) || 0) - (Number(item.katoti) || 0), 0);
    const receivedExtras = receivedItems.reduce((sum, item) => sum + (Number(item.labour) || 0) + (Number(item.extraCharge) || 0) - (Number(item.katoti) || 0), 0);
    return receivedExtras - givenExtras;
  }, [givenItems, receivedItems]);

  // Base exchange difference (Received - Given)
  const baseBalance = useMemo(() => receivedBaseValue - givenBaseValue, [receivedBaseValue, givenBaseValue]);

  // Final Net Balance
  const netBalance = useMemo(() => receivedValue - givenValue, [receivedValue, givenValue]);

  const resetForm = useCallback(() => {
    setPartyType('customer');
    setCompanyName('');
    setDeliveryMethod('self');
    setCustomerId('');
    setWalkInName('');
    setWalkInPhone('');
    setGivenItems([
      { id: String(Date.now()), productId: '', productName: '', quantity: '', rate: '', labour: '', extraCharge: '', katoti: '' },
    ]);
    setReceivedItems([
      { id: String(Date.now() + 1), productId: '', productName: '', quantity: '', rate: '', sentQuantity: '', actualReceivedQuantity: '', labour: '', extraCharge: '', katoti: '' },
    ]);
    setTrackWeightShortage(false);
    setSentQuantity('');
    setActualReceivedQuantity('');
    setVehicleNumber('');
    setDriverName('');
    setDriverPhone('');
    setNotes('');
  }, []);

  const validate = () => {
    const validGiven = givenItems.filter(
      (item) => (item.productId || item.productName.trim()) && Number(item.quantity) > 0
    );
    if (validGiven.length === 0) {
      toast.error('Kum se kum ek Item Given (جو مال دیا) aur uski quantity enter karein');
      return false;
    }

    const validReceived = receivedItems.filter(
      (item) => (item.productId || item.productName.trim()) && (Number(item.quantity) > 0 || Number(item.actualReceivedQuantity) > 0)
    );
    if (validReceived.length === 0) {
      toast.error('Kum se kum ek Item Received (جو مال ملا) aur uski quantity enter karein');
      return false;
    }

    if (partyType === 'customer' && !customerId) {
      if (!walkInName.trim()) {
        toast.error('Party / Person Name (نام) enter karna zaroori hai');
        return false;
      }
      if (!walkInPhone.trim()) {
        toast.error('Phone Number (فون نمبر) enter karna zaroori hai');
        return false;
      }
    }
    if (partyType === 'company' && !companyName.trim() && !customerId && !walkInName.trim()) {
      toast.error('Company ya Party ka naam enter karein');
      return false;
    }
    return true;
  };

  const handleConfirm = async () => {
    if (!validate()) return;

    const validGivenList = givenItems
      .filter((i) => (i.productId || i.productName.trim()) && Number(i.quantity) > 0)
      .map((i) => {
        const prod = products.find((p) => p._id === i.productId);
        const name = prod?.name || i.productName.trim();
        const qty = Number(i.quantity);
        const rate = Number(i.rate) || 0;
        const labour = Number(i.labour) || 0;
        const extraCharge = Number(i.extraCharge) || 0;
        const katoti = Number(i.katoti) || 0;
        const baseValue = qty * rate;
        const value = baseValue + labour + extraCharge - katoti;
        return {
          productId: i.productId || undefined,
          productName: name,
          quantity: qty,
          rate,
          labour,
          extraCharge,
          katoti,
          baseValue,
          value,
        };
      });

    const validReceivedList = receivedItems
      .filter((i) => (i.productId || i.productName.trim()) && (Number(i.quantity) > 0 || Number(i.actualReceivedQuantity) > 0))
      .map((i) => {
        const prod = products.find((p) => p._id === i.productId);
        const name = prod?.name || i.productName.trim();
        const qty = Number(i.actualReceivedQuantity !== '' ? i.actualReceivedQuantity : i.quantity);
        const rate = Number(i.rate) || 0;
        const labour = Number(i.labour) || 0;
        const extraCharge = Number(i.extraCharge) || 0;
        const katoti = Number(i.katoti) || 0;
        const baseValue = qty * rate;
        const value = baseValue + labour + extraCharge - katoti;
        return {
          productId: i.productId || undefined,
          productName: name,
          quantity: qty,
          rate,
          labour,
          extraCharge,
          katoti,
          baseValue,
          value,
        };
      });

    const primaryGiven = validGivenList[0] || { productName: 'Item Given', quantity: 0, rate: 0, value: 0 };
    const primaryReceived = validReceivedList[0] || { productName: 'Item Received', quantity: 0, rate: 0, value: 0 };

    const selectedCust = customers.find((c) => c._id === customerId);
    const finalPartyName =
      companyName.trim() || selectedCust?.name || walkInName.trim() || 'Direct Exchange Party';

    // Construct itemized extra charges list from given and received items
    const validExtraCharges = [];
    validGivenList.forEach((item) => {
      if (item.labour) validExtraCharges.push({ label: `Given (${item.productName}): Labour / Mazdoori`, amount: item.labour, type: 'add' });
      if (item.extraCharge) validExtraCharges.push({ label: `Given (${item.productName}): Kiraya / Freight`, amount: item.extraCharge, type: 'add' });
      if (item.katoti) validExtraCharges.push({ label: `Given (${item.productName}): Katoti / Cut`, amount: item.katoti, type: 'deduct' });
    });
    validReceivedList.forEach((item) => {
      if (item.labour) validExtraCharges.push({ label: `Received (${item.productName}): Labour / Mazdoori`, amount: item.labour, type: 'add' });
      if (item.extraCharge) validExtraCharges.push({ label: `Received (${item.productName}): Kiraya / Freight`, amount: item.extraCharge, type: 'add' });
      if (item.katoti) validExtraCharges.push({ label: `Received (${item.productName}): Katoti / Cut`, amount: item.katoti, type: 'deduct' });
    });

    setSubmitting(true);
    try {
      const payload = {
        partyType,
        companyName: finalPartyName,
        deliveryMethod,
        customerId: customerId || null,
        customerName: !customerId ? finalPartyName : undefined,
        customerPhone: !customerId ? walkInPhone.trim() : undefined,
        itemGiven: primaryGiven,
        itemReceived: primaryReceived,
        itemsGiven: validGivenList,
        itemsReceived: validReceivedList,
        netBalance,
        dispatchDetails: {
          vehicleNumber: vehicleNumber.trim(),
          driverName: driverName.trim(),
          driverPhone: driverPhone.trim(),
          sentQuantity: Number(sentQuantity || primaryReceived.quantity || 0),
          receivedQuantity: Number(actualReceivedQuantity || primaryReceived.quantity || 0),
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
          selectedCust?.name ||
          finalPartyName,
        customerPhone:
          exchange.customerPhone || selectedCust?.phone || walkInPhone.trim() || '',
        itemsGiven: validGivenList,
        itemsReceived: validReceivedList,
        itemGivenName: primaryGiven.productName,
        itemReceivedName: primaryReceived.productName,
        givenQuantity: primaryGiven.quantity,
        givenRate: primaryGiven.rate,
        givenValue,
        receivedQuantity: primaryReceived.quantity,
        receivedRate: primaryReceived.rate,
        receivedValue,
        baseBalance,
        totalExtraCharges,
        extraChargesList: validExtraCharges,
        netBalance,
        createdAt: new Date(),
      });
      setSuccessOpen(true);
      toast.success('Multi-item Exchange bill recorded successfully');
      if (!customerId && walkInName.trim()) fetchData(false);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record exchange'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    const selectedCust = customers.find((c) => c._id === customerId);
    const phone = selectedCust?.phone || completedExchange?.customerPhone;
    const balanceText =
      netBalance > 0
        ? `Payable: ${formatCurrency(netBalance)} (Aapne dene hain)`
        : netBalance < 0
          ? `Receivable: ${formatCurrency(Math.abs(netBalance))} (Aapne lene hain)`
          : 'Settled (Hisab Barabar)';

    const givenListStr = (completedExchange?.itemsGiven || givenItems)
      .filter((i) => i.productName)
      .map((i) => {
        const q = Number(i.quantity) || 0;
        const r = Number(i.rate) || 0;
        const l = Number(i.labour) || 0;
        const e = Number(i.extraCharge) || 0;
        const k = Number(i.katoti) || 0;
        const tot = (q * r) + l + e - k;
        let line = `• ${i.productName}: ${q} @ Rs.${r} = ${formatCurrency(q * r)}`;
        if (l || e || k) line += ` (Labour:+${l}, Freight:+${e}, Katoti:-${k} => Net: ${formatCurrency(tot)})`;
        return line;
      })
      .join('\n');

    const receivedListStr = (completedExchange?.itemsReceived || receivedItems)
      .filter((i) => i.productName)
      .map((i) => {
        const q = Number(i.quantity) || 0;
        const r = Number(i.rate) || 0;
        const l = Number(i.labour) || 0;
        const e = Number(i.extraCharge) || 0;
        const k = Number(i.katoti) || 0;
        const tot = (q * r) + l + e - k;
        let line = `• ${i.productName}: ${q} @ Rs.${r} = ${formatCurrency(q * r)}`;
        if (l || e || k) line += ` (Labour:+${l}, Freight:+${e}, Katoti:-${k} => Net: ${formatCurrency(tot)})`;
        return line;
      })
      .join('\n');

    const text = `*Item Exchange & Bill Slip*\n` +
      `--------------------------\n` +
      `*Items Given (جو مال دیا):*\n${givenListStr}\n` +
      `*Total Given:* ${formatCurrency(givenValue)}\n\n` +
      `*Items Received (جو مال ملا):*\n${receivedListStr}\n` +
      `*Total Received:* ${formatCurrency(receivedValue)}\n` +
      `--------------------------\n` +
      `*Base Exchange Diff:* ${formatCurrency(Math.abs(baseBalance))}\n` +
      (totalExtraCharges !== 0 ? `*Net Extra Adjustments:* ${totalExtraCharges >= 0 ? '+' : '-'}${formatCurrency(Math.abs(totalExtraCharges))}\n` : '') +
      `--------------------------\n` +
      `*Final Net Amount:* ${balanceText}\n` +
      `— Electric Shop`;
    openWhatsAppShare(phone, text);
  };

  const handleSaveKeep = useCallback(() => {
    setSuccessOpen(false);
    toast.info('Record saved! Form data retained.');
  }, [toast]);

  const handleSuccessClose = useCallback(() => {
    setSuccessOpen(false);
    setCompletedExchange(null);
    resetForm();
  }, []);

  // Keyboard Mouseless Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F4 or Ctrl+S: Confirm / Save
      if ((e.ctrlKey && (e.key === 's' || e.key === 'S')) || e.key === 'F4') {
        e.preventDefault();
        if (successOpen) {
          handleSaveKeep();
        } else if (!submitting) {
          handleConfirm();
        }
        return;
      }
      // Ctrl+P or 'P' key when receipt is open: Print
      if (successOpen && ((e.ctrlKey && (e.key === 'p' || e.key === 'P')) || e.key === 'p' || e.key === 'P')) {
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          e.preventDefault();
          window.print();
          return;
        }
      }
      // Esc: Close modal & keep form data intact
      if (e.key === 'Escape') {
        if (successOpen) {
          e.preventDefault();
          handleSaveKeep();
        }
        return;
      }
      // F1 or Ctrl+Enter: Close modal & Clear form for new item
      if (e.key === 'F1' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (successOpen) {
          handleSuccessClose();
        }
        return;
      }
      // F8: Reset Form
      if (e.key === 'F8') {
        e.preventDefault();
        resetForm();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [successOpen, submitting, handleConfirm, handleSaveKeep, handleSuccessClose, resetForm]);

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

      {/* Keyboard Shortcuts Toolbar (Mouseless Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-900 px-3 py-2 text-xs text-white shadow-sm">
        <div className="flex items-center gap-2 font-medium">
          <Keyboard className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400 font-bold">Mouseless Exchange Shortcuts:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded bg-brand-700 px-2 py-0.5 font-bold text-white shadow-sm">
            <kbd className="text-white">F4 / Ctrl+S</kbd> Save &amp; Record Bill
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-emerald-400">Ctrl+P / P</kbd> Print Receipt
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">Esc / S</kbd> Save (Keep Data)
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-sky-300">F1 / Ctrl+Enter</kbd> Clear &amp; New Item
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-danger-300">F8</kbd> Reset Form
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card 1: Items Given (جو مال دیا / بھیجا) */}
        <Card className="space-y-4 border-amber-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-sm">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink-900">Items Given (جو دیا / بھیجا)</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {givenItems.length} Item(s)
                  </span>
                </div>
                <p className="text-xs text-ink-500">Aapne ya party ne jo cheez/maal diya hai</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={Plus}
              onClick={addGivenItem}
              className="border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              + Add More Item Given (+ مزید مال دیں)
            </Button>
          </div>

          <div className="space-y-3 pr-1">
            {givenItems.map((item, index) => {
              const selectedProd = products.find((p) => p._id === item.productId);
              const qty = Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const labour = Number(item.labour) || 0;
              const extra = Number(item.extraCharge) || 0;
              const katoti = Number(item.katoti) || 0;
              const baseValue = qty * rate;
              const lineTotal = baseValue + labour + extra - katoti;

              return (
                <div
                  key={item.id}
                  className="relative space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                      Item #{index + 1}
                    </span>
                    {givenItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGivenItem(item.id)}
                        className="text-ink-400 hover:text-danger-600 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <ComboboxInput
                    label="Product / Item Name"
                    options={productOptions}
                    value={item.productId}
                    inputValue={item.productName}
                    onSelect={(id, name) => {
                      updateGivenItem(item.id, 'productId', id);
                      updateGivenItem(item.id, 'productName', name);
                    }}
                    onInputChange={(val) => updateGivenItem(item.id, 'productName', val)}
                    placeholder="Search product or type custom item name..."
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label={`Quantity / Weight${selectedProd ? ` (${selectedProd.primaryUnit})` : ''}`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 50"
                      value={item.quantity}
                      onChange={(e) => updateGivenItem(item.id, 'quantity', e.target.value)}
                    />
                    <Input
                      label="Rate per unit (Rs)"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 2400"
                      value={item.rate}
                      onChange={(e) => updateGivenItem(item.id, 'rate', e.target.value)}
                    />
                  </div>

                  {/* Optional per-item extra charges / adjustments */}
                  <div className="rounded-xl border border-amber-200/70 bg-amber-100/40 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-900">
                        Extra Charges / Adjustments (اضافی اخراجات)
                      </span>
                      <span className="text-[10px] text-amber-700 italic">Optional (اختیاری)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                          Mazdoori (+Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.labour || ''}
                          onChange={(e) => updateGivenItem(item.id, 'labour', e.target.value)}
                          className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                          Kiraya (+Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.extraCharge || ''}
                          onChange={(e) => updateGivenItem(item.id, 'extraCharge', e.target.value)}
                          className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-amber-900 mb-0.5">
                          Katoti (-Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.katoti || ''}
                          onChange={(e) => updateGivenItem(item.id, 'katoti', e.target.value)}
                          className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {lineTotal > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 pt-1 border-t border-amber-200/50">
                      <span className="text-[11px] font-normal text-amber-700">
                        Base: {formatCurrency(baseValue)}
                        {(labour > 0 || extra > 0 || katoti > 0) && (
                          <span> | Extras: +{labour} +{extra} -{katoti}</span>
                        )}
                      </span>
                      <span>Item Total: {formatCurrency(lineTotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  Total Given Value (دیے گئے مال کی کل رقم)
                </p>
                <p className="text-xs text-amber-600/80">
                  {givenItems.length} item(s) total
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-amber-800">
                {formatCurrency(givenValue)}
              </p>
            </div>
          </div>
        </Card>

        {/* Card 2: Items Received (جو ملا / وصول کیا) */}
        <Card className="space-y-4 border-brand-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 shadow-sm">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold text-ink-900">Items Received (جو ملا / وصول کیا)</h2>
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                    {receivedItems.length} Item(s)
                  </span>
                </div>
                <p className="text-xs text-ink-500">Badlay me jo cheez/maal wapas mila hai</p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={Plus}
              onClick={addReceivedItem}
              className="border-brand-300 text-brand-800 hover:bg-brand-50"
            >
              + Add More Item Received (+ مزید مال وصول کریں)
            </Button>
          </div>

          <div className="space-y-3 pr-1">
            {receivedItems.map((item, index) => {
              const selectedProd = products.find((p) => p._id === item.productId);
              const effectiveQty =
                trackWeightShortage && item.actualReceivedQuantity !== ''
                  ? Number(item.actualReceivedQuantity) || 0
                  : Number(item.quantity) || 0;
              const rate = Number(item.rate) || 0;
              const labour = Number(item.labour) || 0;
              const extra = Number(item.extraCharge) || 0;
              const katoti = Number(item.katoti) || 0;
              const baseValue = effectiveQty * rate;
              const lineTotal = baseValue + labour + extra - katoti;

              return (
                <div
                  key={item.id}
                  className="relative space-y-3 rounded-xl border border-brand-200/80 bg-brand-50/30 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-900 bg-brand-100 px-2 py-0.5 rounded-md">
                      Item #{index + 1}
                    </span>
                    {receivedItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeReceivedItem(item.id)}
                        className="text-ink-400 hover:text-danger-600 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <ComboboxInput
                    label="Product / Item Name"
                    options={productOptions}
                    value={item.productId}
                    inputValue={item.productName}
                    onSelect={(id, name) => {
                      updateReceivedItem(item.id, 'productId', id);
                      updateReceivedItem(item.id, 'productName', name);
                    }}
                    onInputChange={(val) => updateReceivedItem(item.id, 'productName', val)}
                    placeholder="Search product or type custom item name..."
                  />

                  {!trackWeightShortage ? (
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        label={`Quantity / Weight${selectedProd ? ` (${selectedProd.primaryUnit})` : ''}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="e.g. 40"
                        value={item.quantity}
                        onChange={(e) => updateReceivedItem(item.id, 'quantity', e.target.value)}
                      />
                      <Input
                        label="Rate per unit (Rs)"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 3000"
                        value={item.rate}
                        onChange={(e) => updateReceivedItem(item.id, 'rate', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <Input
                        label="Sent Qty"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={item.sentQuantity || item.quantity}
                        onChange={(e) => {
                          updateReceivedItem(item.id, 'sentQuantity', e.target.value);
                          updateReceivedItem(item.id, 'quantity', e.target.value);
                        }}
                      />
                      <Input
                        label="Received Qty"
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={item.actualReceivedQuantity}
                        onChange={(e) => updateReceivedItem(item.id, 'actualReceivedQuantity', e.target.value)}
                      />
                      <Input
                        label="Rate (Rs)"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={item.rate}
                        onChange={(e) => updateReceivedItem(item.id, 'rate', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Optional per-item extra charges / adjustments */}
                  <div className="rounded-xl border border-brand-200/70 bg-brand-100/40 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-brand-900">
                        Extra Charges / Adjustments (اضافی اخراجات)
                      </span>
                      <span className="text-[10px] text-brand-700 italic">Optional (اختیاری)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-900 mb-0.5">
                          Mazdoori (+Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.labour || ''}
                          onChange={(e) => updateReceivedItem(item.id, 'labour', e.target.value)}
                          className="h-8 w-full rounded-lg border border-brand-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-900 mb-0.5">
                          Kiraya (+Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.extraCharge || ''}
                          onChange={(e) => updateReceivedItem(item.id, 'extraCharge', e.target.value)}
                          className="h-8 w-full rounded-lg border border-brand-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-brand-900 mb-0.5">
                          Katoti (-Rs)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          value={item.katoti || ''}
                          onChange={(e) => updateReceivedItem(item.id, 'katoti', e.target.value)}
                          className="h-8 w-full rounded-lg border border-brand-300 bg-white px-2 text-xs text-ink-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  {lineTotal > 0 && (
                    <div className="flex items-center justify-between text-xs font-bold text-brand-900 pt-1 border-t border-brand-200/50">
                      <span className="text-[11px] font-normal text-brand-700">
                        Base: {formatCurrency(baseValue)}
                        {(labour > 0 || extra > 0 || katoti > 0) && (
                          <span> | Extras: +{labour} +{extra} -{katoti}</span>
                        )}
                      </span>
                      <span>Item Total: {formatCurrency(lineTotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                  Total Received Value (وصول مال کی کل رقم)
                </p>
                <p className="text-xs text-brand-600/80">
                  {receivedItems.length} item(s) total
                </p>
              </div>
              <p className="font-display text-2xl font-bold text-brand-800">
                {formatCurrency(receivedValue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

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
                Or Enter Custom Party / Walk-in Details: <span className="text-danger-600 font-bold">* Required</span>
              </p>
              <Input
                label="Party / Person Name *"
                placeholder="e.g. Bilal Traders / Usman (Required)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                required
              />
              <Input
                label="Phone Number *"
                placeholder="03XX-XXXXXXX (Required)"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                required
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
                {givenItems.map((i) => i.productName).filter(Boolean).join(', ') || 'Items'} ({givenItems.length} item(s))
              </p>
            </div>

            {/* Total Received */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-3">
              <p className="text-xs font-medium text-brand-700">Total Received (جو ملا)</p>
              <p className="font-display text-lg font-bold text-brand-900">
                {formatCurrency(receivedValue)}
              </p>
              <p className="truncate text-[11px] text-brand-700/80">
                {receivedItems.map((i) => i.productName).filter(Boolean).join(', ') || 'Items'} ({receivedItems.length} item(s))
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
                Net Item Adjustments
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
              Reset Form [F8]
            </Button>
            <Button
              size="lg"
              loading={submitting}
              onClick={handleConfirm}
              className="px-8 font-bold"
              leftIcon={Save}
            >
              Save &amp; Record Bill [F4 / Ctrl+S]
            </Button>
          </div>
        </Card>
      </div>

      {/* Completion Modal with Full Printable Receipt */}
      <Modal
        open={successOpen}
        onClose={handleSaveKeep}
        title="Exchange Bill & Receipt Slip"
        footer={
          <div className="no-print flex flex-wrap justify-end gap-2">
            <Button variant="soft" leftIcon={Save} onClick={handleSaveKeep}>
              Save &amp; Keep Form [Esc / Ctrl+S]
            </Button>
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print Slip [Ctrl+P]
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsApp}>
              Share WhatsApp
            </Button>
            <Button variant="danger" leftIcon={X} onClick={handleSuccessClose}>
              Close &amp; New Entry [F1]
            </Button>
          </div>
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
              {/* Items Given List */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-amber-800 border-b border-amber-200 pb-1 mb-1">
                  <span>ITEMS GIVEN (جو مال دیا/بھیجا)</span>
                  <span>OUTGOING ({completedExchange?.itemsGiven?.length || givenItems.length})</span>
                </div>
                <div className="space-y-1 pt-1 divide-y divide-amber-200/50">
                  {(completedExchange?.itemsGiven || givenItems.filter((i) => i.productName.trim())).map((item, idx) => {
                    const q = Number(item.quantity) || 0;
                    const r = Number(item.rate) || 0;
                    return (
                      <div key={idx} className="flex justify-between text-xs pt-1">
                        <div>
                          <p className="font-semibold text-ink-900">{item.productName || 'Item'}</p>
                          <p className="text-[10px] text-ink-500">{q} × Rs.{r}</p>
                        </div>
                        <span className="font-bold text-amber-900">{formatCurrency(q * r)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Items Received List */}
              <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3">
                <div className="flex items-center justify-between text-xs font-bold text-brand-800 border-b border-brand-200 pb-1 mb-1">
                  <span>ITEMS RECEIVED (جو مال ملا/وصول کیا)</span>
                  <span>INCOMING ({completedExchange?.itemsReceived?.length || receivedItems.length})</span>
                </div>
                <div className="space-y-1 pt-1 divide-y divide-brand-200/50">
                  {(completedExchange?.itemsReceived || receivedItems.filter((i) => i.productName.trim())).map((item, idx) => {
                    const q = Number(item.quantity) || 0;
                    const r = Number(item.rate) || 0;
                    return (
                      <div key={idx} className="flex justify-between text-xs pt-1">
                        <div>
                          <p className="font-semibold text-ink-900">{item.productName || 'Item'}</p>
                          <p className="text-[10px] text-ink-500">{q} × Rs.{r}</p>
                        </div>
                        <span className="font-bold text-brand-900">{formatCurrency(q * r)}</span>
                      </div>
                    );
                  })}
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
