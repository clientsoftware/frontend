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
  Banknote,
  CreditCard,
  User,
  Users,
  CheckCircle2,
  Keyboard,
  ArrowDown,
  ArrowUp,
  Barcode,
  X,
  PackagePlus,
  ArrowLeftRight,
  Plus,
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
import SaleReceipt from '../components/SaleReceipt';

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

export default function POS() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [cart, setCart] = useState([]);

  // Customer Mode: 'walkin' or 'existing'
  const [customerMode, setCustomerMode] = useState('walkin'); // 'walkin' | 'existing'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');

  const [paymentType, setPaymentType] = useState('cash'); // 'cash' | 'bank'
  const [cashTendered, setCashTendered] = useState(''); // Amount given by customer to calculate change

  // Customer Trade-In: Customer la k deta hai maal (اپنا مال بیچنا)
  const [tradeInItems, setTradeInItems] = useState([]); // Items customer brings
  const [tradeInForm, setTradeInForm] = useState({ name: '', quantity: '', rate: '', unit: 'Pieces' });
  // Existing product match
  const [tradeInProductMatch, setTradeInProductMatch] = useState(null); // matched product from inventory

  const [checkingOut, setCheckingOut] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  // Refs for Mouseless Keyboard Navigation
  const searchInputRef = useRef(null);
  const customerInputRef = useRef(null);
  const cashInputRef = useRef(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const [productsRes, customersRes] = await Promise.all([
        productsAPI.getAll(),
        customersAPI.getAll(),
      ]);
      setProducts(extractList(productsRes));
      setCustomers(extractList(customersRes));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products / customers'));
    } finally {
      setLoadingProducts(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Select Existing / Purana Customer...' },
      ...customers.map((c) => ({
        value: c._id,
        label: `${c.name} · ${c.phone || 'No phone'} (Due: ${formatCurrency(c.dueBalance || c.currentDueBalance || 0)})`,
      })),
    ],
    [customers]
  );

  const selectedExistingCustomer = useMemo(
    () => customers.find((c) => c._id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
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

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + getLineTotal(item), 0),
    [cart]
  );

  // Active trade-in item currently in the input boxes
  const activeTradeInFromForm = useMemo(() => {
    const name = tradeInForm.name?.trim();
    const qty = Number(tradeInForm.quantity) || 0;
    const rate = Number(tradeInForm.rate) || 0;
    if (!name || qty <= 0) return null;
    return {
      id: 'active-input-item',
      name,
      quantity: qty,
      rate,
      unit: tradeInForm.unit || 'Pieces',
      matchedProductId: tradeInProductMatch?._id || null,
      matchedProductName: tradeInProductMatch?.name || null,
      totalValue: qty * rate,
    };
  }, [tradeInForm, tradeInProductMatch]);

  // Combined trade-in items (already added + currently in input)
  const allTradeInItems = useMemo(() => {
    const items = [...tradeInItems];
    if (activeTradeInFromForm) {
      items.push(activeTradeInFromForm);
    }
    return items;
  }, [tradeInItems, activeTradeInFromForm]);

  // Total trade-in deduction
  const allTradeInTotal = useMemo(
    () => allTradeInItems.reduce((s, i) => s + (i.totalValue || 0), 0),
    [allTradeInItems]
  );

  // Net amount customer must pay after deducting trade-in goods value
  const netPayable = useMemo(
    () => Math.max(0, cartTotal - allTradeInTotal),
    [cartTotal, allTradeInTotal]
  );

  // Change to return to customer
  const changeToReturn = useMemo(() => {
    const given = Number(cashTendered) || 0;
    if (given <= 0) return 0;
    return Math.max(0, given - netPayable);
  }, [cashTendered, netPayable]);

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
    setSelectedCustomerId('');
    setWalkInName('');
    setWalkInPhone('');
    setPaymentType('cash');
    setCashTendered('');
    setTradeInItems([]);
    setTradeInForm({ name: '', quantity: '', rate: '', unit: 'Pieces' });
    setTradeInProductMatch(null);
    searchInputRef.current?.focus();
  };

  // Trade-In: search matching product when name changes
  const handleTradeInNameChange = (val) => {
    setTradeInForm((f) => ({ ...f, name: val }));
    if (val.trim().length >= 2) {
      const match = products.find(
        (p) =>
          p.name.toLowerCase().includes(val.trim().toLowerCase()) ||
          p.barcode?.toLowerCase() === val.trim().toLowerCase()
      );
      setTradeInProductMatch(match || null);
    } else {
      setTradeInProductMatch(null);
    }
  };

  const addAnotherTradeInItem = () => {
    const name = tradeInForm.name.trim();
    const qty = Number(tradeInForm.quantity);
    const rate = Number(tradeInForm.rate);
    if (!name) { toast.error('Enter product name'); return; }
    if (!qty || qty <= 0) { toast.error('Enter quantity'); return; }

    setTradeInItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        quantity: qty,
        rate,
        unit: tradeInForm.unit || 'Pieces',
        matchedProductId: tradeInProductMatch?._id || null,
        matchedProductName: tradeInProductMatch?.name || null,
        totalValue: qty * (rate || 0),
      },
    ]);
    setTradeInForm({ name: '', quantity: '', rate: '', unit: 'Pieces' });
    setTradeInProductMatch(null);
    toast.success(`Added: ${name} (${qty})`);
  };

  const removeTradeInItem = (id) => {
    setTradeInItems((prev) => prev.filter((i) => i.id !== id));
  };

  const validateCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty. Please add items (F1 to search).');
      return false;
    }
    if (customerMode === 'walkin') {
      if (!walkInName.trim()) {
        toast.error('Customer Name (گاہک کا نام) enter karna zaroori hai');
        return false;
      }
      if (!walkInPhone.trim()) {
        toast.error('Customer Phone Number (فون نمبر) enter karna zaroori hai');
        return false;
      }
    } else if (customerMode === 'existing') {
      if (!selectedCustomerId) {
        toast.error('Khata / Existing customer select karein');
        return false;
      }
    }
    return true;
  };

  const handleCheckout = async () => {
    if (!validateCheckout()) return;

    setCheckingOut(true);
    const finalCustomerName =
      customerMode === 'existing' && selectedExistingCustomer
        ? selectedExistingCustomer.name
        : walkInName.trim() || 'Walk-in Cash Customer';

    const finalCustomerPhone =
      customerMode === 'existing' && selectedExistingCustomer
        ? selectedExistingCustomer.phone
        : walkInPhone.trim() || undefined;

    // Snapshot all trade in items (including current form inputs)
    const finalTradeInItems = [...allTradeInItems];
    const finalTradeInTotal = allTradeInTotal;
    const finalNetPayable = Math.max(0, cartTotal - finalTradeInTotal);

    try {
      const payload = {
        customerId: customerMode === 'existing' ? selectedCustomerId || null : null,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
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
        paymentMode: paymentType,
        totalAmount: finalNetPayable,          // net after trade-in deduction
        grossAmount: cartTotal,                // original bill before trade-in
        tradeInDiscount: finalTradeInTotal,    // value of goods customer brought
        amountPaid: finalNetPayable,
        cashReceived: finalNetPayable,
        creditAmount: 0,
      };

      const res = await salesAPI.create(payload);
      const sale = extractData(res, {});

      // ✅ Auto add trade-in items directly to inventory
      if (finalTradeInItems.length > 0) {
        const tradeInPromises = finalTradeInItems.map(async (ti) => {
          if (ti.matchedProductId) {
            // Existing product → increase stock
            try {
              await productsAPI.adjustStock(ti.matchedProductId, {
                quantity: ti.quantity,
                unitUsed: 'primary',
                type: 'add',
                reason: `Customer trade-in by ${finalCustomerName}`,
              });
            } catch (e) {
              console.warn('Stock adjust failed for trade-in:', ti.name, e);
            }
          } else {
            // New product → create in inventory
            try {
              await productsAPI.create({
                name: ti.name,
                category: 'Customer Trade-In',
                primaryUnit: ti.unit || 'Pieces',
                secondaryUnit: ti.unit || 'Pieces',
                conversionRate: 1,
                costPrice: ti.rate || 0,
                salePrice: ti.rate || 0,
                currentStock: ti.quantity,
              });
            } catch (e) {
              console.warn('Product creation failed for trade-in:', ti.name, e);
            }
          }
        });
        await Promise.allSettled(tradeInPromises);
        toast.success(`📦 ${finalTradeInItems.length} trade-in item(s) stock automatically updated!`);
        fetchProducts(); // Refresh products list
      }

      setCompletedSale({
        ...sale,
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone || '',
        grossAmount: cartTotal,
        tradeInDiscount: finalTradeInTotal,
        paidAmount: finalNetPayable,
        totalAmount: finalNetPayable,
        dueAmount: 0,
        changeToReturn,
        createdAt: new Date(),
        tradeInItems: finalTradeInItems.length > 0 ? finalTradeInItems : null,
        tradeInTotal: finalTradeInTotal,
      });
      setSuccessOpen(true);
      toast.success('Cash sale completed successfully');
      setTimeout(() => window.print(), 350);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Cash checkout failed'));
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
      // F2 : Focus Customer Name / Selector
      if (e.key === 'F2') {
        e.preventDefault();
        customerInputRef.current?.focus();
        return;
      }
      // F3 : Focus Cash Tendered / Payment
      if (e.key === 'F3') {
        e.preventDefault();
        cashInputRef.current?.focus();
        return;
      }
      // F4 or Ctrl+Enter : Instant Checkout
      if (e.key === 'F4' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        if (!checkingOut && !successOpen && cart.length > 0) {
          handleCheckout();
        }
        return;
      }
      // Escape / F8 : Reset
      if (e.key === 'F8') {
        e.preventDefault();
        resetSale();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, checkingOut, successOpen, customerMode, selectedExistingCustomer, walkInName, walkInPhone, paymentType, cashTendered]);

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
    const phone = completedSale?.customerPhone || walkInPhone || selectedExistingCustomer?.phone;
    const invoiceNo = completedSale?.invoiceNumber || completedSale?._id || 'N/A';
    const text = `*Cash Sale Bill — Electric Shop*\n` +
      `--------------------------\n` +
      `Invoice: ${invoiceNo}\n` +
      `Customer: ${completedSale?.customerName || 'Walk-in Customer'}\n` +
      `Total Paid: ${formatCurrency(completedSale?.totalAmount ?? cartTotal)}\n` +
      `Status: Fully Paid (نقد ادائیگی مکمل)\n` +
      `--------------------------\n` +
      `Thank you for your purchase!`;
    openWhatsAppShare(phone, text);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setCompletedSale(null);
    resetSale();
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="POS / Cash Sale"
        subtitle="Fast checkout for walk-in and cash customers (100% Complete Payment)"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="success" className="px-3 py-1 text-xs">
              Cash / 100% Paid
            </Badge>
          </div>
        }
      />

      {/* Keyboard Shortcuts Toolbar (Mouseless Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-200 bg-ink-900 px-3 py-2 text-xs text-white shadow-sm">
        <div className="flex items-center gap-2 font-medium">
          <Keyboard className="h-4 w-4 text-emerald-400" />
          <span className="text-emerald-400 font-bold">Mouseless POS Shortcuts:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">F1</kbd> Search Item
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">↑ ↓ + Enter</kbd> Add to Cart
          </span>
          <span className="rounded bg-ink-800 px-2 py-0.5 border border-ink-700">
            <kbd className="font-bold text-amber-300">F2</kbd> Customer (نیا/پرانا)
          </span>
          <span className="rounded bg-emerald-700 px-2 py-0.5 font-bold text-white shadow-sm">
            <kbd className="text-white">F4 / Ctrl+Enter</kbd> Final Bill
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
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white pl-9 pr-4 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-50/40 shadow-md'
                          : 'border-ink-200 bg-white hover:border-emerald-400 hover:shadow-md',
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
                        <p className="mt-1.5 font-display text-base font-bold text-emerald-700">
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
                          className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          + Add
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
                        isHighlighted ? 'bg-emerald-50' : 'hover:bg-ink-50/50'
                      )}
                    >
                      <div>
                        <p className="font-semibold text-ink-900">{p.name}</p>
                        <p className="text-xs text-ink-400">
                          {p.category} · Stock: {formatNumber(p.stockInSecondaryUnit ?? 0)} {p.secondaryUnit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-display font-bold text-emerald-700">
                          {formatCurrency(p.salePrice)}
                        </span>
                        <Button size="sm" onClick={() => addToCart(p)} className="bg-emerald-600 hover:bg-emerald-700">
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

        {/* Right: Cash Cart Panel */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="space-y-4 border-emerald-200 shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <ShoppingCart className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-ink-900">Cash Bill (نقد بل)</h2>
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

            {/* Customer Selection: Walk-in vs Existing Old Customer */}
            <div className="rounded-xl border border-ink-200 bg-ink-50/40 p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-ink-200/60 pb-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                  <User className="h-3.5 w-3.5 text-ink-500" />
                  <span>Customer (گاہک کی تفصیل - F2)</span>
                </div>
                <div className="flex rounded-lg bg-ink-200 p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setCustomerMode('walkin')}
                    className={cn(
                      'rounded-md px-2 py-0.5 font-medium transition',
                      customerMode === 'walkin'
                        ? 'bg-white text-ink-900 shadow-sm font-bold'
                        : 'text-ink-600 hover:text-ink-900'
                    )}
                  >
                    Walk-in (نیا)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode('existing')}
                    className={cn(
                      'rounded-md px-2 py-0.5 font-medium transition',
                      customerMode === 'existing'
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-ink-600 hover:text-ink-900'
                    )}
                  >
                    Old Customer (پرانا)
                  </button>
                </div>
              </div>

              {customerMode === 'walkin' ? (
                <div className="grid gap-2 sm:grid-cols-2 pt-1">
                  <Input
                    ref={customerInputRef}
                    label="Customer Name *"
                    placeholder="Customer Name (Required) *"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    required
                  />
                  <Input
                    label="Phone No *"
                    placeholder="Phone No (Required) *"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="pt-1">
                  <Dropdown
                    searchable
                    options={customerOptions}
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    placeholder="Search old/existing customer..."
                  />
                  {selectedExistingCustomer && (
                    <div className="mt-1 flex justify-between text-[11px] text-ink-500 px-1">
                      <span>Phone: {selectedExistingCustomer.phone || '—'}</span>
                      <span>Khata Due: {formatCurrency(selectedExistingCustomer.dueBalance || 0)}</span>
                    </div>
                  )}
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
                              className="h-7 w-16 rounded-lg border border-ink-200 bg-ink-50/50 px-1.5 text-center text-xs font-bold text-ink-900 outline-none focus:border-emerald-500 focus:bg-white"
                              title="Edit Quantity"
                            />
                          </div>

                          <span className="text-ink-400 pt-3">×</span>

                          {/* Editable Price Input */}
                          <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-700 font-bold">Rate (Rs)</span>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.salePrice}
                              onChange={(e) => updateCartItem(key, { salePrice: e.target.value })}
                              className="h-7 w-20 rounded-lg border border-emerald-300 bg-emerald-50/30 px-1.5 text-center text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 focus:bg-white"
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

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                Payment Mode (ادائیگی کا طریقہ)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition',
                    paymentType === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  )}
                >
                  <Banknote className="h-4 w-4 text-emerald-600" />
                  Cash (نقد رقم)
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentType('bank')}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border p-2 text-xs font-bold transition',
                    paymentType === 'bank'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  )}
                >
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  Bank / Online
                </button>
              </div>
            </div>



            {/* ====== CUSTOMER TRADE-IN SECTION ====== */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-amber-200 pb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">Customer Brings Goods (Trade-In)</p>
                  <p className="text-[10px] text-amber-700">Items customer brings will be added to inventory & deducted from bill</p>
                </div>
              </div>

              {/* Input row */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Product ka naam likhein ya scan karein..."
                  value={tradeInForm.name}
                  onChange={(e) => handleTradeInNameChange(e.target.value)}
                  className="h-8 w-full rounded-lg border border-amber-300 bg-white pl-2.5 pr-2 text-xs text-ink-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/30 placeholder:text-ink-400"
                />

                {/* Inline match status — no absolute overlap */}
                {tradeInForm.name.trim().length >= 2 && (
                  tradeInProductMatch ? (
                    <div className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px]">
                      <span className="text-emerald-600">✅</span>
                      <span className="font-semibold text-emerald-800">Inventory mein mila: {tradeInProductMatch.name}</span>
                      <span className="ml-auto text-ink-500">Stock: {tradeInProductMatch.stockInSecondaryUnit ?? 0} {tradeInProductMatch.primaryUnit}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px]">
                      <span>⚠️</span>
                      <span className="text-ink-600">Inventory mein nahi mila —</span>
                      <span className="font-semibold text-brand-700">naya product banega</span>
                    </div>
                  )
                )}

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-amber-800 font-semibold">Quantity</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Qty"
                      value={tradeInForm.quantity}
                      onChange={(e) => setTradeInForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-center text-xs font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-amber-800 font-semibold">Rate (Rs.)</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={tradeInForm.rate}
                      onChange={(e) => setTradeInForm((f) => ({ ...f, rate: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-center text-xs font-bold outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-amber-800 font-semibold">Unit</span>
                    <input
                      type="text"
                      placeholder="Pieces"
                      value={tradeInForm.unit}
                      onChange={(e) => setTradeInForm((f) => ({ ...f, unit: e.target.value }))}
                      className="h-8 w-full rounded-lg border border-amber-300 bg-white px-2 text-center text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Live Automatic Trade-In Indicator */}
                {activeTradeInFromForm && (
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓ Auto-Applied:</span>
                      <span>
                        {activeTradeInFromForm.name} ({activeTradeInFromForm.quantity} {activeTradeInFromForm.unit} × Rs. {activeTradeInFromForm.rate})
                      </span>
                    </div>
                    <span className="text-emerald-700 font-bold text-sm">
                      − {formatCurrency(activeTradeInFromForm.totalValue)}
                    </span>
                  </div>
                )}

                {/* Optional button to add a second/extra item if needed */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={addAnotherTradeInItem}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 underline"
                  >
                    <Plus className="h-3 w-3" /> + Add Another Trade-In Item (if multiple)
                  </button>
                </div>
              </div>

              {/* Added Trade-In Items List (if multiple items were added) */}
              {tradeInItems.length > 0 && (
                <div className="space-y-1.5 border-t border-amber-200 pt-2">
                  <p className="text-[11px] font-bold text-amber-900">List of Goods Received:</p>
                  {tradeInItems.map((ti) => (
                    <div key={ti.id} className="flex items-center justify-between rounded-lg bg-white border border-amber-200 px-2.5 py-1.5 text-[11px]">
                      <div>
                        <p className="font-bold text-ink-900">{ti.name}</p>
                        <p className="text-ink-500">
                          {ti.quantity} {ti.unit}
                          {ti.rate > 0 && ` × Rs. ${ti.rate}`}
                          {ti.matchedProductId && (
                            <span className="ml-1 text-emerald-600 font-semibold">(✓ Stock +)</span>
                          )}
                          {!ti.matchedProductId && (
                            <span className="ml-1 text-brand-600 font-semibold">(+ New Product)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {ti.totalValue > 0 && (
                          <span className="font-bold text-amber-700">{formatCurrency(ti.totalValue)}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTradeInItem(ti.id)}
                          className="text-danger-400 hover:text-danger-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Summary */}
            <div className="space-y-1.5 border-t border-ink-100 pt-3">
              {/* Gross bill */}
              <div className="flex justify-between text-sm text-ink-600">
                <span>Gross Bill Amount:</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>

              {/* Total trade-in deduction */}
              {allTradeInTotal > 0 && (
                <div className="flex justify-between text-sm font-semibold text-amber-700">
                  <span>Trade-In Goods Deduction:</span>
                  <span>- {formatCurrency(allTradeInTotal)}</span>
                </div>
              )}

              {/* Net Payable */}
              <div className="flex justify-between font-display text-xl font-bold text-ink-900 border-t border-ink-200 pt-2">
                <span>Net Payable Amount:</span>
                <span className="text-emerald-700">{formatCurrency(netPayable)}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
                <span>Payment Status:</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  100% Paid — No Credit
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              size="lg"
              loading={checkingOut}
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              Complete Sale [F4 / Ctrl+Enter]
            </Button>
          </Card>
        </div>
      </div>

      {/* Success Modal + Full Printable Receipt */}
      <Modal
        open={successOpen}
        onClose={handleSuccessClose}
        title="Cash Sale Completed"
        size="md"
        footer={
          <div className="no-print flex flex-wrap justify-end gap-2">
            <Button variant="danger" leftIcon={X} onClick={handleSuccessClose}>
              Close &amp; New Sale (بند کریں / F1)
            </Button>
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print Receipt
            </Button>
            <Button variant="success" leftIcon={MessageCircle} onClick={handleWhatsApp}>
              Share WhatsApp
            </Button>
          </div>
        }
      >
        <SaleReceipt sale={completedSale} />
      </Modal>
    </div>
  );
}
