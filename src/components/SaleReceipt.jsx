import { formatCurrency, formatDateTime, cn } from '../utils/helpers';

/**
 * Print-ready sale receipt. Use with window.print() and .print-receipt CSS.
 */
export default function SaleReceipt({
  sale,
  businessName = 'Electric Shop Trading',
  className,
}) {
  if (!sale) return null;

  const items = sale.items || [];
  const invoiceNo = sale.invoiceNumber || sale.invoiceNo || sale._id || '—';
  const total = sale.totalAmount ?? sale.total ?? 0;
  const paid = sale.amountPaid ?? sale.paidAmount ?? 0;
  const due = sale.dueAmount ?? sale.creditAmount ?? 0;

  return (
    <div id="print-receipt" className={cn('print-receipt mx-auto max-w-md bg-white text-ink-900', className)}>
      <div className="border-b border-dashed border-ink-300 pb-4 text-center">
        <h2 className="font-display text-xl font-bold tracking-tight">{businessName}</h2>
        <div className="mt-1 flex items-center justify-center gap-2">
          <span className="rounded bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800 uppercase tracking-wider">
            ESTIMATE BILL
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-500">Sale Receipt / Estimate Bill</p>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-ink-500">Invoice</span>
          <span className="font-semibold">{invoiceNo}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink-500">Date</span>
          <span>{formatDateTime(sale.date || sale.createdAt || new Date())}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink-500">Customer</span>
          <span className="font-medium">{sale.customerName || 'Walk-in Customer'}</span>
        </div>
        {sale.customerPhone && (
          <div className="flex justify-between gap-4">
            <span className="text-ink-500">Phone</span>
            <span>{sale.customerPhone}</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-ink-500">Payment</span>
          <span className="capitalize">{sale.paymentMode || '—'}</span>
        </div>
      </div>

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-y border-ink-200 text-xs uppercase tracking-wide text-ink-500">
            <th className="py-2 pr-2 font-semibold">Item</th>
            <th className="py-2 px-1 text-right font-semibold">Qty</th>
            <th className="py-2 px-1 text-right font-semibold">Rate</th>
            <th className="py-2 pl-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const qty = Number(item.quantity) || 0;
            const rate = Number(item.unitPriceCharged ?? item.salePrice ?? item.price) || 0;
            const line = item.lineTotal != null ? Number(item.lineTotal) : qty * rate;
            return (
              <tr key={i} className="border-b border-ink-100">
                <td className="py-2 pr-2">
                  <p className="font-medium">{item.productName || 'Item'}</p>
                  {item.unitUsed && (
                    <p className="text-[10px] capitalize text-ink-400">{item.unitUsed} unit</p>
                  )}
                </td>
                <td className="py-2 px-1 text-right">{qty}</td>
                <td className="py-2 px-1 text-right whitespace-nowrap">{formatCurrency(rate)}</td>
                <td className="py-2 pl-1 text-right font-medium whitespace-nowrap">
                  {formatCurrency(line)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 border-t border-dashed border-ink-300 pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-500">Paid</span>
          <span>{formatCurrency(paid)}</span>
        </div>
        {due > 0 && (
          <div className="flex justify-between text-warning-600">
            <span>Due (Udhaar)</span>
            <span>{formatCurrency(due)}</span>
          </div>
        )}
        <div className="flex justify-between font-display text-lg font-bold">
          <span>Total (PKR)</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="mt-6 border-t border-ink-100 pt-3 text-center">
        <p className="text-[11px] text-ink-400">
          Thank you for your business · All amounts in Pakistani Rupees (PKR)
        </p>
        <p className="mt-1 text-[10px] font-semibold text-brand-700">
          Developed by Tech Wave Software House | 03217165022
        </p>
      </div>
    </div>
  );
}
