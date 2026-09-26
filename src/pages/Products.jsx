import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  PackagePlus,
  PackageMinus,
  MoreHorizontal,
  Barcode,
} from 'lucide-react';
import { productsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber, getErrorMessage } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { Input, Select, Textarea } from '../components/ui/Input';
import { PageHeader } from '../components/ui/Card';

const emptyProduct = {
  name: '',
  barcode: '',
  category: '',
  primaryUnit: 'kg',
  secondaryUnit: 'g',
  conversionRate: 1000,
  costPrice: '',
  salePrice: '',
  currentStock: '',
  lowStockThreshold: 10,
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

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockForm, setStockForm] = useState({ type: 'add', quantity: '', reason: '' });
  const [adjustingStock, setAdjustingStock] = useState(false);

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

  const secondaryStock = useMemo(() => {
    const stock = Number(productForm.currentStock) || 0;
    const rate = Number(productForm.conversionRate) || 0;
    return stock * rate;
  }, [productForm.currentStock, productForm.conversionRate]);

  const openAddModal = () => {
    setEditingProduct(null);
    setProductForm(emptyProduct);
    setProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      barcode: product.barcode || '',
      category: product.category || '',
      primaryUnit: product.primaryUnit || 'kg',
      secondaryUnit: product.secondaryUnit || 'g',
      conversionRate: product.conversionRate ?? 1000,
      costPrice: product.costPrice ?? '',
      salePrice: product.salePrice ?? '',
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

  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      barcode: productForm.barcode.trim(),
      category: productForm.category.trim(),
      primaryUnit: productForm.primaryUnit.trim() || 'kg',
      secondaryUnit: productForm.secondaryUnit.trim() || 'g',
      conversionRate: Number(productForm.conversionRate) || 1,
      costPrice: Number(productForm.costPrice) || 0,
      salePrice: Number(productForm.salePrice) || 0,
      currentStock: Number(productForm.currentStock) || 0,
      lowStockThreshold: Number(productForm.lowStockThreshold) || 10,
    };

    setSavingProduct(true);
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct._id, payload);
        toast.success('Product updated');
      } else {
        await productsAPI.create(payload);
        toast.success('Product created');
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
    if (!qty || qty <= 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (!stockForm.reason.trim()) {
      toast.error('Please provide a reason for adjustment');
      return;
    }

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

  const columns = [
    {
      key: 'name',
      header: 'Product',
      sortable: true,
      render: (_, row) => (
        <div>
          <p className="font-medium text-ink-900">{row.name}</p>
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
          {formatNumber(row.currentStock, 2)} {row.primaryUnit || 'units'}
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
      className: 'w-28 text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
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
        title="Products"
        subtitle="Manage inventory, pricing, barcodes, and stock levels"
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
        searchPlaceholder="Search products by name, category, or barcode..."
        searchKeys={['name', 'category', 'barcode']}
        emptyMessage="No products found. Add your first product to get started."
        toolbar={
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={categoryOptions}
            className="w-44"
          />
        }
        mobileCard={(row) => (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink-900">{row.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-ink-400">{row.category || 'Uncategorized'}</p>
                  {row.barcode && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-600 bg-ink-100 px-1.5 py-0.5 rounded">
                      <Barcode className="h-3 w-3" /> {row.barcode}
                    </span>
                  )}
                </div>
              </div>
              {getStockStatus(row) === 'low' ? (
                <Badge variant="warning" dot>
                  Low Stock
                </Badge>
              ) : (
                <Badge variant="success" dot>
                  In Stock
                </Badge>
              )}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-400">Stock</span>
              <span className="font-medium">
                {formatNumber(row.currentStock, 2)} {row.primaryUnit}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-400">Sale Price</span>
              <span className="font-medium">{formatCurrency(row.salePrice)}</span>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditModal(row)}>
                Edit
              </Button>
              <Button size="sm" variant="soft" className="flex-1" onClick={() => openStockModal(row)}>
                Stock
              </Button>
            </div>
          </div>
        )}
      />

      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
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
              label="Product Name"
              name="name"
              value={productForm.name}
              onChange={handleProductFormChange}
              placeholder="e.g. Copper Wire 2.5mm"
              required
              className="sm:col-span-2"
            />
            
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
              placeholder="e.g. Copper Wire"
              list="product-categories"
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Input
              label="Primary Unit"
              name="primaryUnit"
              value={productForm.primaryUnit}
              onChange={handleProductFormChange}
              placeholder="kg"
            />
            <Input
              label="Secondary Unit"
              name="secondaryUnit"
              value={productForm.secondaryUnit}
              onChange={handleProductFormChange}
              placeholder="g"
            />
            <Input
              label="Conversion Rate"
              name="conversionRate"
              type="number"
              min="0"
              step="any"
              value={productForm.conversionRate}
              onChange={handleProductFormChange}
              hint={`1 ${productForm.primaryUnit || 'primary'} = ${productForm.conversionRate || 0} ${productForm.secondaryUnit || 'secondary'}`}
            />
            <Input
              label="Low Stock Threshold"
              name="lowStockThreshold"
              type="number"
              min="0"
              value={productForm.lowStockThreshold}
              onChange={handleProductFormChange}
            />
            <Input
              label="Cost Price (PKR)"
              name="costPrice"
              type="number"
              min="0"
              step="0.01"
              value={productForm.costPrice}
              onChange={handleProductFormChange}
            />
            <Input
              label="Sale Price (PKR)"
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              value={productForm.salePrice}
              onChange={handleProductFormChange}
            />
            <Input
              label={`Current Stock (${productForm.primaryUnit || 'primary'})`}
              name="currentStock"
              type="number"
              min="0"
              step="any"
              value={productForm.currentStock}
              onChange={handleProductFormChange}
              hint={
                productForm.conversionRate
                  ? `Secondary stock: ${formatNumber(secondaryStock, 2)} ${productForm.secondaryUnit || 'units'}`
                  : undefined
              }
            />
          </div>
        </form>
      </Modal>

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
                Current: {formatNumber(stockProduct.currentStock, 2)}{' '}
                {stockProduct.primaryUnit || 'units'}
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
              placeholder="e.g. New shipment received, damaged goods, stock count correction"
              required
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
