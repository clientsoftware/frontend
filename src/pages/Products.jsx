import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  Plus,
  Pencil,
  PackagePlus,
  PackageMinus,
  MoreHorizontal,
  Barcode,
  Printer,
  Sparkles,
} from 'lucide-react';
import { productsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber, getErrorMessage } from '../utils/helpers';
import { translateToUrduOnline } from '../utils/urduHelper';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/Card';

const emptyProduct = {
  name: '',
  nameUrdu: '',
  code: '',
  barcode: '',
  category: '',
  group: '',
  primaryUnit: 'Pcs',
  secondaryUnit: '',
  conversionRate: 1,
  altUnit: '',
  altUnitFactor: '',
  altUnitPrice: '',
  costPrice: '',
  salePrice: '',
  wholesalePrice: '',
  currentStock: '',
  lowStockThreshold: 10,
};

const BARCODE_LABEL_SIZES = {
  a4: { label: 'Sheet printer (A4/Letter, multiple per page)', width: 48, height: null, barcodeHeight: 34, scale: 1 },
  '25x15': { label: '25mm x 15mm', width: 25, height: 15, barcodeHeight: 16, scale: 0.62 },
  '40x30': { label: '40mm x 30mm', width: 40, height: 30, barcodeHeight: 26, scale: 0.85 },
  '50x25': { label: '50mm x 25mm', width: 50, height: 25, barcodeHeight: 22, scale: 0.85 },
  '58x40': { label: '58mm x 40mm (thermal roll)', width: 58, height: 40, barcodeHeight: 32, scale: 1 },
};

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function getStockStatus(product) {
  const stock = Number(product.currentStock) || 0;
  const threshold = Number(product.lowStockThreshold) ?? 10;
  return stock <= threshold ? 'low' : 'ok';
}

export default function Products() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [savingProduct, setSavingProduct] = useState(false);
  const [translatingUrdu, setTranslatingUrdu] = useState(false);

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState({ type: 'add', quantity: '', reason: '' });
  const [adjustingStock, setAdjustingStock] = useState(false);

  // Barcode Printer Modal
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeItem, setBarcodeItem] = useState(null);
  const [labelSize, setLabelSize] = useState('a4');
  const [printQty, setPrintQty] = useState('1');

  const translateTimer = useRef(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = categoryFilter ? { category: categoryFilter } : undefined;
      const res = await productsAPI.getAll(params);
      setProducts(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return [...set].sort();
  }, [products]);

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))],
    [categories]
  );

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      nameUrdu: product.nameUrdu || '',
      code: product.code || '',
      barcode: product.barcode || '',
      category: product.category || '',
      group: product.group || '',
      primaryUnit: product.primaryUnit || 'Pcs',
      secondaryUnit: product.secondaryUnit || '',
      conversionRate: product.conversionRate ?? 1,
      altUnit: product.altUnit || '',
      altUnitFactor: product.altUnitFactor ?? '',
      altUnitPrice: product.altUnitPrice ?? '',
      costPrice: product.costPrice ?? '',
      salePrice: product.salePrice ?? '',
      wholesalePrice: product.wholesalePrice ?? '',
      currentStock: product.currentStock ?? '',
      lowStockThreshold: product.lowStockThreshold ?? 10,
    });
    setProductModalOpen(true);
  };

  const openStockModal = (product) => {
    setStockProduct(product);
    setStockForm({ type: 'add', quantity: '', reason: '' });
    setStockModalOpen(true);
  };

  const handleProductNameChange = (e) => {
    const val = e.target.value;
    setProductForm((prev) => ({ ...prev, name: val }));

    if (translateTimer.current) clearTimeout(translateTimer.current);
    if (!val.trim()) {
      setProductForm((prev) => ({ ...prev, nameUrdu: '' }));
      return;
    }

    translateTimer.current = setTimeout(async () => {
      setTranslatingUrdu(true);
      const res = await translateToUrduOnline(val);
      setTranslatingUrdu(false);
      setProductForm((prev) => (prev.name === val ? { ...prev, nameUrdu: res } : prev));
    }, 400);
  };

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    if (!productForm.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      nameUrdu: productForm.nameUrdu.trim(),
      code: productForm.code.trim(),
      barcode: productForm.barcode.trim(),
      category: productForm.category.trim() || 'General',
      group: productForm.group.trim(),
      primaryUnit: productForm.primaryUnit.trim() || 'Pcs',
      secondaryUnit: productForm.secondaryUnit.trim(),
      conversionRate: Number(productForm.conversionRate) || 1,
      altUnit: productForm.altUnit.trim(),
      altUnitFactor: Number(productForm.altUnitFactor) || 0,
      altUnitPrice: Number(productForm.altUnitPrice) || 0,
      costPrice: Number(productForm.costPrice) || 0,
      salePrice: Number(productForm.salePrice) || 0,
      wholesalePrice: Number(productForm.wholesalePrice) || 0,
      currentStock: Number(productForm.currentStock) || 0,
      lowStockThreshold: Number(productForm.lowStockThreshold) || 10,
    };

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, payload);
        toast.success('Product updated successfully');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created successfully');
      }
      setProductModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save product'));
    } finally {
      setSavingProduct(false);
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    const qty = Number(stockForm.quantity);
    if (!qty || qty <= 0) return toast.error('Enter a valid quantity');
    if (!stockForm.reason.trim()) return toast.error('Please provide a reason');

    setAdjustingStock(true);
    try {
      await productsAPI.adjustStock(stockProduct._id, {
        type: stockForm.type,
        quantity: qty,
        reason: stockForm.reason.trim(),
      });
      toast.success('Stock adjusted successfully');
      setStockModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to adjust stock'));
    } finally {
      setAdjustingStock(false);
    }
  };

  const handlePrintBarcodes = () => {
    if (!barcodeItem) return;
    const count = Math.max(1, Number(printQty) || 1);
    const sz = BARCODE_LABEL_SIZES[labelSize] || BARCODE_LABEL_SIZES.a4;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcodes - ${barcodeItem.name}</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/JsBarcode/3.11.5/JsBarcode.all.min.js"></script>
        <style>
          @page { size: auto; margin: ${sz.height ? '3mm' : '6mm'}; }
          body { font-family: Arial, sans-serif; display: flex; flex-wrap: wrap; gap: ${sz.height ? '2mm' : '6mm'}; margin: 0; padding: 10px; }
          .label { width: ${sz.width}mm; ${sz.height ? `height: ${sz.height}mm; overflow: hidden;` : ''} padding: 4px; border: 1px dashed #666; text-align: center; page-break-inside: avoid; border-radius: 4px; }
          .biz { font-size: ${Math.round(10 * sz.scale)}px; color: #444; }
          .nm { font-size: ${Math.round(12 * sz.scale)}px; font-weight: bold; margin: 1px 0; word-break: break-word; line-height: 1.15; }
          svg { max-width: 100%; height: ${sz.barcodeHeight}px; }
          .code { font-size: ${Math.round(11 * sz.scale)}px; font-family: monospace; }
          .price { font-size: ${Math.round(13 * sz.scale)}px; font-weight: bold; margin-top: 1px; color: #111; }
        </style>
      </head>
      <body>
        ${Array.from({ length: count })
          .map(
            (_, idx) => `
          <div class="label">
            <div class="biz">Electric Shop</div>
            <div class="nm">${barcodeItem.name} ${barcodeItem.nameUrdu ? `(${barcodeItem.nameUrdu})` : ''}</div>
            <svg id="bc-svg-${idx}"></svg>
            <div class="price">Rs ${formatCurrency(barcodeItem.salePrice)}</div>
          </div>
        `
          )
          .join('')}
        <script>
          window.onload = function() {
            const codeVal = "${(barcodeItem.barcode || barcodeItem.code || String(barcodeItem._id)).replace(/'/g, '')}";
            for(let i=0; i<${count}; i++) {
              try {
                JsBarcode('#bc-svg-' + i, codeVal, { format: 'CODE128', width: 1.4, height: ${sz.barcodeHeight}, fontSize: 10, margin: 0 });
              } catch(e) {}
            }
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `;

    const win = window.open('', 'PRINT_BARCODES', 'width=800,height=600');
    win.document.write(html);
    win.document.close();
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-bold text-ink-900">{row.name}</p>
          {row.nameUrdu && <p className="text-xs text-brand-700 font-semibold">{row.nameUrdu}</p>}
          <div className="flex items-center gap-2 mt-0.5">
            {row.category && <p className="text-xs text-ink-400">{row.category}</p>}
            {row.barcode && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-600 bg-ink-100 px-1.5 py-0.5 rounded">
                <Barcode className="h-3 w-3 text-ink-500" />
                {row.barcode}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'currentStock',
      header: 'Stock',
      sortable: true,
      render: (_, row) => (
        <span>
          {formatNumber(row.currentStock, 2)} {row.primaryUnit || 'Pcs'}
        </span>
      ),
    },
    {
      key: 'salePrice',
      header: 'Sale Price',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'costPrice',
      header: 'Cost Price',
      sortable: true,
      render: (val) => formatCurrency(val),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const status = getStockStatus(row);
        return status === 'low' ? (
          <Badge variant="warning" dot>
            Low Stock
          </Badge>
        ) : (
          <Badge variant="success" dot>
            In Stock
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-36 text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setBarcodeItem(row);
              setBarcodeModalOpen(true);
            }}
            title="Print Barcode Labels"
          >
            <Printer className="h-4 w-4 text-brand-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            title="Edit product"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              openStockModal(row);
            }}
            title="Adjust stock"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products & Inventory (سامان اور اسٹاک)"
        subtitle="Manage inventory, auto-Urdu translation, secondary units, pricing, and barcode label printing"
        actions={
          <Button leftIcon={Plus} onClick={openAddModal}>
            Add Product
          </Button>
        }
      />

      <Table
        columns={columns}
        data={products}
        loading={loading}
        searchPlaceholder="Search products by name, Urdu name, category, or barcode..."
        searchKeys={['name', 'nameUrdu', 'category', 'barcode']}
        emptyMessage="No products found. Add your first product to get started."
        toolbar={
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={categoryOptions}
            className="w-44"
          />
        }
      />

      {/* Add / Edit Product Modal */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingProduct} onClick={handleSaveProduct}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Product Name (English / Roman) *"
              name="name"
              value={productForm.name}
              onChange={handleProductNameChange}
              placeholder="e.g. Sunflower Oil 5L / Copper Wire"
              required
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                  Urdu Name (خود بخود لکھا جائے گا)
                </label>
                {translatingUrdu && <span className="text-[10px] text-brand-600 italic">Translating...</span>}
              </div>
              <Input
                name="nameUrdu"
                value={productForm.nameUrdu}
                onChange={handleProductFormChange}
                placeholder="یہاں خود بخود آ جائے گا یا ٹائپ کریں"
                className="text-right font-serif text-base"
              />
            </div>

            {/* Barcode Field with Auto-Generate */}
            <div className="sm:col-span-2 rounded-xl border border-ink-200 bg-ink-50/50 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-700 flex items-center gap-1.5">
                  <Barcode className="h-4 w-4 text-brand-600" />
                  Barcode / SKU (بارکوڈ)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const generated = '890' + Math.floor(100000000 + Math.random() * 900000000);
                    setProductForm((prev) => ({ ...prev, barcode: String(generated) }));
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-800 hover:underline"
                >
                  ⚡ Auto-Generate Unique Barcode
                </button>
              </div>
              <Input
                name="barcode"
                value={productForm.barcode}
                onChange={handleProductFormChange}
                placeholder="Scan with barcode scanner or enter code (e.g. 890123456789)..."
              />
            </div>

            <Input
              label="Category"
              name="category"
              value={productForm.category}
              onChange={handleProductFormChange}
              placeholder="e.g. Electrical / Groceries"
              list="product-categories"
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <Input
              label="Primary Unit *"
              name="primaryUnit"
              value={productForm.primaryUnit}
              onChange={handleProductFormChange}
              placeholder="Pcs / Kg / Box / Meter"
              required
            />

            <Input
              label="Cost Price (PKR) *"
              name="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={productForm.costPrice}
              onChange={handleProductFormChange}
              required
            />

            <Input
              label="Sale Price (PKR) *"
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              value={productForm.salePrice}
              onChange={handleProductFormChange}
              required
            />

            <Input
              label="Wholesale Price (Optional)"
              name="wholesalePrice"
              type="number"
              min="0"
              step="0.01"
              value={productForm.wholesalePrice}
              onChange={handleProductFormChange}
              placeholder="Optional wholesale rate"
            />

            <Input
              label="Current Stock Quantity"
              name="currentStock"
              type="number"
              min="0"
              step="any"
              value={productForm.currentStock}
              onChange={handleProductFormChange}
            />

            <Input
              label="Low Stock Threshold Alert"
              name="lowStockThreshold"
              type="number"
              min="0"
              value={productForm.lowStockThreshold}
              onChange={handleProductFormChange}
            />

            {/* Secondary Unit & Conversion Factor */}
            <div className="sm:col-span-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 space-y-3">
              <p className="text-xs font-bold text-brand-900">Secondary / Alt Unit Conversion (Optional)</p>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Secondary Unit"
                  name="altUnit"
                  placeholder="e.g. Dozen / Pcs"
                  value={productForm.altUnit}
                  onChange={handleProductFormChange}
                />
                <Input
                  label="1 Primary = Units"
                  name="altUnitFactor"
                  type="number"
                  placeholder="12"
                  value={productForm.altUnitFactor}
                  onChange={handleProductFormChange}
                />
                <Input
                  label="Secondary Unit Price"
                  name="altUnitPrice"
                  type="number"
                  placeholder="Price per sec. unit"
                  value={productForm.altUnitPrice}
                  onChange={handleProductFormChange}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Barcode Printer Modal */}
      <Modal
        open={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        title="Print Barcode Labels"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setBarcodeModalOpen(false)}>
              Cancel
            </Button>
            <Button leftIcon={Printer} onClick={handlePrintBarcodes}>
              Print Labels
            </Button>
          </>
        }
      >
        {barcodeItem && (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-ink-200 bg-ink-50 p-3">
              <p className="font-bold text-ink-900">{barcodeItem.name}</p>
              <p className="text-xs text-ink-500 font-mono">Barcode: {barcodeItem.barcode || 'N/A'}</p>
              <p className="text-xs font-bold text-brand-700 mt-1">Price: Rs {formatCurrency(barcodeItem.salePrice)}</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Select Label Printer Size</label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value)}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              >
                {Object.entries(BARCODE_LABEL_SIZES).map(([key, sz]) => (
                  <option key={key} value={key}>
                    {sz.label}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Number of Labels to Print"
              type="number"
              min="1"
              max="500"
              value={printQty}
              onChange={(e) => setPrintQty(e.target.value)}
            />
          </div>
        )}
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        title="Adjust Stock"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setStockModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={adjustingStock} onClick={handleAdjustStock}>
              Apply Adjustment
            </Button>
          </>
        }
      >
        {stockProduct && (
          <form onSubmit={handleAdjustStock} className="space-y-4">
            <div className="rounded-xl border border-ink-100 bg-ink-50/80 px-4 py-3">
              <p className="font-medium text-ink-900">{stockProduct.name}</p>
              <p className="mt-1 text-sm text-ink-500">
                Current: {formatNumber(stockProduct.currentStock, 2)} {stockProduct.primaryUnit || 'units'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={stockForm.type === 'add' ? 'success' : 'outline'}
                leftIcon={PackagePlus}
                onClick={() => setStockForm((prev) => ({ ...prev, type: 'add' }))}
              >
                Add Stock
              </Button>
              <Button
                type="button"
                variant={stockForm.type === 'remove' ? 'danger' : 'outline'}
                leftIcon={PackageMinus}
                onClick={() => setStockForm((prev) => ({ ...prev, type: 'remove' }))}
              >
                Remove Stock
              </Button>
            </div>

            <Input
              label={`Quantity (${stockProduct.primaryUnit || 'units'})`}
              name="quantity"
              type="number"
              min="0"
              step="any"
              value={stockForm.quantity}
              onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))}
              required
            />

            <Textarea
              label="Reason"
              name="reason"
              value={stockForm.reason}
              onChange={(e) => setStockForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. New shipment received, stock count correction"
              required
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
