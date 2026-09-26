import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, TrendingUp, History } from 'lucide-react';
import { ratesAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, formatDateTime, getErrorMessage } from '../utils/helpers';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

function extractList(res) {
  const body = res?.data;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.history)) return body.history;
  if (Array.isArray(body?.rates)) return body.rates;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

function extractData(res, fallback = null) {
  const body = res?.data;
  if (body?.data != null) return body.data;
  if (body?.rates != null) return body.rates;
  return body ?? fallback;
}

function normalizeTodayRates(data) {
  if (!data) return { copper: '', scrap: '', others: [] };
  const copper = data.copper ?? data.copperRate ?? data.rates?.copper ?? '';
  const scrap = data.scrap ?? data.scrapRate ?? data.rates?.scrap ?? '';
  const others = data.others ?? data.otherRates ?? data.rates?.others ?? [];
  return {
    copper: copper !== '' ? String(copper) : '',
    scrap: scrap !== '' ? String(scrap) : '',
    others: Array.isArray(others)
      ? others.map((o, i) => ({
          id: o._id || o.id || `other-${i}`,
          name: o.name || o.item || '',
          rate: o.rate != null ? String(o.rate) : '',
        }))
      : [],
  };
}

export default function Rates() {
  const toast = useToast();

  const [copperRate, setCopperRate] = useState('');
  const [scrapRate, setScrapRate] = useState('');
  const [otherRates, setOtherRates] = useState([]);

  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState([]);

  const fetchTodayRates = useCallback(async () => {
    setLoadingRates(true);
    try {
      const res = await ratesAPI.getToday();
      const data = extractData(res, {});
      const normalized = normalizeTodayRates(data);
      setCopperRate(normalized.copper);
      setScrapRate(normalized.scrap);
      setOtherRates(normalized.others);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load today\'s rates'));
    } finally {
      setLoadingRates(false);
    }
  }, [toast]);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await ratesAPI.getHistory();
      setHistory(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load rate history'));
    } finally {
      setLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTodayRates();
    fetchHistory();
  }, [fetchTodayRates, fetchHistory]);

  const addOtherItem = () => {
    setOtherRates((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: '', rate: '' },
    ]);
  };

  const updateOtherItem = (id, field, value) => {
    setOtherRates((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeOtherItem = (id) => {
    setOtherRates((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    const copper = Number(copperRate);
    const scrap = Number(scrapRate);

    if (Number.isNaN(copper) || copper < 0) {
      toast.error('Enter a valid copper rate');
      return;
    }
    if (Number.isNaN(scrap) || scrap < 0) {
      toast.error('Enter a valid scrap rate');
      return;
    }

    const others = otherRates
      .filter((o) => o.name.trim())
      .map((o) => ({
        name: o.name.trim(),
        rate: Number(o.rate) || 0,
      }));

    for (const o of others) {
      if (o.rate < 0) {
        toast.error(`Invalid rate for "${o.name}"`);
        return;
      }
    }

    setSaving(true);
    try {
      await ratesAPI.update({
        copper,
        scrap,
        copperRate: copper,
        scrapRate: scrap,
        others,
        otherRates: others,
        date: new Date().toISOString(),
      });
      toast.success('Rates saved for today');
      fetchTodayRates();
      fetchHistory();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save rates'));
    } finally {
      setSaving(false);
    }
  };

  const historyColumns = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        sortable: true,
        render: (val, row) => formatDate(val || row.createdAt || row.updatedAt),
      },
      {
        key: 'item',
        header: 'Item',
        sortable: true,
        render: (val, row) => val || row.name || row.itemName || '—',
      },
      {
        key: 'oldRate',
        header: 'Old Rate',
        sortable: true,
        render: (val) => (val != null ? formatCurrency(val) : '—'),
      },
      {
        key: 'newRate',
        header: 'New Rate',
        sortable: true,
        render: (val, row) =>
          formatCurrency(val ?? row.rate ?? row.updatedRate),
      },
      {
        key: 'updatedBy',
        header: 'Updated By',
        sortable: true,
        render: (val, row) =>
          val || row.updatedByName || row.user?.name || row.userName || '—',
      },
    ],
    []
  );

  const todayLabel = formatDate(new Date());

  return (
    <div>
      <PageHeader
        title="Rate Management"
        subtitle={`Set and track daily rates · ${todayLabel}`}
        actions={
          <Button leftIcon={Save} loading={saving} onClick={handleSave}>
            Save Today's Rates
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Today's Rates</h2>
              <p className="text-xs text-ink-400">Copper, scrap, and other item rates</p>
            </div>
          </div>

          {loadingRates ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Copper Rate (PKR)"
                type="number"
                min="0"
                step="0.01"
                value={copperRate}
                onChange={(e) => setCopperRate(e.target.value)}
                placeholder="e.g. 850.00"
              />
              <Input
                label="Scrap Rate (PKR)"
                type="number"
                min="0"
                step="0.01"
                value={scrapRate}
                onChange={(e) => setScrapRate(e.target.value)}
                placeholder="e.g. 720.00"
              />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-ink-700">Other Items</p>
                  <Button variant="soft" size="sm" leftIcon={Plus} onClick={addOtherItem}>
                    Add Item
                  </Button>
                </div>

                {otherRates.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-400">
                    No other items yet. Click "Add Item" to include more rates.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {otherRates.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Item name"
                            value={item.name}
                            onChange={(e) =>
                              updateOtherItem(item.id, 'name', e.target.value)
                            }
                          />
                        </div>
                        <div className="w-28 sm:w-36 shrink-0">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Rate"
                            value={item.rate}
                            onChange={(e) =>
                              updateOtherItem(item.id, 'rate', e.target.value)
                            }
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-danger-500 hover:bg-danger-50"
                          onClick={() => removeOtherItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                <Badge variant="brand">Copper: {copperRate ? formatCurrency(copperRate) : '—'}</Badge>
                <Badge variant="warning">Scrap: {scrapRate ? formatCurrency(scrapRate) : '—'}</Badge>
                {otherRates.filter((o) => o.name).map((o) => (
                  <Badge key={o.id} variant="outline">
                    {o.name}: {o.rate ? formatCurrency(o.rate) : '—'}
                  </Badge>
                ))}
              </div>

              <Button className="w-full sm:hidden" leftIcon={Save} loading={saving} onClick={handleSave}>
                Save Today's Rates
              </Button>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-ink-900">Quick Summary</h2>
              <p className="text-xs text-ink-400">Preview of rates being saved today</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between rounded-xl border border-brand-100 bg-brand-50/40 px-4 py-3">
              <span className="text-sm text-ink-600">Copper</span>
              <span className="font-semibold text-brand-700">
                {copperRate ? formatCurrency(copperRate) : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between rounded-xl border border-warning-100 bg-warning-50/40 px-4 py-3">
              <span className="text-sm text-ink-600">Scrap</span>
              <span className="font-semibold text-warning-700">
                {scrapRate ? formatCurrency(scrapRate) : 'Not set'}
              </span>
            </div>
            {otherRates.filter((o) => o.name).map((o) => (
              <div
                key={o.id}
                className="flex justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3"
              >
                <span className="text-sm text-ink-600">{o.name}</span>
                <span className="font-semibold text-ink-800">
                  {o.rate ? formatCurrency(o.rate) : 'Not set'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-ink-400" />
          <h2 className="font-display text-lg font-semibold text-ink-900">Rate History</h2>
        </div>
        <Table
          columns={historyColumns}
          data={history}
          loading={loadingHistory}
          searchPlaceholder="Search history..."
          searchKeys={['item', 'name', 'itemName', 'updatedBy', 'updatedByName']}
          emptyMessage="No rate changes recorded yet."
          mobileCard={(row) => (
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-ink-900">
                  {row.item || row.name || row.itemName}
                </span>
                <span className="text-xs text-ink-400">
                  {formatDate(row.date || row.createdAt)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Old → New</span>
                <span>
                  {row.oldRate != null ? formatCurrency(row.oldRate) : '—'} →{' '}
                  {formatCurrency(row.newRate ?? row.rate)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-400">Updated by</span>
                <span>{row.updatedBy || row.updatedByName || row.user?.name || '—'}</span>
              </div>
              {row.createdAt && (
                <p className="text-xs text-ink-400">{formatDateTime(row.createdAt)}</p>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
