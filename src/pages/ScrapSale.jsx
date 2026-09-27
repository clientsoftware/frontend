import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Recycle,
  Trash2,
  LayoutGrid,
  List,
  Printer,
  MessageCircle,
  AlertTriangle,
  CreditCard,
  Banknote,
  Wallet,
  X,
} from 'lucide-react';
import { scrapAPI, productsAPI, customersAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatNumber,
  getErrorMessage,
  openWhatsAppShare,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Dropdown from '../components/ui/Dropdown';
import { Input } from '../components/ui/Input';
import Card, { StatCard, PageHeader, EmptyState, Spinner } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SaleReceipt from '../components/SaleReceipt';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: Banknote },
  { value: 'bank', label: 'Bank', icon: CreditCard },
  { value: 'partial', label: 'Partial', icon: Wallet },
  { value: 'credit', label: 'Full Credit (Udhaar)', icon: Wallet },
];

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

function isScrapProduct(product) {
  const category = String(product.category || '').toLowerCase();
  return category.includes('scrap') || product.type === 'scrap';
}

function cartKey(productId, unit) {
  return `${productId}-${unit}`;
}

function getLineTotal(item) {
  return (Number(item.quantity) || 0) * (Number(item.salePrice) || 0);
}

export default function ScrapSale() {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingToday, setLoadingToday] = useState(true);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [cart, setCart] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [creditAmount, setCreditAmount] = useState('');

  const [checkingOut, setCheckingOut] = useState(false);
  const [creditWarningOpen, setCreditWarningOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productsAPI.getAll();
      setProducts(extractList(res).filter(isScrapProduct));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load scrap products'));
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

  const fetchTodayTotal = useCallback(async () => {
    setLoadingToday(true);
    try {
      const res = await scrapAPI.getTodayTotal();
      const data = extractData(res, {});
      setTodayTotal(Number(data?.total ?? data?.todayTotal ?? data) || 0);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load today\'s scrap total'));
    } finally {
      setLoadingToday(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchTodayTotal();
  }, [fetchProducts, fetchCustomers, fetchTodayTotal]);

  const customerOptions = useMemo(
    () => [
      { value: '', label: 'Walk-in Customer' },
      ...customers.map((c) => ({
        value: c._id,
        label: c.name + (c.phone ? ` · ${c.phone}` : ''),
      })),
    ],
    [customers]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c._id === customerId) || null,
    [customers, customerId]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + getLineTotal(item), 0),
    [cart]
  );

  const effectiveCredit = useMemo(() => {
    if (paymentMode === 'credit') return cartTotal;
    if (paymentMode === 'partial') return Number(creditAmount) || 0;
    return 0;
  }, [paymentMode, cartTotal, creditAmount]);

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
    setWalkInName('');
    setWalkInPhone('');
    setPaymentMode('cash');
    setCashReceived('');
    setCreditAmount('');
  };

  const handlePaymentModeChange = (mode) => {
    setPaymentMode(mode);
    if (mode === 'cash' || mode === 'bank') {
      setCashReceived('');
      setCreditAmount('');
    } else if (mode === 'credit') {
      setCashReceived('');
      setCreditAmount(String(cartTotal));
    } else if (mode === 'partial') {
      setCashReceived('');
      setCreditAmount('');
    }
  };

  useEffect(() => {
    if (paymentMode === 'credit') {
      setCreditAmount(String(cartTotal));
    }
  }, [cartTotal, paymentMode]);

  useEffect(() => {
    if (paymentMode === 'partial' && cashReceived !== '') {
      const cash = Number(cashReceived) || 0;
      setCreditAmount(String(Math.max(0, cartTotal - cash)));
    }
  }, [cashReceived, cartTotal, paymentMode]);

  const validateCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return false;
    }
    if (paymentMode === 'partial') {
      const cash = Number(cashReceived) || 0;
      const credit = Number(creditAmount) || 0;
      if (cash + credit !== cartTotal) {
        toast.error('Cash received + credit must equal total');
        return false;
      }
    }
    if (effectiveCredit > 0 && selectedCustomer) {
      const due = Number(selectedCustomer.dueBalance) || 0;
      const limit = Number(selectedCustomer.creditLimit) || 0;
      if (due + effectiveCredit > limit) {
        setCreditWarningOpen(true);
        return false;
      }
    }
    if (!customerId) {
      if (!walkInName.trim()) {
        toast.error('Customer Name (گاہک کا نام) enter karna zaroori hai');
        return false;
      }
      if (!walkInPhone.trim()) {
        toast.error('Customer Phone Number (فون نمبر) enter karna zaroori hai');
        return false;
      }
    }
    return true;
  };

  const buildPayload = () => ({
    customerId: customerId || null,
    customerName: !customerId ? walkInName.trim() : undefined,
    customerPhone: !customerId ? walkInPhone.trim() : undefined,
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
    paymentMode,
    totalAmount: cartTotal,
    // For cash: full amount received. For partial: cash portion only.
    // For bank: explicitly send amountPaid so backend doesn't treat it as unpaid.
    ...(paymentMode === 'cash' && { cashReceived: cartTotal }),
    ...(paymentMode === 'partial' && { cashReceived: Number(cashReceived) || 0 }),
    ...(paymentMode === 'bank' && { bankAmount: cartTotal, amountPaid: cartTotal }),
    creditAmount: effectiveCredit,
  });

  const handleCheckout = async () => {
    if (!validateCheckout()) return;

    setCheckingOut(true);
    try {
      const res = await scrapAPI.createSale(buildPayload());
      const sale = extractData(res, {});
      const receiptSale = {
        ...sale,
        customerPhone:
          sale.customerPhone || selectedCustomer?.phone || walkInPhone.trim() || '',
        customerName:
          sale.customerName ||
          selectedCustomer?.name ||
          walkInName.trim() ||
          'Walk-in Customer',
      };
      setCompletedSale(receiptSale);
      setSuccessOpen(true);
      toast.success('Scrap sale completed');
      setTimeout(() => window.print(), 400);
      fetchTodayTotal();
      if (!customerId && walkInName.trim()) fetchCustomers();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Checkout failed'));
    } finally {
      setCheckingOut(false);
    }
  };

  const handleWhatsApp = () => {
    const phone =
      completedSale?.customerPhone ||
      selectedCustomer?.phone ||
      walkInPhone ||
      completedSale?.customer?.phone;
    const invoiceNo = completedSale?.invoiceNumber || completedSale?._id || 'N/A';
    const text = `Scrap sale receipt\nInvoice: ${invoiceNo}\nTotal: ${formatCurrency(completedSale?.totalAmount ?? cartTotal)}\n— Electric Shop`;
    openWhatsAppShare(phone, text);
  };

  const handleSuccessClose = () => {
    setSuccessOpen(false);
    setCompletedSale(null);
    resetSale();
  };

  return (
    <div>
      <PageHeader
        title="Scrap Sale"
        subtitle="Sell scrap copper products"
        actions={
          <Badge variant="brand" className="px-3 py-1 text-sm">
            {cart.length} item{cart.length !== 1 ? 's' : ''} · {formatCurrency(cartTotal)}
          </Badge>
        }
      />

      <div className="mb-6 max-w-sm">
        <StatCard
          title="Today's Scrap Sales"
          value={formatCurrency(todayTotal)}
          subtitle="Total scrap sales for today"
          icon={Recycle}
          tone="warning"
          loading={loadingToday}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              leftIcon={Search}
              placeholder="Search scrap products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'rounded-lg p-2 transition',
                  viewMode === 'grid' ? 'bg-brand-50 text-brand-700' : 'text-ink-400 hover:text-ink-700'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'rounded-lg p-2 transition',
                  viewMode === 'list' ? 'bg-brand-50 text-brand-700' : 'text-ink-400 hover:text-ink-700'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="flex justify-center py-20">
              <Spinner />
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Recycle}
              title="No scrap products found"
              description="Add scrap products in inventory or adjust your search."
            />
          ) : viewMode === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <motion.button
                  key={product._id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => addToCart(product)}
                  className="rounded-2xl border border-ink-200 bg-white p-4 text-left shadow-sm transition hover:border-warning-300 hover:shadow-md"
                >
                  <p className="font-medium text-ink-900">{product.name}</p>
                  {product.category && (
                    <p className="mt-0.5 text-xs text-ink-400">{product.category}</p>
                  )}
                  <div className="mt-3 flex items-end justify-between">
                    <p className="font-display text-lg font-bold text-warning-600">
                      {formatCurrency(product.salePrice)}
                    </p>
                    <p className="text-xs text-ink-400">
                      {formatNumber(product.currentStock, 2)} {product.primaryUnit || 'units'}
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
              {filteredProducts.map((product, idx) => (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => addToCart(product)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-warning-50/50',
                    idx > 0 && 'border-t border-ink-100'
                  )}
                >
                  <div>
                    <p className="font-medium text-ink-900">{product.name}</p>
                    <p className="text-xs text-ink-400">
                      {product.category || 'Scrap'} · Stock:{' '}
                      {formatNumber(product.currentStock, 2)} {product.primaryUnit}
                    </p>
                  </div>
                  <p className="font-semibold text-warning-600">{formatCurrency(product.salePrice)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card className="sticky top-4 space-y-4">
            <h2 className="font-display text-lg font-semibold text-ink-900">Cart</h2>

            {cart.length === 0 ? (
              <EmptyState
                icon={Recycle}
                title="Cart is empty"
                description="Click a scrap product to add it."
              />
            ) : (
              <div className="max-h-64 space-y-3 overflow-y-auto scrollbar-thin">
                {cart.map((item) => {
                  const key = cartKey(item.productId, item.unit);
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-ink-100 bg-ink-50/50 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-ink-900">{item.productName}</p>
                          <p className="text-xs text-ink-400">
                            Cost: {formatCurrency(item.costPrice)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(key)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Input
                          label="Sale Price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.salePrice}
                          onChange={(e) =>
                            updateCartItem(key, { salePrice: e.target.value })
                          }
                        />
                        <Input
                          label="Qty"
                          type="number"
                          min="0"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartItem(key, { quantity: e.target.value })
                          }
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-ink-500">Unit:</span>
                        <div className="flex rounded-lg border border-ink-200 bg-white p-0.5">
                          {['primary', 'secondary'].map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => {
                                const newUnit = u;
                                const newKey = cartKey(item.productId, newUnit);
                                if (newKey !== key) {
                                  setCart((prev) => {
                                    const without = prev.filter(
                                      (i) => cartKey(i.productId, i.unit) !== key
                                    );
                                    const existing = without.find(
                                      (i) => cartKey(i.productId, i.unit) === newKey
                                    );
                                    if (existing) {
                                      return without.map((i) =>
                                        cartKey(i.productId, i.unit) === newKey
                                          ? {
                                              ...i,
                                              quantity:
                                                (Number(i.quantity) || 0) +
                                                (Number(item.quantity) || 0),
                                            }
                                          : i
                                      );
                                    }
                                    return [...without, { ...item, unit: newUnit }];
                                  });
                                }
                              }}
                              className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition',
                                item.unit === u
                                  ? 'bg-warning-500 text-white'
                                  : 'text-ink-600 hover:bg-ink-50'
                              )}
                            >
                              {u === 'primary'
                                ? item.primaryUnit
                                : item.secondaryUnit}
                            </button>
                          ))}
                        </div>
                        <span className="ml-auto text-sm font-semibold text-ink-800">
                          {formatCurrency(getLineTotal(item))}
                        </span>
                      </div>
                      {item.unit === 'secondary' && (
                        <p className="mt-1 text-[10px] text-ink-400">
                          1 {item.primaryUnit} = {formatNumber(item.conversionRate)}{' '}
                          {item.secondaryUnit}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <Dropdown
              label="Customer"
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
              disabled={loadingCustomers}
            />

            {!customerId && (
              <div className="space-y-2 rounded-xl border border-dashed border-warning-300 bg-warning-50/50 p-3">
                <p className="text-xs font-medium text-warning-700">
                  New / walk-in customer — enter name &amp; phone to save with this invoice
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Customer Name *"
                    placeholder="e.g. Ahmed Khan (Required)"
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
              </div>
            )}

            {selectedCustomer && (
              <div className="rounded-xl border border-ink-100 bg-ink-50/80 px-3 py-2 text-xs text-ink-600">
                Credit limit: {formatCurrency(selectedCustomer.creditLimit)} · Due:{' '}
                {formatCurrency(selectedCustomer.dueBalance)}
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-ink-700">Payment Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePaymentModeChange(value)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition',
                      paymentMode === value
                        ? 'border-warning-400 bg-warning-50 text-warning-700'
                        : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {paymentMode === 'partial' && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Cash Received"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
                <Input
                  label="Credit Amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-1 border-t border-ink-100 pt-3">
              <div className="flex justify-between text-sm text-ink-500">
                <span>Subtotal</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
              {effectiveCredit > 0 && (
                <div className="flex justify-between text-sm text-warning-600">
                  <span>Credit (Udhaar)</span>
                  <span>{formatCurrency(effectiveCredit)}</span>
                </div>
              )}
              <div className="flex justify-between font-display text-xl font-bold text-ink-900">
                <span>Total</span>
                <span>{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={checkingOut}
              disabled={cart.length === 0}
              onClick={handleCheckout}
            >
              Complete Scrap Sale
            </Button>
          </Card>
        </div>
      </div>

      <Modal
        open={creditWarningOpen}
        onClose={() => setCreditWarningOpen(false)}
        title="Credit Limit Exceeded"
        preventClose
        footer={
          <Button onClick={() => setCreditWarningOpen(false)}>Review & Fix</Button>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <p className="font-medium text-ink-900">
              {selectedCustomer?.name} cannot receive this credit amount.
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Current due: {formatCurrency(selectedCustomer?.dueBalance)} · Credit limit:{' '}
              {formatCurrency(selectedCustomer?.creditLimit)} · Requested credit:{' '}
              {formatCurrency(effectiveCredit)}
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={successOpen}
        onClose={handleSuccessClose}
        title="Scrap Sale Completed"
        size="md"
        footer={
          <div className="no-print flex flex-wrap justify-end gap-2">
            <Button variant="danger" leftIcon={X} onClick={handleSuccessClose}>
              Close &amp; New Sale (بند کریں)
            </Button>
            <Button variant="outline" leftIcon={Printer} onClick={() => window.print()}>
              Print
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
