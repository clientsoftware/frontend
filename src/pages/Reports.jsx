import { useCallback, useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Filter,
  BarChart3,
  Plus,
  Download,
  TrendingUp,
  UserCheck,
  Receipt,
} from 'lucide-react';
import { reportsAPI, salesAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import {
  formatCurrency,
  formatDate,
  getErrorMessage,
  downloadBlob,
  cn,
} from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, EmptyState, Spinner } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { DateRangePicker } from '../components/ui/DatePicker';

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'profit-loss', label: 'Profit & Loss' },
  { value: 'bill-wise-profit', label: '📊 Bill-Wise Profit & Margin %' },
  { value: 'salesman-performance', label: '👤 Salesman Performance' },
  { value: 'day-book', label: 'Day Book' },
  { value: 'stock', label: 'Stock Report' },
  { value: 'returns', label: 'Returns Report' },
];

function extractList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.rows)) return d.rows;
  return [];
}

export default function Reports() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [reportType, setReportType] = useState('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [customer, setCustomer] = useState('');
  const [category, setCategory] = useState('');
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [groupModal, setGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [savingGroup, setSavingGroup] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const res = await reportsAPI.getGroups();
      const list = extractList(res);
      setGroups(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load report groups'));
    }
  }, [toast]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const runReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'bill-wise-profit' || reportType === 'salesman-performance') {
        const salesRes = await salesAPI.getAll();
        const salesList = extractList(salesRes);

        let filteredSales = salesList.filter((inv) => {
          if (from && inv.date < from) return false;
          if (to && inv.date > to) return false;
          if (customer && !inv.customerName?.toLowerCase().includes(customer.toLowerCase())) return false;
          return true;
        });

        if (reportType === 'bill-wise-profit') {
          const mapped = filteredSales.map((inv) => {
            const totSale = Number(inv.totalAmount || inv.total || 0);
            const totCost = (inv.items || []).reduce(
              (sum, item) => sum + (Number(item.quantity || item.qty || 0) * Number(item.costPriceAtSale || item.cost || 0)),
              0
            );
            const profit = totSale - totCost;
            const margin = totSale > 0 ? (profit / totSale) * 100 : 0;
            return {
              date: inv.date || inv.createdAt,
              reference: inv.invoiceNumber || inv.number,
              party: inv.customerName || inv.partyName || 'Walk-in Customer',
              debit: totCost,
              credit: totSale,
              amount: profit,
              margin: margin.toFixed(1) + '%',
            };
          });
          setRows(mapped);
          const totalRev = mapped.reduce((s, r) => s + r.credit, 0);
          const totalProf = mapped.reduce((s, r) => s + r.amount, 0);
          setSummary({
            totalBills: mapped.length,
            totalRevenue: totalRev,
            totalProfit: totalProf,
            averageMargin: totalRev > 0 ? ((totalProf / totalRev) * 100).toFixed(1) + '%' : '0%',
          });
        } else if (reportType === 'salesman-performance') {
          const map = {};
          filteredSales.forEach((inv) => {
            const sm = inv.salesman || inv.createdBy || 'Direct / Cashier';
            if (!map[sm]) {
              map[sm] = { salesman: sm, bills: 0, revenue: 0, cost: 0 };
            }
            const totSale = Number(inv.totalAmount || inv.total || 0);
            const totCost = (inv.items || []).reduce(
              (sum, item) => sum + (Number(item.quantity || item.qty || 0) * Number(item.costPriceAtSale || item.cost || 0)),
              0
            );
            map[sm].bills += 1;
            map[sm].revenue += totSale;
            map[sm].cost += totCost;
          });

          const mapped = Object.values(map).map((sm) => {
            const profit = sm.revenue - sm.cost;
            const margin = sm.revenue > 0 ? (profit / sm.revenue) * 100 : 0;
            return {
              reference: `${sm.bills} Bills`,
              party: sm.salesman,
              debit: sm.cost,
              credit: sm.revenue,
              amount: profit,
              margin: margin.toFixed(1) + '%',
            };
          });

          setRows(mapped);
          const totalRev = mapped.reduce((s, r) => s + r.credit, 0);
          const totalProf = mapped.reduce((s, r) => s + r.amount, 0);
          setSummary({
            totalSalesmen: mapped.length,
            totalRevenue: totalRev,
            totalProfit: totalProf,
            avgProfitPerSalesman: mapped.length ? (totalProf / mapped.length).toFixed(0) : 0,
          });
        }
      } else {
        const res = await reportsAPI.get(reportType, {
          groupId: groupId || undefined,
          from: from || undefined,
          to: to || undefined,
          customer: customer || undefined,
          category: category || undefined,
        });
        const data = res.data?.data ?? res.data;
        setRows(Array.isArray(data) ? data : data?.rows || data?.items || []);
        setSummary(data?.summary || res.data?.summary || null);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load report'));
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      if (reportType === 'bill-wise-profit' || reportType === 'salesman-performance') {
        const csvHeader = ['Reference', 'Party/Salesman', 'Cost', 'Revenue', 'Profit', 'Margin %'];
        const csvRows = rows.map((r) => [r.reference, r.party, r.debit, r.credit, r.amount, r.margin]);
        const csv = [csvHeader, ...csvRows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        downloadBlob(csv, `${reportType}-report.csv`);
        toast.success('Report exported as CSV');
      } else {
        const res = await reportsAPI.export(reportType, {
          format,
          groupId: groupId || undefined,
          from: from || undefined,
          to: to || undefined,
          customer: customer || undefined,
          category: category || undefined,
        });
        const ext = format === 'excel' ? 'xlsx' : 'pdf';
        downloadBlob(res.data, `${reportType}-report.${ext}`);
        toast.success(`Exported as ${format.toUpperCase()}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(null);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setSavingGroup(true);
    try {
      await reportsAPI.createGroup(newGroup);
      toast.success('Report group created');
      setGroupModal(false);
      setNewGroup({ name: '', description: '' });
      loadGroups();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create group'));
    } finally {
      setSavingGroup(false);
    }
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => (v ? formatDate(v) : '—'),
    },
    { key: 'reference', header: 'Reference / Invoice #', sortable: true },
    { key: 'party', header: 'Party / Salesman', sortable: true },
    {
      key: 'debit',
      header: 'Cost / Debit',
      sortable: true,
      render: (v) => (v ? formatCurrency(v) : '—'),
    },
    {
      key: 'credit',
      header: 'Revenue / Credit',
      sortable: true,
      render: (v) => (v ? formatCurrency(v) : '—'),
    },
    {
      key: 'amount',
      header: 'Profit / Amount',
      sortable: true,
      render: (v, row) => (
        <span className={cn('font-bold font-mono', (v ?? 0) >= 0 ? 'text-success-700' : 'text-danger-700')}>
          {formatCurrency(v ?? row.total ?? 0)}
        </span>
      ),
    },
    {
      key: 'margin',
      header: 'Margin %',
      render: (v) => (v ? <Badge variant="success">{v}</Badge> : '—'),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Profit Loss Analysis"
        subtitle="Sales, Purchases, Bill-Wise Profit & Margin %, Salesman Performance and Stock Reports"
        actions={
          <Button leftIcon={Plus} variant="soft" onClick={() => setGroupModal(true)}>
            New Group
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Filter className="h-4 w-4 text-brand-600" />
          Report Configuration &amp; Filters
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <Select
            label="Report Group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="All groups"
            options={groups.map((g) => ({
              value: g._id || g.id,
              label: g.name,
            }))}
          />
          <Select
            label="Report Type"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={REPORT_TYPES}
          />
          <Input
            label="Customer / Salesman Search"
            placeholder="Filter name..."
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
          <Input
            label="Category"
            placeholder="e.g. Electrical, Copper"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="mt-4">
          <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button leftIcon={BarChart3} onClick={runReport} loading={loading}>
            Generate Report
          </Button>
          <Button
            variant="outline"
            leftIcon={FileSpreadsheet}
            loading={exporting === 'excel'}
            onClick={() => handleExport('excel')}
          >
            Export Excel / CSV
          </Button>
          <Button
            variant="outline"
            leftIcon={FileText}
            loading={exporting === 'pdf'}
            onClick={() => handleExport('pdf')}
          >
            Export PDF
          </Button>
        </div>
      </Card>

      {summary && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(summary).map(([key, val]) => (
            <Card key={key} className="!p-4 bg-white shadow-sm border-brand-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                {key.replace(/([A-Z])/g, ' $1')}
              </p>
              <p className="mt-1 font-display text-xl font-bold text-brand-900">
                {typeof val === 'number' ? formatCurrency(val) : String(val)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : rows.length === 0 ? (
        <Card padding={false}>
          <EmptyState
            icon={Download}
            title="No report data generated"
            description="Select a report type and date range, then click Generate Report."
          />
        </Card>
      ) : (
        <Table
          columns={columns}
          data={rows}
          searchPlaceholder="Search report rows..."
          emptyMessage="No rows in this report"
        />
      )}

      <Modal
        open={groupModal}
        onClose={() => setGroupModal(false)}
        title="Create Report Group"
        footer={
          <>
            <Button variant="outline" onClick={() => setGroupModal(false)}>
              Cancel
            </Button>
            <Button loading={savingGroup} onClick={createGroup}>
              Create Group
            </Button>
          </>
        }
      >
        <form onSubmit={createGroup} className="space-y-4">
          <Input
            label="Group Name"
            required
            placeholder="e.g. Scrap Sales, Copper Sales"
            value={newGroup.name}
            onChange={(e) => setNewGroup((g) => ({ ...g, name: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Optional description"
            value={newGroup.description}
            onChange={(e) => setNewGroup((g) => ({ ...g, description: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}
