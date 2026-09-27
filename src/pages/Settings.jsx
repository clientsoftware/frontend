import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  FileText,
  Ruler,
  Tags,
  Users,
  Plus,
  Trash2,
  Save,
  Palette,
  Printer,
} from 'lucide-react';
import { settingsAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { getErrorMessage, cn } from '../utils/helpers';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import { Input, Textarea, Select } from '../components/ui/Input';

const TABS = [
  { id: 'business', label: 'Business Profile', icon: Building2 },
  { id: 'invoice', label: 'Invoice & Print Settings', icon: FileText },
  { id: 'theme', label: 'App Themes', icon: Palette },
  { id: 'units', label: 'Units', icon: Ruler },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'users', label: 'Staff / Users', icon: Users },
];

const THEME_OPTIONS = [
  { id: 'blue', label: 'Professional Blue', color: '#2563eb' },
  { id: 'dark', label: 'Dark Mode', color: '#1e293b' },
  { id: 'green', label: 'Business Green', color: '#059669' },
  { id: 'purple', label: 'Modern Purple', color: '#7c3aed' },
  { id: 'maroon', label: 'Classic Maroon', color: '#991b1b' },
  { id: 'teal', label: 'Fresh Teal', color: '#0d9488' },
];

function extractList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.units)) return d.units;
  if (Array.isArray(d?.categories)) return d.categories;
  if (Array.isArray(d?.users)) return d.users;
  return [];
}

export default function Settings() {
  const toast = useToast();
  const [tab, setTab] = useState('business');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [business, setBusiness] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    city: '',
    colorTheme: 'blue',
    printFormat: 'regular',
    thermalWidth: '80',
    saleInvoiceLabel: 'Sale Invoice',
  });

  const [invoice, setInvoice] = useState({
    prefix: 'INV',
    footerNote: '',
    showLogo: true,
    terms: '',
  });

  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

  const [unitModal, setUnitModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [userModal, setUserModal] = useState(false);
  const [unitName, setUnitName] = useState('');
  const [catName, setCatName] = useState('');
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [b, inv, u, c, us] = await Promise.allSettled([
        settingsAPI.getBusiness(),
        settingsAPI.getInvoiceTemplate(),
        settingsAPI.getUnits(),
        settingsAPI.getCategories(),
        settingsAPI.getUsers(),
      ]);
      if (b.status === 'fulfilled') {
        const data = b.value.data?.data || b.value.data || {};
        setBusiness((prev) => ({ ...prev, ...data }));
      }
      if (inv.status === 'fulfilled') {
        const data = inv.value.data?.data || inv.value.data || {};
        setInvoice((prev) => ({ ...prev, ...data }));
      }
      if (u.status === 'fulfilled') setUnits(extractList(u.value));
      if (c.status === 'fulfilled') setCategories(extractList(c.value));
      if (us.status === 'fulfilled') setUsers(extractList(us.value));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load settings'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveBusiness = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateBusiness(business);
      toast.success('Business profile & print settings saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveInvoice = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateInvoiceTemplate(invoice);
      toast.success('Invoice template saved');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const addUnit = async (e) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    try {
      await settingsAPI.createUnit({ name: unitName.trim() });
      toast.success('Unit added');
      setUnitModal(false);
      setUnitName('');
      const res = await settingsAPI.getUnits();
      setUnits(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeUnit = async (id) => {
    try {
      await settingsAPI.deleteUnit(id);
      setUnits((prev) => prev.filter((u) => (u._id || u.id) !== id));
      toast.success('Unit removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await settingsAPI.createCategory({ name: catName.trim() });
      toast.success('Category added');
      setCatModal(false);
      setCatName('');
      const res = await settingsAPI.getCategories();
      setCategories(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeCategory = async (id) => {
    try {
      await settingsAPI.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => (c._id || c.id) !== id));
      toast.success('Category removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await settingsAPI.createUser(userForm);
      toast.success('User created');
      setUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'staff' });
      const res = await settingsAPI.getUsers();
      setUsers(extractList(res));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const removeUser = async (id) => {
    try {
      await settingsAPI.deleteUser(id);
      setUsers((prev) => prev.filter((u) => (u._id || u.id) !== id));
      toast.success('User removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Business profile, print templates, app color themes &amp; staff" />

      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-ink-200 bg-white p-1 scrollbar-thin">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-500 hover:bg-ink-50 hover:text-ink-800'
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'business' && (
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-ink-900">Business Profile</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Business Name"
              value={business.name || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))}
            />
            <Input
              label="Phone"
              value={business.phone || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))}
            />
            <Input
              label="Email"
              type="email"
              value={business.email || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, email: e.target.value }))}
            />
            <Input
              label="GSTIN / NTN"
              value={business.gstin || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, gstin: e.target.value }))}
            />
            <Input
              label="City"
              value={business.city || ''}
              onChange={(e) => setBusiness((b) => ({ ...b, city: e.target.value }))}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Address"
                value={business.address || ''}
                onChange={(e) => setBusiness((b) => ({ ...b, address: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5">
            <Button leftIcon={Save} loading={saving} onClick={saveBusiness}>
              Save Profile
            </Button>
          </div>
        </Card>
      )}

      {tab === 'invoice' && (
        <Card className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink-900">Invoice &amp; Printing Format</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Invoice Prefix"
              value={invoice.prefix || ''}
              onChange={(e) => setInvoice((i) => ({ ...i, prefix: e.target.value }))}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Sale Invoice Title Label</label>
              <select
                value={business.saleInvoiceLabel || 'Sale Invoice'}
                onChange={(e) => setBusiness((b) => ({ ...b, saleInvoiceLabel: e.target.value }))}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400"
              >
                <option value="Sale Invoice">Sale Invoice</option>
                <option value="Estimate Invoice">Estimate Invoice</option>
                <option value="Quotation">Quotation</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Print Format</label>
              <select
                value={business.printFormat || 'regular'}
                onChange={(e) => setBusiness((b) => ({ ...b, printFormat: e.target.value }))}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400"
              >
                <option value="regular">Regular Printer (A4 / A5 / Letter)</option>
                <option value="thermal">Thermal POS Receipt Printer</option>
              </select>
            </div>

            {business.printFormat === 'thermal' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Thermal Roll Width</label>
                <select
                  value={business.thermalWidth || '80'}
                  onChange={(e) => setBusiness((b) => ({ ...b, thermalWidth: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400"
                >
                  <option value="80">80mm Thermal Paper</option>
                  <option value="58">58mm Thermal Paper</option>
                </select>
              </div>
            )}

            <div className="sm:col-span-2">
              <Textarea
                label="Terms &amp; Conditions"
                value={invoice.terms || ''}
                onChange={(e) => setInvoice((i) => ({ ...i, terms: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button leftIcon={Save} loading={saving} onClick={saveBusiness}>
              Save Print Settings
            </Button>
            <Button variant="outline" leftIcon={Save} loading={saving} onClick={saveInvoice}>
              Save Invoice Template
            </Button>
          </div>
        </Card>
      )}

      {tab === 'theme' && (
        <Card className="space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink-900">App Color Themes</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_OPTIONS.map((theme) => (
              <div
                key={theme.id}
                onClick={() => setBusiness((b) => ({ ...b, colorTheme: theme.id }))}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition',
                  business.colorTheme === theme.id
                    ? 'border-brand-600 bg-brand-50/60 shadow-sm'
                    : 'border-ink-200 bg-white hover:border-ink-300'
                )}
              >
                <div className="h-6 w-6 rounded-lg shadow-sm" style={{ backgroundColor: theme.color }} />
                <span className="font-bold text-sm text-ink-900">{theme.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button leftIcon={Save} loading={saving} onClick={saveBusiness}>
              Save Color Theme
            </Button>
          </div>
        </Card>
      )}

      {tab === 'units' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink-900">Unit List</h3>
            <Button size="sm" leftIcon={Plus} onClick={() => setUnitModal(true)}>
              Add Unit
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {units.length === 0 ? (
              <p className="text-sm text-ink-400">No units yet. Add Kg, Box, Pieces, etc.</p>
            ) : (
              units.map((u) => (
                <span
                  key={u._id || u.id || u.name}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm font-medium text-ink-800"
                >
                  {u.name}
                  <button
                    type="button"
                    onClick={() => removeUnit(u._id || u.id)}
                    className="text-ink-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'categories' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink-900">Product Categories</h3>
            <Button size="sm" leftIcon={Plus} onClick={() => setCatModal(true)}>
              Add Category
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-ink-400">No categories yet.</p>
            ) : (
              categories.map((c) => (
                <span
                  key={c._id || c.id || c.name}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-1.5 text-sm font-medium text-ink-800"
                >
                  {c.name}
                  <button
                    type="button"
                    onClick={() => removeCategory(c._id || c.id)}
                    className="text-ink-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'users' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-ink-900">Staff / Users</h3>
            <Button size="sm" leftIcon={Plus} onClick={() => setUserModal(true)}>
              Add User
            </Button>
          </div>
          <div className="space-y-2">
            {users.length === 0 ? (
              <p className="text-sm text-ink-400">No extra users.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u._id || u.id}
                  className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 p-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={u.role === 'admin' ? 'success' : 'default'}>{u.role}</Badge>
                    <button
                      type="button"
                      onClick={() => removeUser(u._id || u.id)}
                      className="rounded p-1 text-ink-400 hover:text-danger-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      <Modal open={unitModal} onClose={() => setUnitModal(false)} title="Add Unit">
        <form onSubmit={addUnit} className="space-y-4">
          <Input
            label="Unit Name"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
            placeholder="e.g. Kg, Pcs, Meter"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUnitModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Unit</Button>
          </div>
        </form>
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Add Category">
        <form onSubmit={addCategory} className="space-y-4">
          <Input
            label="Category Name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g. Electrical, Copper"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCatModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Add Category</Button>
          </div>
        </form>
      </Modal>

      <Modal open={userModal} onClose={() => setUserModal(false)} title="Add User">
        <form onSubmit={addUser} className="space-y-4">
          <Input
            label="Name"
            value={userForm.name}
            onChange={(e) => setUserForm((u) => ({ ...u, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm((u) => ({ ...u, email: e.target.value }))}
            required
          />
          <Input
            label="Password"
            type="password"
            value={userForm.password}
            onChange={(e) => setUserForm((u) => ({ ...u, password: e.target.value }))}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Role</label>
            <select
              value={userForm.role}
              onChange={(e) => setUserForm((u) => ({ ...u, role: e.target.value }))}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none"
            >
              <option value="staff">Staff / Cashier</option>
              <option value="admin">Admin / Owner</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setUserModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
