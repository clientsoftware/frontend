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
  { id: 'invoice', label: 'Invoice Template', icon: FileText },
  { id: 'units', label: 'Units', icon: Ruler },
  { id: 'categories', label: 'Categories', icon: Tags },
  { id: 'users', label: 'Staff / Users', icon: Users },
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
      toast.success('Business profile saved');
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
      <PageHeader title="Settings" subtitle="Business profile, templates, units & staff" />

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
              label="GSTIN"
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
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-ink-900">Invoice Template</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Invoice Prefix"
              value={invoice.prefix || ''}
              onChange={(e) => setInvoice((i) => ({ ...i, prefix: e.target.value }))}
            />
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={!!invoice.showLogo}
                  onChange={(e) => setInvoice((i) => ({ ...i, showLogo: e.target.checked }))}
                  className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                Show business logo on invoices
              </label>
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Footer Note"
                value={invoice.footerNote || ''}
                onChange={(e) => setInvoice((i) => ({ ...i, footerNote: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Terms & Conditions"
                value={invoice.terms || ''}
                onChange={(e) => setInvoice((i) => ({ ...i, terms: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-5">
            <Button leftIcon={Save} loading={saving} onClick={saveInvoice}>
              Save Template
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
            <h3 className="font-display text-lg font-semibold text-ink-900">Categories</h3>
            <Button size="sm" leftIcon={Plus} onClick={() => setCatModal(true)}>
              Add Category
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.length === 0 ? (
              <p className="text-sm text-ink-400">No categories. Add Copper, Scrap, etc.</p>
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
          <div className="divide-y divide-ink-100">
            {users.length === 0 ? (
              <p className="py-6 text-sm text-ink-400">No staff users yet.</p>
            ) : (
              users.map((u) => (
                <div
                  key={u._id || u.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div>
                    <p className="font-medium text-ink-900">{u.name}</p>
                    <p className="text-xs text-ink-400">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="brand">{u.role || 'staff'}</Badge>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => removeUser(u._id || u.id)}
                    >
                      <Trash2 className="h-4 w-4 text-danger-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <Modal
        open={unitModal}
        onClose={() => setUnitModal(false)}
        title="Add Unit"
        footer={
          <>
            <Button variant="outline" onClick={() => setUnitModal(false)}>
              Cancel
            </Button>
            <Button onClick={addUnit}>Add</Button>
          </>
        }
      >
        <form onSubmit={addUnit}>
          <Input
            label="Unit Name"
            required
            placeholder="e.g. Kg, Box, Pieces"
            value={unitName}
            onChange={(e) => setUnitName(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={catModal}
        onClose={() => setCatModal(false)}
        title="Add Category"
        footer={
          <>
            <Button variant="outline" onClick={() => setCatModal(false)}>
              Cancel
            </Button>
            <Button onClick={addCategory}>Add</Button>
          </>
        }
      >
        <form onSubmit={addCategory}>
          <Input
            label="Category Name"
            required
            placeholder="e.g. Copper, Scrap"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={userModal}
        onClose={() => setUserModal(false)}
        title="Add Staff User"
        footer={
          <>
            <Button variant="outline" onClick={() => setUserModal(false)}>
              Cancel
            </Button>
            <Button onClick={addUser}>Create</Button>
          </>
        }
      >
        <form onSubmit={addUser} className="space-y-4">
          <Input
            label="Name"
            required
            value={userForm.name}
            onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            required
            value={userForm.email}
            onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Password"
            type="password"
            required
            value={userForm.password}
            onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
          />
          <Select
            label="Role"
            value={userForm.role}
            onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'staff', label: 'Staff' },
              { value: 'cashier', label: 'Cashier' },
            ]}
          />
        </form>
      </Modal>
    </div>
  );
}
