import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Trash2,
  LayoutGrid,
  List,
  Printer,
  MessageCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  Wallet,
  Users,
  UserPlus,
  ArrowRight,
  ShieldAlert,
  Coins,
  Keyboard,
  ArrowDown,
  ArrowUp,
  Barcode,
  X,
} from 'lucide-react';
import { salesAPI, productsAPI, customersAPI } from '../api/api';
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
import { Input } from '../components/ui/Input';
import Card, { PageHeader, EmptyState, Spinner } from '../components/ui/Card';
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
  if (body?.sale) return body.sale;
  return body ?? fallback;
}

function cartKey(productId, unit) {
  return `${productId}-${unit}`;
}

function getLineTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.salePrice) || 0);
}

export default function CreditSale() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [cart, setCart] = useState([]);

  // Customer & Credit state
  const [customerId, setCustomerId] = useState('');
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState('50000');

  // Credit Payment: 'credit' (full udhaar) or 'partial' (some cash, some udhaar)
  const [creditMode, setCreditMode] = useState('credit');
  const [cashPaidToday, setCashPaidToday] = useState('');

  const [checkingOut, setCheckingOut] = useState(false);
  const [creditWarningOpen, setCreditWarningOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // Refs for Mouseless Keyboard Navigation
  const searchInputRef = useRef(null);
  const cashPaidRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getAll();
      setProducts(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoadingProducts(false);
    }
  }, [toast]);

  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const res = await customersAPI.getAll();
      setCustomers(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load customers'));
    } finally {
      setLoadingCustomers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Select Khata Customer...' },
      ...customers.map((c) => ({
        value: c._id,
        label: `${c.name} · ${c.phone || 'No phone'} (Due: ${formatCurrency(c.dueBalance || c.currentDueBalance || 0)})`,
      })),
    ],
    [customers]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId) || null,
    [customers, customerId]
  );

  const previousDue = useMemo(
    () => Number(selectedCustomer?.dueBalance ?? selectedCustomer?.currentDueBalance ?? 0),
    [selectedCustomer]
  );

  const creditLimit = useMemo(
    () => Number(selectedCustomer?.creditLimit ?? 0),
    [selectedCustomer]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  }, [products, search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + getLineTotal(item), 0),
    [cart]
  );

  // Remaining Udhaar amount added in this bill
  const currentBillCredit = useMemo(() => {
    if (creditMode === 'credit') return cartTotal;
    const paid = Number(cashPaidToday) || 0;
    return Math.max(0, cartTotal - paid);
  }, [creditMode, cartTotal, cashPaidToday]);

  // Updated new total customer due after this bill
  const newTotalDue = useMemo(() => {
    return previousDue + currentBillCredit;
  }, [previousDue, currentBillCredit]);

  const isLimitExceeded = useMemo(() => {
    if (creditLimit <= 0) return false;
    return newTotalDue > creditLimit;
  }, [newTotalDue, creditLimit]);

  const addToCart = (product) => {
    const unit = 'primary';
    const key = cartKey(product._id, unit);
    setCart((prev) => {
      const existing = prev.find((i) => cartKey(i.productId, i.unit) === key);
      if (existing) {
        return prev.map((i) =>
          cartKey(i.productId, i.unit) === key
            ? { ...i, quantity: (Number(i.quantity) || 0) + 1 }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          costPrice: product.costPrice ?? 0,
          salePrice: product.salePrice ?? 0,
          quantity: 1,
          unit,
          conversionRate: product.conversionRate ?? 1,
          primaryUnit: product.primaryUnit || 'kg',
          secondaryUnit: product.secondaryUnit || 'g',
        },
      ];
    });
  };

  const updateCartItem = (key, patch) => {
    setCart((prev) =>
      prev.map((item) =>
        cartKey(item.productId, item.unit) === key ? { ...item, ...patch } : item
      )
    );
  };

  const removeCartItem = (key) => {
    setCart((prev) => prev.filter((i) => cartKey(i.productId, i.unit) !== key));
  };

  const resetSale = () => {
    setCart([]);
    setCustomerId('');
    setCreditMode('credit');
    setCashPaidToday('');
    searchInputRef.current?.focus();
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    try {
      const res = await customersAPI.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        creditLimit: Number(newCustLimit) || 50000,
        currentDueBalance: 0,
      });
      const createdCust = extractData(res, {});
      toast.success(`Khata created for ${newCustName}`);
      await fetchCustomers();
      if (createdCust?._id) {
        setCustomerId(createdCust._id);
      }
      setNewCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create customer'));
    }
  };

  const validateCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items (F1 to search).');
      return false;
    }
    if (!customerId) {
      toast.error('Please select a Khata customer for credit sale');
      return false;
    }
    if (creditMode === 'partial') {
      const paid = Number(cashPaidToday) || 0;
      if (paid < 0 || paid >= cartTotal) {
        toast.error('Partial cash must be less than total bill');
        return false;
      }
    }
    if (isLimitExceeded) {
      setCreditWarningOpen(true);
      return false;
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckout()) return;

    setCheckingOut(true);
    const paidAmount = creditMode === 'partial' ? (Number(cashPaidToday) || 0) : 0;
    const creditAmount = currentBillCredit;

    try {
      const payload = {
        customerId,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity) || 0,
          unit: item.unit,
          unitUsed: item.unit,
          salePrice: Number(item.salePrice) || 0,
          unitPriceCharged: Number(item.salePrice) || 0,
          costPrice: item.costPrice,
          lineTotal: getLineTotal(item),
        })),
        paymentMode: creditMode === 'credit' ? 'credit' : 'partial',
        totalAmount: cartTotal,
        amountPaid: paidAmount,
        cashReceived: paidAmount,
        creditAmount,
        notes: `Credit Sale (Udhaar) - Prev Due: Rs.${previousDue}`,
      };

      const res = await salesAPI.create(payload);
      const sale = extractData(res, {});

      setCompletedSale({
        ...sale,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        previousDue,
        currentBillCredit,
        paidToday: paidAmount,
        newTotalDue: previousDue + creditAmount,
        createdAt: new Date(),
      });
      setSuccessOpen(true);
      toast.success('Credit invoice recorded and customer khata updated');
      fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Credit checkout failed'));
    } finally {
      setCheckingOut(false);
    }
  };

  // Mouseless Hotkeys Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F1 or / : Focus Search
      if (e.key === 'F1' || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // F3 : Focus Partial Cash Paid
      if (e.key === 'F3') {
        e.preventDefault();
        setCreditMode('partial');
        setTimeout(() => cashPaidRef.current?.focus(), 100);
        return;
      }
      // F4 or Ctrl+Enter : Instant Checkout
      if (e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (!checkingOut && !successOpen && cart.length > 0 && customerId) {
          handleCheckout();
        }
        return;
      }
      // F8 : Reset
      if (e.key === 'F8') {
        e.preventDefault();
        resetSale();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, checkingOut, successOpen, customerId, creditMode, cashPaidToday, previousDue, currentBillCredit, newTotalDue]);

  // Handle Arrow navigation & Barcode scanner Enter in search box
  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (filteredProducts.length === 0) return;
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredProducts.length);
    } else if (e.key === 'ArrowUp') {
      if (filteredProducts.length === 0) return;
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredProducts.length) % filteredProducts.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = search.trim();
      if (!q && filteredProducts.length === 0) return;

      // 1. Check exact barcode match first
      const exactBarcode = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === q.toLowerCase()
      );
      const productToAdd = exactBarcode || filteredProducts[selectedIndex] || filteredProducts[0];

      if (productToAdd) {
        addToCart(productToAdd);
        toast.success(`⚡ Scanned & Added: ${productToAdd.name}`);
        setSearch(''); // Auto-clear for next scan
      }
    }
  };

  const handleWhatsApp = () => {
    const phone = completedSale?.customerPhone || selectedCustomer?.phone;
    const invoiceNo = completedSale?.invoiceNumber || completedSale?._id || 'N/A';
    const text = `*Credit / Udhaar Bill Slip*\n` +
      `--------------------------\n` +
      `Customer: ${completedSale?.customerName || selectedCustomer?.name}\n` +
      `Invoice: ${invoiceNo}\n` +
      `Current Bill: ${formatCurrency(completedSale?.totalAmount ?? cartTotal)}\n` +
      `Paid Today: ${formatCurrency(completedSale?.paidToday ?? 0)}\n` +
      `New Udhaar Added: ${formatCurrency(completedSale?.currentBillCredit ?? currentBillCredit)}\n` +
      `*Total Khata Balance Due:* ${formatCurrency(completedSale?.newTotalDue ?? newTotalDue)}\n` +
      `--------------------------\n` +
      `— Electric Shop`;
    openWhatsAppShare(phone, text);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setCompletedSale(null);
    resetSale();
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Credit Sale (Udhaar)"
        subtitle="Issue credit bills & manage customer khata ledger balances"
        actions={
          <Badge variant="brand" className="px-3 py-1 text-xs">
            Udhaar Billing
          </Badge>
        }
      />

      {/* Keyboard Shortcuts Toolbar (Mouseless Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-900 px-3 py-2 text-xs text-white shadow-sm">
        <div className="flex items-center gap-2 font-medium">
          <Keyboard className="h-4 w-4 text-brand-400" />
          <span className="text-brand-400 font-bold">Mouseless Credit Shortcuts:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">F1</kbd> Search / Scan Barcode
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">↑ ↓ + Enter</kbd> Add to Bill
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">F3</kbd> Partial Cash Paid
          </span>
          <span className="rounded bg-brand-700 px-2 py-0.5 font-bold text-white shadow-sm">
            <kbd className="text-white">F4 / Ctrl+Enter</kbd> Confirm Udhaar
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-danger-300">F8</kbd> Reset
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Product Catalog */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="[F1] Scan Barcode with scanner or type product name / code..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'rounded-lg p-1.5 text-ink-600 transition',
                    viewMode === 'grid' && 'bg-white text-ink-900 shadow-sm'
                  )}
                  title="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'rounded-lg p-1.5 text-ink-600 transition',
                    viewMode === 'list' && 'bg-white text-ink-900 shadow-sm'
                  )}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState title="No products found" description="Try a different search term or barcode" />
            ) : viewMode === 'grid' ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((p, idx) => {
                  const isHighlighted = idx === selectedIndex && search.trim().length > 0;
                  const outOfStock = (p.stockInSecondaryUnit ?? p.stock ?? 0) <= 0;
                  return (
                    <motion.div
                      key={p._id}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'group flex flex-col justify-between rounded-xl border p-3.5 transition',
                        isHighlighted
                          ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/40 shadow-md'
                          : 'border-ink-200 bg-white hover:border-brand-400 hover:shadow-md',
                        outOfStock && 'opacity-60'
                      )}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-ink-900 line-clamp-1">{p.name}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {p.category && (
                            <span className="shrink-0 rounded bg-ink-100 px-1.5 py-0.5 text-[10px] text-ink-600">
                              {p.category}
                            </span>
                          )}
                          {p.barcode && (
                            <span className="inline-flex items-center gap-0.5 font-mono text-[9px] text-ink-500 bg-ink-100 px-1 py-0.5 rounded">
                              <Barcode className="h-2.5 w-2.5" /> {p.barcode}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 font-display text-base font-bold text-brand-700">
                          {formatCurrency(p.salePrice)}
                          <span className="text-xs font-normal text-ink-400">
                            /{p.primaryUnit || 'unit'}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2 text-xs">
                        <span className="text-ink-500">
                          Stock: {formatNumber(p.stockInSecondaryUnit ?? 0)} {p.secondaryUnit || p.primaryUnit}
                        </span>
                        <Button
                          size="sm"
                          disabled={outOfStock}
                          onClick={() => addToCart(p)}
                          className="h-7 px-2.5 text-xs"
                        >
                          + Add to Bill
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-200">
                {filteredProducts.map((p, idx) => {
                  const isHighlighted = idx === selectedIndex && search.trim().length > 0;
                  return (
                    <div
                      key={p._id}
                      className={cn(
                        'flex items-center justify-between p-3 transition',
                        isHighlighted ? 'bg-brand-50' : 'hover:bg-ink-50/50'
                      )}
                    >
                      <div>
                        <p className="font-semibold text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-400">
                          {p.category} · Stock: {formatNumber(p.stockInSecondaryUnit ?? 0)} {p.secondaryUnit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-brand-700">
                          {formatCurrency(p.salePrice)}
                        </span>
                        <Button size="sm" onClick={() => addToCart(p)}>
                          + Add
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right: Credit Bill Panel */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-4 border-brand-200 shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">Credit Bill (ادھار بل)</h2>
                  <span className="text-[11px] text-ink-400">{cart.length} item(s) in cart</span>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-danger-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Khata Customer Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-brand-800">
                  Select Khata Customer *
                </label>
                <button
                  type="button"
                  onClick={() => setNewCustomerOpen(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  + New Khata
                </button>
              </div>

              <Dropdown
                searchable
                options={customerOptions}
                value={customerId}
                onChange={(val) => setCustomerId(val)}
                placeholder="Choose Khata Customer..."
                disabled={loadingCustomers}
              />

              {/* Selected Customer Credit Details Card */}
              {selectedCustomer && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 text-xs space-y-1.5 shadow-xs">
                  <div className="flex justify-between font-bold text-ink-900">
                    <span>{selectedCustomer.name}</span>
                    <span>{selectedCustomer.phone || 'No phone'}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-200/60 pt-1 text-ink-600">
                    <span>Previous Due (پچھلا بقایا):</span>
                    <span className="font-bold text-danger-700">{formatCurrency(previousDue)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Credit Limit:</span>
                    <span>{formatCurrency(creditLimit)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List with Editable Quantity AND Editable Price */}
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1 scrollbar-thin border-y border-ink-100 py-2">
              {cart.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-400">
                  Cart is empty. Press <kbd className="font-bold text-ink-700">F1</kbd> to search &amp; add items.
                </p>
              ) : (
                cart.map((item) => {
                  const key = cartKey(item.productId, item.unit);
                  return (
                    <div key={key} className="rounded-lg border border-ink-200 bg-white p-2.5 text-xs shadow-xs space-y-1.5">
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-ink-900">{item.productName}</span>
                        <button
                          type="button"
                          onClick={() => removeCartItem(key)}
                          className="text-ink-400 hover:text-danger-600 transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Quantity AND Editable Price Inputs */}
                      <div className="flex items-center justify-between gap-2 border-t border-ink-100 pt-1.5">
                        <div className="flex items-center gap-1.5">
                          {/* Qty Input */}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-ink-400 font-medium">Qty</span>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => updateCartItem(key, { quantity: e.target.value })}
                              className="h-7 w-16 rounded-lg border border-ink-200 bg-ink-50/50 px-1.5 text-center text-xs font-bold text-ink-900 outline-none focus:border-brand-500 focus:bg-white"
                              title="Edit Quantity"
                            />
                          </div>

                          <span className="text-ink-400 pt-3">×</span>

                          {/* Editable Price Input */}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-brand-700 font-bold">Rate (Rs)</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.salePrice}
                              onChange={(e) => updateCartItem(key, { salePrice: e.target.value })}
                              className="h-7 w-20 rounded-lg border border-brand-300 bg-brand-50/30 px-1.5 text-center text-xs font-bold text-brand-900 outline-none focus:border-brand-500 focus:bg-white"
                              title="Edit Price (اپنی مرضی کا ریٹ درج کریں)"
                            />
                          </div>
                        </div>

                        {/* Line Total */}
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-ink-400 font-medium">Total</span>
                          <span className="font-bold text-ink-900 pt-0.5">
                            {formatCurrency(getLineTotal(item))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Credit Payment Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                Payment Type (ادھار / جزوی نقد)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreditMode('credit');
                    setCashPaidToday('');
                  }}
                  className={cn(
                    'rounded-xl border p-2 text-xs font-semibold transition text-left',
                    creditMode === 'credit'
                      ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  )}
                >
                  <p className="font-bold">Full Credit</p>
                  <p className="text-[10px] text-ink-400">100% Khata me add</p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreditMode('partial')}
                  className={cn(
                    'rounded-xl border p-2 text-xs font-semibold transition text-left',
                    creditMode === 'partial'
                      ? 'border-brand-500 bg-brand-50 text-brand-900 shadow-sm'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  )}
                >
                  <p className="font-bold">Partial [F3]</p>
                  <p className="text-[10px] text-ink-400">Kuch naqd, baqi udhaar</p>
                </button>
              </div>

              {creditMode === 'partial' && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-2.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-brand-900">
                      Paid Today [F3]
                    </label>
                    <input
                      ref={cashPaidRef}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="e.g. 2000"
                      value={cashPaidToday}
                      onChange={(e) => setCashPaidToday(e.target.value)}
                      className="h-10 w-full rounded-xl border border-brand-300 bg-white px-3 text-xs font-bold text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink-700">
                      New Udhaar Added
                    </label>
                    <div className="flex h-10 items-center rounded-xl border border-ink-200 bg-white px-3 font-display text-xs font-bold text-danger-700 shadow-xs">
                      {formatCurrency(currentBillCredit)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bill & Khata Calculation Summary */}
            <div className="space-y-1.5 rounded-xl border border-ink-200 bg-ink-50/60 p-3 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Current Bill Total (موجودہ بل):</span>
                <span className="font-bold text-ink-900">{formatCurrency(cartTotal)}</span>
              </div>
              {creditMode === 'partial' && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Paid Today (آج نقد وصولی):</span>
                  <span>- {formatCurrency(Number(cashPaidToday) || 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-danger-700 font-semibold">
                <span>New Udhaar on this Bill:</span>
                <span>+ {formatCurrency(currentBillCredit)}</span>
              </div>
              <div className="flex justify-between text-ink-600 border-t border-ink-200 pt-1">
                <span>Previous Khata Due (پچھلا بقایا):</span>
                <span>{formatCurrency(previousDue)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-300 pt-1.5 text-sm font-bold text-ink-950">
                <span>NEW TOTAL KHATA BALANCE:</span>
                <span className="text-danger-800 font-display">{formatCurrency(newTotalDue)}</span>
              </div>
            </div>

            {/* Limit Warning */}
            {isLimitExceeded && (
              <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-2.5 text-xs text-danger-800">
                <AlertTriangle className="h-4 w-4 shrink-0 text-danger-600" />
                <span>Customer credit limit ({formatCurrency(creditLimit)}) exceeded!</span>
              </div>
            )}

            <Button
              className="w-full font-bold"
              size="lg"
              loading={checkingOut}
              disabled={cart.length === 0 || !customerId}
              onClick={handleCheckout}
            >
              Confirm Credit Bill [F4 / Ctrl+Enter]
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal: Quick Add New Khata Customer */}
      <Modal
        open={newCustomerOpen}
        onClose={() => setNewCustomerOpen(false)}
        title="Create New Khata Customer"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 py-2">
          <Input
            label="Customer Name (گاہک کا نام) *"
            placeholder="e.g. Tariq Mehmood"
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
          />
          <Input
            label="Phone Number (فون نمبر)"
            placeholder="03XX-XXXXXXX"
            value={newCustPhone}
            onChange={(e) => setNewCustPhone(e.target.value)}
          />
          <Input
            label="Credit Limit (ادھار کی حد - Rs)"
            type="number"
            value={newCustLimit}
            onChange={(e) => setNewCustLimit(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" type="button" onClick={() => setNewCustomerOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Khata</Button>
          </div>
        </form>
      </Modal>

      {/* Credit Limit Exceeded Alert Modal */}
      <Modal
        open={creditWarningOpen}
        onClose={() => setCreditWarningOpen(false)}
        title="Credit Limit Warning"
        footer={<Button onClick={() => setCreditWarningOpen(false)}>I Understand</Button>}
      >
        <div className="space-y-3 py-2 text-center text-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-100 text-danger-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <p className="font-bold text-ink-900">
            {selectedCustomer?.name} ki credit limit ({formatCurrency(creditLimit)}) exceed ho rahi hai!
          </p>
          <p className="text-xs text-ink-600">
            Previous Due: {formatCurrency(previousDue)} + Current Bill: {formatCurrency(currentBillCredit)} ={' '}
            <span className="font-bold text-danger-700">{formatCurrency(newTotalDue)}</span>
          </p>
        </div>
      </Modal>

      {/* Success Modal + Full Printable Udhaar Receipt */}
      <Modal
        open={successOpen}
        onClose={handleSuccessClose}
        title="Credit Invoice Completed"
        footer={
          <div className="no-print flex flex-wrap justify-end gap-2">
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print Udhaar Bill (رسید پرنٹ کریں)
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsApp}>
              Share on WhatsApp
            </Button>
            <Button onClick={handleSuccessClose}>New Credit Sale (F1)</Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          {/* Printable Thermal Receipt */}
          <div
            id="print-receipt"
            className="print-receipt mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-4 text-ink-900 shadow-sm"
          >
            <div className="border-b border-dashed border-ink-300 pb-3 text-center">
              <h2 className="font-display text-xl font-bold tracking-tight">Electric Shop</h2>
              <div className="mt-1 inline-block rounded bg-danger-100 px-2.5 py-0.5 text-xs font-bold text-danger-800 uppercase tracking-wider">
                CREDIT / UDHAAR INVOICE (ادھار بل)
              </div>
              <p className="mt-1 text-xs text-ink-500">Customer Khata Bill Slip</p>
            </div>

            <div className="mt-3 space-y-1 text-xs border-b border-ink-100 pb-3">
              <div className="flex justify-between">
                <span className="text-ink-500">Invoice No:</span>
                <span className="font-bold">{completedSale?.invoiceNumber || completedSale?.invoiceNo || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-500">Date & Time:</span>
                <span>{formatDateTime(completedSale?.createdAt || new Date())}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-ink-500">Khata Customer:</span>
                <span className="font-bold text-ink-900">{completedSale?.customerName}</span>
              </div>
              {completedSale?.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Phone:</span>
                  <span>{completedSale?.customerPhone}</span>
                </div>
              )}
            </div>

            {/* Items table */}
            <table className="mt-3 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink-200 font-semibold text-ink-500">
                  <th className="py-1.5">Item</th>
                  <th className="py-1.5 text-right">Qty</th>
                  <th className="py-1.5 text-right">Rate</th>
                  <th className="py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(completedSale?.items || cart).map((item, idx) => (
                  <tr key={idx} className="border-b border-ink-100">
                    <td className="py-1.5 font-medium">{item.productName}</td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">{formatCurrency(item.salePrice || item.unitPriceCharged)}</td>
                    <td className="py-1.5 text-right font-bold">{formatCurrency(item.lineTotal || getLineTotal(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Khata Ledger Breakdown */}
            <div className="mt-4 space-y-1 border-t border-dashed border-ink-300 pt-3 text-xs">
              <div className="flex justify-between text-ink-600">
                <span>Current Bill Total (بل کی کل رقم):</span>
                <span className="font-bold">{formatCurrency(completedSale?.totalAmount ?? cartTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Paid Today (آج نقد وصولی):</span>
                <span>{formatCurrency(completedSale?.paidToday ?? 0)}</span>
              </div>
              <div className="flex justify-between text-danger-700 font-semibold">
                <span>New Udhaar Added (نیا ادھار):</span>
                <span>+ {formatCurrency(completedSale?.currentBillCredit ?? currentBillCredit)}</span>
              </div>
              <div className="flex justify-between text-ink-600 border-t border-ink-100 pt-1">
                <span>Previous Khata Due (پچھلا بقایا):</span>
                <span>{formatCurrency(completedSale?.previousDue ?? previousDue)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-300 pt-1.5 text-sm font-bold text-danger-800">
                <span>TOTAL DUE UDHAAR (کل بقایا ادھار):</span>
                <span className="font-display text-base">{formatCurrency(completedSale?.newTotalDue ?? newTotalDue)}</span>
              </div>
            </div>

            <div className="mt-4 border-t border-ink-100 pt-2 text-center text-[10px] text-ink-400">
              <p>Khata updated automatically · Thank you for your business</p>
              <p className="mt-0.5 font-medium text-brand-700">Electric Shop POS</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
