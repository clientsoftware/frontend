import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, PackageX, CheckCircle2, ArrowRight } from 'lucide-react';
import { productsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber, getErrorMessage } from '../utils/helpers';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export default function MinusStock() {
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll();
      const list = Array.isArray(res) ? res : res?.data || [];
      setProducts(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter items with negative stock count
  const negativeStockItems = useMemo(() => {
    return products.filter((p) => {
      const stock = Number(p.stockInSecondaryUnit || p.stock || 0);
      return stock < 0;
    });
  }, [products]);

  const totalNegativeQty = negativeStockItems.reduce(
    (sum, p) => sum + Math.abs(Number(p.stockInSecondaryUnit || p.stock || 0)),
    0
  );

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
        title="Minus Stock Warning (منفی اسٹاک والی اشیاء)"
        subtitle="Oversold items with negative stock inventory requiring immediate restock or purchase entry"
      />

      {negativeStockItems.length === 0 ? (
        <Card className="py-12 text-center space-y-3 border-success-200 bg-success-50/30">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-success-100 text-success-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-success-900">All Inventory Stock Levels Are Healthy!</h3>
          <p className="text-xs text-success-700 max-w-sm mx-auto">
            No items have negative stock counts in your inventory database.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="bg-gradient-to-br from-danger-600 to-danger-800 text-white space-y-1">
              <p className="text-xs text-danger-100 uppercase tracking-wider font-semibold">Total Oversold Items</p>
              <p className="font-display text-3xl font-bold">{negativeStockItems.length}</p>
            </Card>

            <Card className="bg-gradient-to-br from-amber-600 to-amber-800 text-white space-y-1">
              <p className="text-xs text-amber-100 uppercase tracking-wider font-semibold">Total Stock Shortfall Qty</p>
              <p className="font-display text-3xl font-bold">-{formatNumber(totalNegativeQty)}</p>
            </Card>
          </div>

          <Card className="space-y-4 border-danger-200">
            <div className="flex items-center gap-2 text-danger-700 font-bold border-b border-danger-100 pb-3 text-sm">
              <AlertTriangle className="h-5 w-5" />
              Negative Stock Items List ({negativeStockItems.length})
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                  <tr>
                    <th className="py-2.5">Product Name</th>
                    <th className="py-2.5">Category</th>
                    <th className="py-2.5 text-right">Purchase Price</th>
                    <th className="py-2.5 text-right">Sale Price</th>
                    <th className="py-2.5 text-right text-danger-700 font-bold">Current Stock</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {negativeStockItems.map((p) => {
                    const st = Number(p.stockInSecondaryUnit || p.stock || 0);
                    return (
                      <tr key={p._id} className="bg-danger-50/20">
                        <td className="py-3 font-bold text-ink-900">{p.name}</td>
                        <td className="py-3 text-ink-600">{p.category || '-'}</td>
                        <td className="py-3 text-right font-mono">Rs {formatCurrency(p.costPrice || 0)}</td>
                        <td className="py-3 text-right font-mono">Rs {formatCurrency(p.salePrice || 0)}</td>
                        <td className="py-3 text-right font-mono font-bold text-danger-700 text-sm">
                          {st} {p.primaryUnit || 'Pcs'}
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            rightIcon={ArrowRight}
                            onClick={() => navigate('/products')}
                          >
                            Update Stock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
