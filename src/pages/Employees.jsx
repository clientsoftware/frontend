import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  Printer,
  Trash2,
  Edit2,
  FileText,
  Building2,
  Plus,
  Coins,
  TrendingUp,
  Briefcase,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { employeesAPI, attendanceAPI, productionAPI, payrollAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber, getErrorMessage, cn } from '../utils/helpers';
import Button from '../components/ui/Button';
import Card, { PageHeader, Spinner } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function Employees() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('employees'); // 'employees' | 'attendance' | 'production' | 'payroll'
  const [loading, setLoading] = useState(true);

  // Data states
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [prodItems, setProdItems] = useState([]);
  const [prodRecords, setProdRecords] = useState([]);
  const [salaries, setSalaries] = useState([]);

  // Employee Form State
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmpId, setEditingEmpId] = useState(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    designation: '',
    phone: '',
    baseSalary: '',
    dutyHours: '8',
    attendanceType: 'manual',
  });

  // Attendance Form State
  const [attDate, setAttDate] = useState(today());
  const [attEmpId, setAttEmpId] = useState('');
  const [attStatus, setAttStatus] = useState('present');
  const [attArrival, setAttArrival] = useState('');
  const [attDeparture, setAttDeparture] = useState('');

  // Production Item & Record State
  const [prodItemModalOpen, setProdItemModalOpen] = useState(false);
  const [editingProdItemId, setEditingProdItemId] = useState(null);
  const [prodItemForm, setProdItemForm] = useState({ name: '', unit: 'Pcs', defaultPrice: '' });

  const [prodDate, setProdDate] = useState(today());
  const [prodEmpId, setProdEmpId] = useState('');
  const [prodProductName, setProdProductName] = useState('');
  const [prodQty, setProdQty] = useState('');
  const [prodUnitPrice, setProdUnitPrice] = useState('');

  // Payroll State
  const [payMonth, setPayMonth] = useState(currentMonth());
  const [payEmpId, setPayEmpId] = useState('');
  const [payOTHours, setPayOTHours] = useState('');
  const [payBonus, setPayBonus] = useState('');
  const [selectedSlip, setSelectedSlip] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, attRes, pItemRes, pRecRes, salRes] = await Promise.all([
        employeesAPI.getAll(),
        attendanceAPI.get({ date: attDate }),
        productionAPI.getItems(),
        productionAPI.getRecords({ date: prodDate }),
        payrollAPI.get({ month: payMonth }),
      ]);
      setEmployees(empRes || []);
      setAttendance(attRes || []);
      setProdItems(pItemRes || []);
      setProdRecords(pRecRes || []);
      setSalaries(salRes || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load HR and employee data'));
    } finally {
      setLoading(false);
    }
  }, [attDate, prodDate, payMonth, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Employee Actions
  const handleSaveEmployee = async () => {
    if (!empForm.name.trim()) return toast.error('Employee name required');
    if (!empForm.baseSalary || Number(empForm.baseSalary) < 0) return toast.error('Valid base salary required');

    try {
      const payload = {
        ...empForm,
        baseSalary: Number(empForm.baseSalary),
        dutyHours: Number(empForm.dutyHours) || 8,
      };

      if (editingEmpId) {
        await employeesAPI.update(editingEmpId, payload);
        toast.success('Employee profile updated');
      } else {
        await employeesAPI.create(payload);
        toast.success('New employee added');
      }
      setEmpModalOpen(false);
      setEditingEmpId(null);
      setEmpForm({ name: '', designation: '', phone: '', baseSalary: '', dutyHours: '8', attendanceType: 'manual' });
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save employee'));
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await employeesAPI.delete(id);
      toast.success('Employee deleted');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete employee'));
    }
  };

  // Attendance Actions
  const handleMarkAttendance = async () => {
    if (!attEmpId) return toast.error('Select an employee');

    let workedHours = 0;
    if (attStatus === 'present' && attArrival && attDeparture) {
      const [ah, am] = attArrival.split(':').map(Number);
      const [dh, dm] = attDeparture.split(':').map(Number);
      workedHours = (dh * 60 + dm - (ah * 60 + am)) / 60;
      if (workedHours <= 0) return toast.error('Departure time must be after arrival time');
    }

    try {
      await attendanceAPI.mark({
        date: attDate,
        employeeId: attEmpId,
        status: attStatus,
        arrivalTime: attStatus === 'present' ? attArrival : null,
        departureTime: attStatus === 'present' ? attDeparture : null,
        workedHours: attStatus === 'present' ? workedHours : 0,
      });
      toast.success('Attendance recorded');
      setAttEmpId('');
      setAttArrival('');
      setAttDeparture('');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to mark attendance'));
    }
  };

  // Production Item Actions
  const handleSaveProdItem = async () => {
    if (!prodItemForm.name.trim()) return toast.error('Product name required');
    if (!prodItemForm.defaultPrice || Number(prodItemForm.defaultPrice) <= 0)
      return toast.error('Valid price required');

    try {
      const payload = { ...prodItemForm, defaultPrice: Number(prodItemForm.defaultPrice) };
      if (editingProdItemId) {
        await productionAPI.updateItem(editingProdItemId, payload);
        toast.success('Production product updated');
      } else {
        await productionAPI.createItem(payload);
        toast.success('New production product added');
      }
      setProdItemModalOpen(false);
      setEditingProdItemId(null);
      setProdItemForm({ name: '', unit: 'Pcs', defaultPrice: '' });
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save production product'));
    }
  };

  // Production Record Action
  const handleAddProductionRecord = async () => {
    if (!prodEmpId) return toast.error('Select an employee');
    if (!prodProductName.trim()) return toast.error('Enter or select product name');
    if (!prodQty || Number(prodQty) <= 0) return toast.error('Valid quantity required');
    if (!prodUnitPrice || Number(prodUnitPrice) <= 0) return toast.error('Valid unit price required');

    try {
      const q = Number(prodQty);
      const p = Number(prodUnitPrice);
      await productionAPI.createRecord({
        date: prodDate,
        employeeId: prodEmpId,
        productName: prodProductName.trim(),
        quantity: q,
        unitPrice: p,
        totalAmount: q * p,
      });
      toast.success('Production entry added');
      setProdProductName('');
      setProdQty('');
      setProdUnitPrice('');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to record production'));
    }
  };

  // Payroll Action
  const handleGeneratePayroll = async () => {
    if (!payEmpId) return toast.error('Select an employee');

    const emp = employees.find((e) => e._id === payEmpId);
    if (!emp) return;

    // Fetch month attendance
    const monthAtt = attendance.filter((a) => a.date.startsWith(payMonth) && (a.employeeId?._id || a.employeeId) === payEmpId);
    const presentDays = monthAtt.filter((a) => a.status === 'present').length;
    const halfDays = monthAtt.filter((a) => a.status === 'halfday').length;
    const leaveDays = monthAtt.filter((a) => a.status === 'leave').length;
    const absentDays = monthAtt.filter((a) => a.status === 'absent').length;
    const totalDays = presentDays + halfDays * 0.5;

    const baseSalary = Number(emp.baseSalary) || 0;
    const perDaySalary = baseSalary / 26; // 26 working days
    const attendanceSalary = totalDays * perDaySalary;

    const otPay = (Number(payOTHours) || 0) * (perDaySalary / (emp.dutyHours || 8));
    const bonus = Number(payBonus) || 0;

    // Month production
    const monthProd = prodRecords.filter((p) => (p.employeeId?._id || p.employeeId) === payEmpId);
    const productionUnits = monthProd.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const productionSalary = monthProd.reduce((sum, p) => sum + (Number(p.totalAmount) || 0), 0);

    const grossSalary = attendanceSalary + otPay + bonus + productionSalary;
    const netSalary = grossSalary;

    try {
      await payrollAPI.generate({
        employeeId: payEmpId,
        month: payMonth,
        baseSalary,
        presentDays,
        halfDays,
        leaveDays,
        absentDays,
        totalDays,
        attendanceSalary: Math.round(attendanceSalary * 100) / 100,
        overtimeHours: Number(payOTHours) || 0,
        overtimePay: Math.round(otPay * 100) / 100,
        bonus,
        productionUnits,
        productionSalary: Math.round(productionSalary * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        deductions: 0,
        netSalary: Math.round(netSalary * 100) / 100,
      });
      toast.success('Payroll generated successfully');
      setPayEmpId('');
      setPayOTHours('');
      setPayBonus('');
      fetchData();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to generate payroll'));
    }
  };

  const handlePrintSalarySlip = (salary) => {
    const emp = salary.employeeId || employees.find((e) => e._id === salary.employeeId);
    const empName = emp?.name || 'Employee';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Salary Slip - ${empName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #111; }
          .slip { max-width: 600px; margin: 0 auto; border: 2px solid #111; padding: 30px; background: white; border-radius: 8px; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #111; padding-bottom: 15px; }
          .header h1 { margin: 0; font-size: 24px; color: #111; }
          .header p { margin: 5px 0; font-size: 13px; color: #555; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; background: #f3f4f6; padding: 8px 10px; margin-bottom: 10px; border-left: 4px solid #111; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; font-size: 14px; }
          .row.total { border-top: 2px solid #111; border-bottom: 2px solid #111; font-weight: bold; font-size: 16px; padding: 12px 0; }
          .row.net { background: #dcfce7; font-weight: bold; font-size: 18px; padding: 12px 10px; border-radius: 6px; }
          .label { font-weight: 500; color: #333; }
          .value { text-align: right; color: #111; }
          .value.amount { font-family: monospace; font-weight: 700; }
          .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #888; padding-top: 20px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="slip">
          <div class="header">
            <h1>SALARY SLIP</h1>
            <p>Month: ${salary.month}</p>
          </div>
          
          <div class="section">
            <div class="section-title">Employee Information</div>
            <div class="row"><span class="label">Name</span><span class="value">${empName}</span></div>
            <div class="row"><span class="label">Designation</span><span class="value">${emp?.designation || '-'}</span></div>
            <div class="row"><span class="label">Base Monthly Salary</span><span class="value amount">Rs ${formatCurrency(salary.baseSalary)}</span></div>
          </div>
          
          <div class="section">
            <div class="section-title">Attendance & Duty Summary</div>
            <div class="row"><span class="label">Present Days</span><span class="value">${salary.presentDays}</span></div>
            <div class="row"><span class="label">Half Days</span><span class="value">${salary.halfDays}</span></div>
            <div class="row"><span class="label">Leave / Absent Days</span><span class="value">${(salary.leaveDays || 0) + (salary.absentDays || 0)}</span></div>
            <div class="row" style="border-top: 2px solid #ddd;"><span class="label">Effective Working Days</span><span class="value" style="font-weight: 700;">${salary.totalDays}</span></div>
          </div>
          
          <div class="section">
            <div class="section-title">Earnings & Piece Rate Breakdown</div>
            <div class="row"><span class="label">Attendance Salary</span><span class="value amount">Rs ${formatCurrency(salary.attendanceSalary)}</span></div>
            ${salary.productionSalary ? `<div class="row"><span class="label">Piece-Rate Production (${salary.productionUnits || 0} units)</span><span class="value amount">Rs ${formatCurrency(salary.productionSalary)}</span></div>` : ''}
            ${salary.overtimeHours ? `<div class="row"><span class="label">Overtime Pay (${salary.overtimeHours} hrs)</span><span class="value amount">Rs ${formatCurrency(salary.overtimePay)}</span></div>` : ''}
            ${salary.bonus ? `<div class="row"><span class="label">Bonus</span><span class="value amount">Rs ${formatCurrency(salary.bonus)}</span></div>` : ''}
          </div>
          
          <div class="section">
            <div class="row total"><span class="label">Gross Salary</span><span class="value amount">Rs ${formatCurrency(salary.grossSalary)}</span></div>
            <div class="row net"><span class="label">NET SALARY (PAYABLE)</span><span class="value amount">Rs ${formatCurrency(salary.netSalary)}</span></div>
          </div>
          
          <div class="footer">
            <p>System-generated salary slip · Electric Shop Trading System</p>
            <p>Printed on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    const win = window.open('', 'SALARY_SLIP', 'width=700,height=900');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
  };

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
        title="HR, Attendance & Payroll (ملازمین اور تنخواہیں)"
        subtitle="Manage employees, daily attendance, piece-rate production, and monthly payroll slips"
      />

      {/* Module Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-ink-200 pb-3">
        {[
          { id: 'employees', label: 'Employees List (ملازمین)', icon: Users },
          { id: 'attendance', label: 'Daily Attendance (حاضری)', icon: Clock },
          { id: 'production', label: 'Manufacturing & Piece Rate (پیداوار)', icon: Layers },
          { id: 'payroll', label: 'Payroll & Salary Slips (تنخواہیں)', icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition',
                active
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'bg-white text-ink-600 hover:bg-ink-100 hover:text-ink-900 border border-ink-200'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-lg font-bold text-ink-900">Staff Members ({employees.length})</h3>
            <Button
              leftIcon={UserPlus}
              onClick={() => {
                setEditingEmpId(null);
                setEmpForm({ name: '', designation: '', phone: '', baseSalary: '', dutyHours: '8', attendanceType: 'manual' });
                setEmpModalOpen(true);
              }}
            >
              + Add Employee
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {employees.length === 0 ? (
              <Card className="col-span-full py-12 text-center text-ink-400">
                No employees registered yet. Click &quot;+ Add Employee&quot; to get started.
              </Card>
            ) : (
              employees.map((emp) => (
                <Card key={emp._id} className="space-y-3 bg-white shadow-sm border-ink-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-ink-900">{emp.name}</h4>
                      <p className="text-xs text-ink-500">{emp.designation || 'Staff Member'}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {emp.dutyHours || 8}h Shift
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-ink-600 border-t border-ink-100 pt-2">
                    <p>Phone: <span className="font-mono font-medium">{emp.phone || '-'}</span></p>
                    <p>Base Salary: <span className="font-mono font-bold text-brand-700">{formatCurrency(emp.baseSalary)}</span></p>
                    <p>Attendance: <span className="capitalize">{emp.attendanceType}</span></p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmpId(emp._id);
                        setEmpForm({
                          name: emp.name,
                          designation: emp.designation || '',
                          phone: emp.phone || '',
                          baseSalary: String(emp.baseSalary || ''),
                          dutyHours: String(emp.dutyHours || 8),
                          attendanceType: emp.attendanceType || 'manual',
                        });
                        setEmpModalOpen(true);
                      }}
                      className="rounded p-1 text-ink-500 hover:text-brand-600 hover:bg-brand-50"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp._id)}
                      className="rounded p-1 text-ink-500 hover:text-danger-600 hover:bg-danger-50"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <Card className="space-y-4 border-ink-200">
            <h3 className="font-display text-base font-bold text-ink-900">Mark Daily Attendance</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input
                label="Date"
                type="date"
                value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Select Employee</label>
                <select
                  value={attEmpId}
                  onChange={(e) => setAttEmpId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({e.dutyHours || 8}h duty)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Attendance Status</label>
                <select
                  value={attStatus}
                  onChange={(e) => setAttStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="present">✅ Present</option>
                  <option value="absent">❌ Absent</option>
                  <option value="leave">📅 Leave</option>
                  <option value="halfday">⏰ Half Day</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleMarkAttendance} className="w-full">
                  Save Attendance
                </Button>
              </div>
            </div>

            {attStatus === 'present' && (
              <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-ink-100">
                <Input
                  label="Arrival Time (Optional)"
                  type="time"
                  value={attArrival}
                  onChange={(e) => setAttArrival(e.target.value)}
                />
                <Input
                  label="Departure Time (Optional)"
                  type="time"
                  value={attDeparture}
                  onChange={(e) => setAttDeparture(e.target.value)}
                />
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <h3 className="font-display text-base font-bold text-ink-900">Attendance Log ({attDate})</h3>
            {attendance.length === 0 ? (
              <p className="text-center py-6 text-xs text-ink-400">No attendance records for this date</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                    <tr>
                      <th className="py-2.5">Employee</th>
                      <th className="py-2.5">Status</th>
                      <th className="py-2.5 text-right">Arrival</th>
                      <th className="py-2.5 text-right">Departure</th>
                      <th className="py-2.5 text-right">Hours Worked</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {attendance.map((att) => {
                      const empName = att.employeeId?.name || 'Staff';
                      return (
                        <tr key={att._id}>
                          <td className="py-2.5 font-bold text-ink-900">{empName}</td>
                          <td className="py-2.5">
                            <Badge
                              variant={
                                att.status === 'present'
                                  ? 'success'
                                  : att.status === 'absent'
                                    ? 'danger'
                                    : 'warning'
                              }
                            >
                              {att.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right font-mono">{att.arrivalTime || '-'}</td>
                          <td className="py-2.5 text-right font-mono">{att.departureTime || '-'}</td>
                          <td className="py-2.5 text-right font-mono font-bold">
                            {att.workedHours ? `${att.workedHours.toFixed(2)}h` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PRODUCTION / PIECE RATE */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-lg font-bold text-ink-900">In-house Manufacturing & Piece Rate</h3>
            <Button
              variant="outline"
              onClick={() => {
                setEditingProdItemId(null);
                setProdItemForm({ name: '', unit: 'Pcs', defaultPrice: '' });
                setProdItemModalOpen(true);
              }}
            >
              + Add Production Product
            </Button>
          </div>

          <Card className="space-y-4 border-ink-200">
            <h4 className="font-bold text-sm text-ink-900">Record Daily Piece-Rate Production</h4>
            <div className="grid gap-3 sm:grid-cols-5">
              <Input
                label="Date"
                type="date"
                value={prodDate}
                onChange={(e) => setProdDate(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Employee</label>
                <select
                  value={prodEmpId}
                  onChange={(e) => setProdEmpId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Product Name"
                placeholder="e.g. Copper Wire Coil"
                value={prodProductName}
                onChange={(e) => setProdProductName(e.target.value)}
              />
              <Input
                label="Quantity Made"
                type="number"
                placeholder="0"
                value={prodQty}
                onChange={(e) => setProdQty(e.target.value)}
              />
              <Input
                label="Price Per Unit (Rs)"
                type="number"
                placeholder="0"
                value={prodUnitPrice}
                onChange={(e) => setProdUnitPrice(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleAddProductionRecord}>Add Production Entry</Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <h4 className="font-bold text-sm text-ink-900">Production Log ({prodDate})</h4>
            {prodRecords.length === 0 ? (
              <p className="text-center py-6 text-xs text-ink-400">No production records for this date</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                    <tr>
                      <th className="py-2.5">Employee</th>
                      <th className="py-2.5">Product</th>
                      <th className="py-2.5 text-right">Quantity</th>
                      <th className="py-2.5 text-right">Rate / Unit</th>
                      <th className="py-2.5 text-right">Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {prodRecords.map((rec) => (
                      <tr key={rec._id}>
                        <td className="py-2.5 font-bold text-ink-900">{rec.employeeId?.name || 'Staff'}</td>
                        <td className="py-2.5">{rec.productName}</td>
                        <td className="py-2.5 text-right font-mono">{rec.quantity}</td>
                        <td className="py-2.5 text-right font-mono">Rs {formatCurrency(rec.unitPrice)}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-success-700">
                          Rs {formatCurrency(rec.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <Card className="space-y-4 border-ink-200">
            <h3 className="font-display text-base font-bold text-ink-900">Generate Monthly Payroll</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <Input
                label="Month"
                type="month"
                value={payMonth}
                onChange={(e) => setPayMonth(e.target.value)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Employee</label>
                <select
                  value={payEmpId}
                  onChange={(e) => setPayEmpId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Select employee...</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Overtime Hours (Optional)"
                type="number"
                placeholder="0"
                value={payOTHours}
                onChange={(e) => setPayOTHours(e.target.value)}
              />
              <Input
                label="Bonus Amount (Optional)"
                type="number"
                placeholder="0"
                value={payBonus}
                onChange={(e) => setPayBonus(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleGeneratePayroll}>Generate &amp; Save Payroll</Button>
            </div>
          </Card>

          <Card className="space-y-4">
            <h3 className="font-display text-base font-bold text-ink-900">Monthly Payroll Slips ({payMonth})</h3>
            {salaries.length === 0 ? (
              <p className="text-center py-6 text-xs text-ink-400">No payroll records generated for this month</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-ink-100 font-bold uppercase text-ink-500">
                    <tr>
                      <th className="py-2.5">Employee</th>
                      <th className="py-2.5 text-right">Work Days</th>
                      <th className="py-2.5 text-right">Attendance Pay</th>
                      <th className="py-2.5 text-right">Piece-Rate Pay</th>
                      <th className="py-2.5 text-right">OT / Bonus</th>
                      <th className="py-2.5 text-right">Net Salary</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {salaries.map((sal) => {
                      const empName = sal.employeeId?.name || 'Staff';
                      return (
                        <tr key={sal._id}>
                          <td className="py-2.5 font-bold text-ink-900">{empName}</td>
                          <td className="py-2.5 text-right font-mono">{sal.totalDays}</td>
                          <td className="py-2.5 text-right font-mono">Rs {formatCurrency(sal.attendanceSalary)}</td>
                          <td className="py-2.5 text-right font-mono">Rs {formatCurrency(sal.productionSalary || 0)}</td>
                          <td className="py-2.5 text-right font-mono">
                            Rs {formatCurrency((sal.overtimePay || 0) + (sal.bonus || 0))}
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold text-success-700">
                            Rs {formatCurrency(sal.netSalary)}
                          </td>
                          <td className="py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              leftIcon={Printer}
                              onClick={() => handlePrintSalarySlip(sal)}
                            >
                              Print Slip
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Employee Modal */}
      <Modal
        open={empModalOpen}
        onClose={() => setEmpModalOpen(false)}
        title={editingEmpId ? 'Edit Employee Profile' : 'Add New Employee'}
      >
        <div className="space-y-4 py-2">
          <Input
            label="Employee Full Name *"
            placeholder="e.g. Tariq Mehmood"
            value={empForm.name}
            onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
            required
          />
          <Input
            label="Designation / Role"
            placeholder="e.g. Wire Craftsman / Cashier"
            value={empForm.designation}
            onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
          />
          <Input
            label="Phone Number"
            placeholder="03XX-XXXXXXX"
            value={empForm.phone}
            onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Base Monthly Salary (Rs) *"
              type="number"
              placeholder="e.g. 35000"
              value={empForm.baseSalary}
              onChange={(e) => setEmpForm({ ...empForm, baseSalary: e.target.value })}
              required
            />
            <Input
              label="Daily Shift Duty Hours *"
              type="number"
              placeholder="8"
              value={empForm.dutyHours}
              onChange={(e) => setEmpForm({ ...empForm, dutyHours: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEmpModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee}>Save Profile</Button>
          </div>
        </div>
      </Modal>

      {/* Production Item Modal */}
      <Modal
        open={prodItemModalOpen}
        onClose={() => setProdItemModalOpen(false)}
        title={editingProdItemId ? 'Edit Production Product' : 'Add Production Product'}
      >
        <div className="space-y-4 py-2">
          <Input
            label="Product / Item Name *"
            placeholder="e.g. Copper Wire Coil (50m)"
            value={prodItemForm.name}
            onChange={(e) => setProdItemForm({ ...prodItemForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit"
              placeholder="Pcs / Box / Coil"
              value={prodItemForm.unit}
              onChange={(e) => setProdItemForm({ ...prodItemForm, unit: e.target.value })}
            />
            <Input
              label="Default Piece Rate (Rs) *"
              type="number"
              placeholder="e.g. 150"
              value={prodItemForm.defaultPrice}
              onChange={(e) => setProdItemForm({ ...prodItemForm, defaultPrice: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setProdItemModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProdItem}>Save Product</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
