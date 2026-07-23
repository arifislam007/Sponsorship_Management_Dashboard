import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Users, Plus, Search, X, Edit2, Trash2, Eye, ChevronDown,
  Briefcase, DollarSign, Building2, UserCheck, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, FileText, Printer, Download,
  BarChart2, RefreshCw, ChevronRight, UserMinus, Banknote, CalendarDays
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'employees' | 'payroll' | 'departments' | 'reports';
type EmpStatus = 'Active' | 'Probation' | 'Resigned' | 'Terminated' | 'Retired';
type EmpType = 'Permanent' | 'Contract' | 'Volunteer' | 'Consultant';
type PayStatus = 'Draft' | 'Approved' | 'Paid';
type CompType = 'Earning' | 'Deduction';

interface Department { id: number; name: string; code?: string; head_name?: string; description?: string; is_active: boolean; employee_count?: number; designation_count?: number; }
interface Designation { id: number; title: string; department_id?: number; department_name?: string; grade?: string; is_active: boolean; employee_count?: number; }
interface Employee {
  id: number; employee_code: string; full_name: string; photo?: string;
  gender?: string; date_of_birth?: string; blood_group?: string;
  national_id?: string; passport_number?: string; mobile?: string; email?: string;
  present_address?: string; permanent_address?: string;
  emergency_contact_name?: string; emergency_contact_number?: string; emergency_contact_relation?: string;
  employee_type: EmpType; department_id?: number; department_name?: string;
  designation_id?: number; designation_title?: string;
  reporting_manager_id?: number; manager_name?: string;
  joining_date?: string; confirmation_date?: string;
  employment_status: EmpStatus; office_location?: string; work_email?: string;
  employee_category?: string; basic_salary: number; salary_grade?: string;
  payment_method?: string; bank_name?: string; bank_branch?: string;
  account_number?: string; routing_number?: string;
  mobile_wallet_number?: string; tax_id?: string;
  documents?: EmpDoc[];
}
interface EmpDoc { id: number; document_type: string; file_name: string; file_size?: number; uploaded_by_name?: string; created_at: string; }
interface PayrollItem { component_name: string; component_type: CompType; amount: number; }
interface Payroll {
  id: number; employee_id: number; employee_name?: string; employee_code?: string;
  department_name?: string; designation_title?: string;
  payroll_month: string; basic_salary: number; total_allowance: number;
  total_deduction: number; net_salary: number; payment_status: PayStatus;
  payment_date?: string; payment_method?: string; payment_reference?: string;
  notes?: string; approved_by_name?: string; approved_at?: string;
  created_by_name?: string; items?: PayrollItem[];
  earnings?: PayrollItem[]; deductions?: PayrollItem[];
}
interface SalaryComponent { id: number; name: string; component_type: CompType; is_default: boolean; }
interface DashboardData {
  employee_stats: { total_employees: number; active_employees: number; probation_employees: number; new_this_month: number };
  department_stats: { name: string; employee_count: number }[];
  payroll_stats: { total_payrolls: number; paid: number; approved: number; draft: number; total_paid_amount: number };
  recent_joiners: { id: number; employee_code: string; full_name: string; joining_date?: string; department_name?: string; designation_title?: string }[];
  payroll_this_month: { month: string; total_records: number; total_net: number; total_basic: number };
}

// ── API Helper ────────────────────────────────────────────────────────────────

const HR_API = '/api/hr';

async function hrFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${HR_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EMP_STATUSES: EmpStatus[] = ['Active', 'Probation', 'Resigned', 'Terminated', 'Retired'];
const EMP_TYPES: EmpType[] = ['Permanent', 'Contract', 'Volunteer', 'Consultant'];
const PAY_METHODS = ['Bank', 'bKash', 'Nagad', 'Cash'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const DOC_TYPES = ['NID', 'Passport', 'Appointment Letter', 'Contract', 'CV', 'Academic Certificate', 'Experience Certificate', 'Bank Cheque Copy', 'Other'];

const STATUS_COLORS: Record<EmpStatus, string> = {
  Active: 'bg-green-100 text-green-700',
  Probation: 'bg-blue-100 text-blue-700',
  Resigned: 'bg-amber-100 text-amber-700',
  Terminated: 'bg-red-100 text-red-700',
  Retired: 'bg-gray-100 text-gray-600',
};
const PAY_STATUS_COLORS: Record<PayStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Approved: 'bg-amber-100 text-amber-700',
  Paid: 'bg-green-100 text-green-700',
};
const TYPE_COLORS: Record<EmpType, string> = {
  Permanent: 'bg-purple-100 text-purple-700',
  Contract: 'bg-blue-100 text-blue-700',
  Volunteer: 'bg-teal-100 text-teal-700',
  Consultant: 'bg-orange-100 text-orange-700',
};

function fmt(n?: number | null) { return `৳${Number(n ?? 0).toLocaleString()}`; }
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtMonth(m?: string) {
  if (!m) return '—';
  const [y, mo] = m.split('-');
  return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function currentMonth() { return new Date().toISOString().slice(0, 7); }

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hrFetch<DashboardData>('/dashboard/')
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading dashboard…</div>;
  if (!data) return null;

  const { employee_stats: es, payroll_this_month: pm } = data;

  const cards = [
    { label: 'Total Employees', value: es.total_employees, icon: Users, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Active', value: es.active_employees, icon: UserCheck, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
    { label: 'Probation', value: es.probation_employees, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: 'New This Month', value: es.new_this_month, icon: TrendingUp, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    { label: 'Payroll This Month', value: fmt(pm?.total_net), icon: Banknote, color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
    { label: 'Payroll Records', value: pm?.total_records ?? 0, icon: FileText, color: 'bg-indigo-50 text-indigo-600', border: 'border-indigo-100' },
  ];

  const maxEmp = Math.max(...data.department_stats.map(d => d.employee_count), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border ${c.border} p-4`}>
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-[#14856E]" />
            Employees by Department
          </h3>
          {data.department_stats.filter(d => d.employee_count > 0).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No employees yet</p>
          ) : (
            <div className="space-y-3">
              {data.department_stats.filter(d => d.employee_count > 0).map(d => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-gray-600 flex-shrink-0 truncate">{d.name}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-[#14856E] h-full rounded-full" style={{ width: `${(d.employee_count / maxEmp) * 100}%` }} />
                  </div>
                  <span className="w-6 text-sm font-bold text-gray-700 text-right">{d.employee_count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#14856E]" />
            Recent Joiners
          </h3>
          {data.recent_joiners.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No employees yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_joiners.map(e => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#14856E] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {e.full_name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.full_name}</p>
                    <p className="text-xs text-gray-500">{e.department_name || '—'} · {e.designation_title || '—'}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{fmtDate(e.joining_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Employee Form Modal ────────────────────────────────────────────────────────

function EmployeeFormModal({ editing, departments, designations, employees, onClose, onSaved }: {
  editing?: Employee | null;
  departments: Department[];
  designations: Designation[];
  employees: Employee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [section, setSection] = useState<'personal' | 'employment' | 'financial'>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    gender: editing?.gender ?? '',
    date_of_birth: editing?.date_of_birth?.slice(0, 10) ?? '',
    blood_group: editing?.blood_group ?? '',
    national_id: editing?.national_id ?? '',
    passport_number: editing?.passport_number ?? '',
    mobile: editing?.mobile ?? '',
    email: editing?.email ?? '',
    present_address: editing?.present_address ?? '',
    permanent_address: editing?.permanent_address ?? '',
    emergency_contact_name: editing?.emergency_contact_name ?? '',
    emergency_contact_number: editing?.emergency_contact_number ?? '',
    emergency_contact_relation: editing?.emergency_contact_relation ?? '',
    employee_type: editing?.employee_type ?? 'Permanent',
    department_id: editing?.department_id ? String(editing.department_id) : '',
    designation_id: editing?.designation_id ? String(editing.designation_id) : '',
    reporting_manager_id: editing?.reporting_manager_id ? String(editing.reporting_manager_id) : '',
    joining_date: editing?.joining_date?.slice(0, 10) ?? '',
    confirmation_date: editing?.confirmation_date?.slice(0, 10) ?? '',
    employment_status: editing?.employment_status ?? 'Probation',
    office_location: editing?.office_location ?? '',
    work_email: editing?.work_email ?? '',
    employee_category: editing?.employee_category ?? '',
    basic_salary: editing?.basic_salary ? String(editing.basic_salary) : '',
    salary_grade: editing?.salary_grade ?? '',
    payment_method: editing?.payment_method ?? 'Bank',
    bank_name: editing?.bank_name ?? '',
    bank_branch: editing?.bank_branch ?? '',
    account_number: editing?.account_number ?? '',
    routing_number: editing?.routing_number ?? '',
    mobile_wallet_number: editing?.mobile_wallet_number ?? '',
    tax_id: editing?.tax_id ?? '',
  });

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const filteredDesignations = designations.filter(d => !form.department_id || String(d.department_id) === form.department_id);

  const save = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? Number(form.department_id) : null,
        designation_id: form.designation_id ? Number(form.designation_id) : null,
        reporting_manager_id: form.reporting_manager_id ? Number(form.reporting_manager_id) : null,
        basic_salary: Number(form.basic_salary || 0),
      };
      if (editing) {
        await hrFetch(`/employees/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await hrFetch('/employees/', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const sectionClass = (s: typeof section) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${section === s ? 'border-[#14856E] text-[#14856E]' : 'border-transparent text-gray-500 hover:text-gray-700'}`;

  const inp = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';
  const lbl = 'text-xs font-medium text-gray-600';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Employee' : 'New Employee'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex border-b border-gray-200 px-5">
          {(['personal', 'employment', 'financial'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)} className={sectionClass(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {section === 'personal' && (
            <>
              <div><label className={lbl}>Full Name *</label><input value={form.full_name} onChange={f('full_name')} className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Gender</label>
                  <select value={form.gender} onChange={f('gender')} className={inp}>
                    <option value="">Select</option>
                    {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Blood Group</label>
                  <select value={form.blood_group} onChange={f('blood_group')} className={inp}>
                    <option value="">Select</option>
                    {BLOOD_GROUPS.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={f('date_of_birth')} className={inp} /></div>
                <div><label className={lbl}>National ID</label><input value={form.national_id} onChange={f('national_id')} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Mobile</label><input value={form.mobile} onChange={f('mobile')} className={inp} /></div>
                <div><label className={lbl}>Email</label><input type="email" value={form.email} onChange={f('email')} className={inp} /></div>
              </div>
              <div><label className={lbl}>Present Address</label><textarea value={form.present_address} onChange={f('present_address')} rows={2} className={`${inp} resize-none`} /></div>
              <div><label className={lbl}>Permanent Address</label><textarea value={form.permanent_address} onChange={f('permanent_address')} rows={2} className={`${inp} resize-none`} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className={lbl}>Emergency Contact</label><input value={form.emergency_contact_name} onChange={f('emergency_contact_name')} className={inp} placeholder="Name" /></div>
                <div><label className={lbl}>Number</label><input value={form.emergency_contact_number} onChange={f('emergency_contact_number')} className={inp} /></div>
                <div><label className={lbl}>Relation</label><input value={form.emergency_contact_relation} onChange={f('emergency_contact_relation')} className={inp} placeholder="e.g. Spouse" /></div>
              </div>
            </>
          )}

          {section === 'employment' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Employee Type</label>
                  <select value={form.employee_type} onChange={f('employee_type')} className={inp}>
                    {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Status</label>
                  <select value={form.employment_status} onChange={f('employment_status')} className={inp}>
                    {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Department</label>
                  <select value={form.department_id} onChange={f('department_id')} className={inp}>
                    <option value="">Select</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Designation</label>
                  <select value={form.designation_id} onChange={f('designation_id')} className={inp}>
                    <option value="">Select</option>
                    {filteredDesignations.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                  </select>
                </div>
              </div>
              <div><label className={lbl}>Reporting Manager</label>
                <select value={form.reporting_manager_id} onChange={f('reporting_manager_id')} className={inp}>
                  <option value="">None</option>
                  {employees.filter(e => e.id !== editing?.id).map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Joining Date</label><input type="date" value={form.joining_date} onChange={f('joining_date')} className={inp} /></div>
                <div><label className={lbl}>Confirmation Date</label><input type="date" value={form.confirmation_date} onChange={f('confirmation_date')} className={inp} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Office Location</label><input value={form.office_location} onChange={f('office_location')} className={inp} /></div>
                <div><label className={lbl}>Work Email</label><input type="email" value={form.work_email} onChange={f('work_email')} className={inp} /></div>
              </div>
              <div><label className={lbl}>Employee Category</label><input value={form.employee_category} onChange={f('employee_category')} className={inp} placeholder="e.g. Senior Staff" /></div>
            </>
          )}

          {section === 'financial' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Basic Salary (৳)</label><input type="number" min="0" value={form.basic_salary} onChange={f('basic_salary')} className={inp} /></div>
                <div><label className={lbl}>Salary Grade</label><input value={form.salary_grade} onChange={f('salary_grade')} className={inp} placeholder="e.g. G-3" /></div>
              </div>
              <div><label className={lbl}>Payment Method</label>
                <select value={form.payment_method} onChange={f('payment_method')} className={inp}>
                  {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              {(form.payment_method === 'Bank') && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Bank Name</label><input value={form.bank_name} onChange={f('bank_name')} className={inp} /></div>
                    <div><label className={lbl}>Branch</label><input value={form.bank_branch} onChange={f('bank_branch')} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Account Number</label><input value={form.account_number} onChange={f('account_number')} className={inp} /></div>
                    <div><label className={lbl}>Routing Number</label><input value={form.routing_number} onChange={f('routing_number')} className={inp} /></div>
                  </div>
                </>
              )}
              {(form.payment_method === 'bKash' || form.payment_method === 'Nagad') && (
                <div><label className={lbl}>Mobile Wallet Number</label><input value={form.mobile_wallet_number} onChange={f('mobile_wallet_number')} className={inp} /></div>
              )}
              <div><label className={lbl}>Tax ID (optional)</label><input value={form.tax_id} onChange={f('tax_id')} className={inp} /></div>
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Employee Detail Modal ─────────────────────────────────────────────────────

function EmployeeDetailModal({ empId, onClose, onEdit }: { empId: number; onClose: () => void; onEdit: () => void }) {
  const [emp, setEmp] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('NID');

  const load = () => {
    setLoading(true);
    hrFetch<Employee>(`/employees/${empId}`).then(setEmp).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [empId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const file_data = (reader.result as string).split(',')[1];
        await hrFetch(`/employees/${empId}/documents`, {
          method: 'POST',
          body: JSON.stringify({ document_type: docType, file_name: file.name, file_data, file_size: file.size }),
        });
        load();
      };
      reader.readAsDataURL(file);
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const deleteDoc = async (docId: number) => {
    if (!confirm('Delete this document?')) return;
    await hrFetch(`/employees/${empId}/documents/${docId}`, { method: 'DELETE' });
    load();
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-gray-500">Loading…</div>
    </div>
  );
  if (!emp) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#14856E] text-white flex items-center justify-center text-2xl font-bold flex-shrink-0">
              {emp.full_name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{emp.full_name}</h2>
              <p className="text-sm text-gray-500">{emp.employee_code} · {emp.designation_title || '—'}</p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[emp.employment_status]}`}>{emp.employment_status}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[emp.employee_type]}`}>{emp.employee_type}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onEdit} className="p-2 text-gray-400 hover:text-[#14856E]"><Edit2 size={16} /></button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Department', emp.department_name || '—'],
              ['Mobile', emp.mobile || '—'],
              ['Email', emp.email || '—'],
              ['Joining Date', fmtDate(emp.joining_date)],
              ['Manager', emp.manager_name || '—'],
              ['Basic Salary', fmt(emp.basic_salary)],
              ['Payment Method', emp.payment_method || '—'],
              ['Office', emp.office_location || '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-gray-500">{k}</p>
                <p className="font-medium text-gray-800">{v}</p>
              </div>
            ))}
          </div>

          {(emp.bank_name || emp.account_number) && (
            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-gray-500">Bank</p><p className="font-medium">{emp.bank_name}</p></div>
              <div><p className="text-xs text-gray-500">Account</p><p className="font-medium">{emp.account_number}</p></div>
              {emp.bank_branch && <div><p className="text-xs text-gray-500">Branch</p><p className="font-medium">{emp.bank_branch}</p></div>}
              {emp.routing_number && <div><p className="text-xs text-gray-500">Routing</p><p className="font-medium">{emp.routing_number}</p></div>}
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-gray-700">Documents</h4>
              <div className="flex items-center gap-2">
                <select value={docType} onChange={e => setDocType(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs">
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
                  <Plus size={12} />{uploading ? 'Uploading…' : 'Upload'}
                </button>
                <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
              </div>
            </div>
            {(emp.documents?.length ?? 0) === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {emp.documents!.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{doc.file_name}</p>
                      <p className="text-xs text-gray-400">{doc.document_type} · {doc.uploaded_by_name}</p>
                    </div>
                    <button onClick={() => deleteDoc(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Employees Tab ─────────────────────────────────────────────────────────────

function EmployeesTab() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '100' });
    if (statusFilter) qs.set('status', statusFilter);
    if (deptFilter) qs.set('department_id', deptFilter);
    if (typeFilter) qs.set('employee_type', typeFilter);
    if (search) qs.set('search', search);
    Promise.all([
      hrFetch<{ data: Employee[]; total: number }>(`/employees/?${qs}`),
      hrFetch<{ data: Department[] }>('/departments/'),
      hrFetch<{ data: Designation[] }>('/departments/designations'),
    ]).then(([er, dr, desr]) => {
      setEmployees(er.data); setTotal(er.total);
      setDepartments(dr.data); setDesignations(desr.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [statusFilter, deptFilter, typeFilter, search]);

  useEffect(() => { load(); }, [load]);

  const fetchAndEdit = async (id: number) => {
    try {
      const full = await hrFetch<Employee>(`/employees/${id}`);
      setEditing(full); setShowForm(true);
    } catch (e: any) { alert(e.message); }
  };

  const deleteEmployee = async () => {
    if (!deleting) return;
    try {
      await hrFetch(`/employees/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null); load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, code, mobile…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Status</option>
          {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Types</option>
          {EMP_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />Add Employee
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Designation</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Basic Salary</th>
                  <th className="px-4 py-3 text-left">Joining Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#14856E] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {e.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{e.full_name}</p>
                          <p className="text-xs text-gray-400 font-mono">{e.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.department_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{e.designation_title || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[e.employee_type]}`}>{e.employee_type}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.employment_status]}`}>{e.employment_status}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(e.basic_salary)}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">{fmtDate(e.joining_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setViewId(e.id)} className="p-1.5 text-gray-400 hover:text-[#14856E]"><Eye size={14} /></button>
                        <button onClick={() => fetchAndEdit(e.id)} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleting(e)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No employees found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {employees.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {employees.length} of {total} employees
            </div>
          )}
        </div>
      )}

      {showForm && (
        <EmployeeFormModal
          editing={editing}
          departments={departments}
          designations={designations}
          employees={employees}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={load}
        />
      )}
      {viewId !== null && (
        <EmployeeDetailModal
          empId={viewId}
          onClose={() => setViewId(null)}
          onEdit={() => {
            if (viewId) fetchAndEdit(viewId);
            setViewId(null);
          }}
        />
      )}
      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Remove Employee</h3>
                <p className="text-sm text-gray-500">This will deactivate <strong>{deleting.full_name}</strong>.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={deleteEmployee} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Salary Slip Modal ─────────────────────────────────────────────────────────

function SalarySlipModal({ payrollId, onClose }: { payrollId: number; onClose: () => void }) {
  const [slip, setSlip] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hrFetch<Payroll>(`/payroll/${payrollId}/slip`).then(setSlip).catch(console.error).finally(() => setLoading(false));
  }, [payrollId]);

  const print = () => window.print();

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-gray-500">Loading slip…</div>
    </div>
  );
  if (!slip) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-bold text-gray-900">Salary Slip</h3>
          <div className="flex gap-2">
            <button onClick={print} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-sm hover:bg-[#0f6b5a]">
              <Printer size={14} />Print
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div ref={slipRef} className="p-6 print:p-8" id="salary-slip">
          {/* Header */}
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
            <h1 className="text-xl font-bold text-[#14856E]">Sombhabona Foundation</h1>
            <p className="text-xs text-gray-500 mt-1">Mirpur, Dhaka · 01737243447</p>
            <h2 className="text-base font-bold text-gray-800 mt-3">SALARY SLIP</h2>
            <p className="text-sm text-gray-600">{fmtMonth(slip.payroll_month)}</p>
          </div>

          {/* Employee Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div className="space-y-1.5">
              <div className="flex"><span className="w-32 text-gray-500">Employee Name</span><span className="font-medium">: {(slip as any).employee_name}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Employee Code</span><span className="font-medium">: {(slip as any).employee_code}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Department</span><span className="font-medium">: {(slip as any).department_name || '—'}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Designation</span><span className="font-medium">: {(slip as any).designation_title || '—'}</span></div>
            </div>
            <div className="space-y-1.5">
              <div className="flex"><span className="w-32 text-gray-500">Joining Date</span><span className="font-medium">: {fmtDate((slip as any).joining_date)}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Pay Month</span><span className="font-medium">: {fmtMonth(slip.payroll_month)}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Payment Date</span><span className="font-medium">: {fmtDate(slip.payment_date)}</span></div>
              <div className="flex"><span className="w-32 text-gray-500">Payment Mode</span><span className="font-medium">: {slip.payment_method || (slip as any).emp_payment_method || '—'}</span></div>
            </div>
          </div>

          {/* Earnings & Deductions table */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="bg-green-50 px-3 py-2 rounded-t-lg font-semibold text-sm text-green-800">Earnings</div>
              <table className="w-full text-sm border border-green-100 rounded-b-lg overflow-hidden">
                <tbody>
                  {(slip.earnings ?? []).map((item, i) => (
                    <tr key={i} className="border-t border-green-50">
                      <td className="px-3 py-2 text-gray-700">{item.component_name}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {(slip.earnings ?? []).length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-2 text-gray-400 text-center">—</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div>
              <div className="bg-red-50 px-3 py-2 rounded-t-lg font-semibold text-sm text-red-800">Deductions</div>
              <table className="w-full text-sm border border-red-100 rounded-b-lg overflow-hidden">
                <tbody>
                  {(slip.deductions ?? []).map((item, i) => (
                    <tr key={i} className="border-t border-red-50">
                      <td className="px-3 py-2 text-gray-700">{item.component_name}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {(slip.deductions ?? []).length === 0 && (
                    <tr><td colSpan={2} className="px-3 py-2 text-gray-400 text-center">—</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-[#14856E] text-white rounded-xl px-5 py-3 flex justify-between items-center">
            <span className="font-bold">Net Salary</span>
            <span className="text-xl font-bold">{fmt(slip.net_salary)}</span>
          </div>

          {slip.notes && (
            <p className="mt-3 text-xs text-gray-500 italic">Note: {slip.notes}</p>
          )}

          {/* Signature */}
          <div className="mt-8 grid grid-cols-2 gap-8 text-center text-xs text-gray-500">
            <div className="border-t border-gray-300 pt-2">Employee Signature</div>
            <div className="border-t border-gray-300 pt-2">Authorized Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Payroll Tab ───────────────────────────────────────────────────────────────

function PayrollTab() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [statusFilter, setStatusFilter] = useState('');
  const [slipId, setSlipId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '500' });
    if (monthFilter) qs.set('payroll_month', monthFilter);
    if (statusFilter) qs.set('payment_status', statusFilter);
    Promise.all([
      hrFetch<{ data: Payroll[]; total: number }>(`/payroll/?${qs}`),
      hrFetch<{ data: Employee[] }>('/employees/?limit=200'),
      hrFetch<{ data: SalaryComponent[] }>('/employees/meta/salary-components'),
    ]).then(([pr, er, cr]) => {
      setPayrolls(pr.data); setTotal(pr.total);
      setEmployees(er.data); setComponents(cr.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [monthFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    try { await hrFetch(`/payroll/${id}/approve`, { method: 'POST' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const markPaid = async (id: number) => {
    try { await hrFetch(`/payroll/${id}/pay`, { method: 'POST', body: JSON.stringify({ payment_date: new Date().toISOString().slice(0, 10) }) }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const deletePayroll = async (id: number) => {
    if (!confirm('Delete this payroll?')) return;
    try { await hrFetch(`/payroll/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const totalNet = payrolls.reduce((s, p) => s + p.net_salary, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Status</option>
          {(['Draft','Approved','Paid'] as PayStatus[]).map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#14856E] text-[#14856E] rounded-lg text-sm font-medium hover:bg-green-50">
            <RefreshCw size={14} />Bulk Generate
          </button>
          <button onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
            <Plus size={16} />Add Payroll
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {payrolls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Records', value: total },
            { label: 'Draft', value: payrolls.filter(p => p.payment_status === 'Draft').length },
            { label: 'Approved', value: payrolls.filter(p => p.payment_status === 'Approved').length },
            { label: 'Total Net Salary', value: fmt(totalNet) },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading payrolls…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowance</th>
                  <th className="px-4 py-3 text-right">Deduction</th>
                  <th className="px-4 py-3 text-right">Net</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrolls.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.employee_name}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.employee_code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.department_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtMonth(p.payroll_month)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{fmt(p.basic_salary)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(p.total_allowance)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(p.total_deduction)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(p.net_salary)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAY_STATUS_COLORS[p.payment_status]}`}>{p.payment_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => setSlipId(p.id)} title="View Slip" className="p-1.5 text-gray-400 hover:text-[#14856E]"><FileText size={14} /></button>
                        {p.payment_status === 'Draft' && (
                          <button onClick={() => approve(p.id)} title="Approve" className="p-1.5 text-gray-400 hover:text-amber-600"><CheckCircle2 size={14} /></button>
                        )}
                        {p.payment_status === 'Approved' && (
                          <button onClick={() => markPaid(p.id)} title="Mark Paid" className="p-1.5 text-gray-400 hover:text-green-600"><Banknote size={14} /></button>
                        )}
                        {p.payment_status === 'Draft' && (
                          <button onClick={() => deletePayroll(p.id)} title="Delete" className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {payrolls.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-10 text-gray-400">No payroll records for this period</td></tr>
                )}
              </tbody>
              {payrolls.length > 0 && (
                <tfoot className="bg-gray-50 text-sm font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-gray-700">Totals ({payrolls.length})</td>
                    <td className="px-4 py-3 text-right">{fmt(payrolls.reduce((s, p) => s + p.basic_salary, 0))}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(payrolls.reduce((s, p) => s + p.total_allowance, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(payrolls.reduce((s, p) => s + p.total_deduction, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{fmt(totalNet)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {slipId !== null && <SalarySlipModal payrollId={slipId} onClose={() => setSlipId(null)} />}

      {showCreateModal && (
        <PayrollCreateModal
          employees={employees}
          components={components}
          defaultMonth={monthFilter}
          onClose={() => setShowCreateModal(false)}
          onSaved={load}
        />
      )}

      {showBulkModal && (
        <BulkGenerateModal
          defaultMonth={monthFilter}
          onClose={() => setShowBulkModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ── Payroll Create Modal ──────────────────────────────────────────────────────

function PayrollCreateModal({ employees, components, defaultMonth, onClose, onSaved }: {
  employees: Employee[];
  components: SalaryComponent[];
  defaultMonth: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [empId, setEmpId] = useState('');
  const [month, setMonth] = useState(defaultMonth);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PayrollItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedEmp = employees.find(e => String(e.id) === empId);

  useEffect(() => {
    if (selectedEmp) {
      setItems([{ component_name: 'Basic Salary', component_type: 'Earning', amount: selectedEmp.basic_salary }]);
    }
  }, [empId]);

  const addItem = () => setItems(prev => [...prev, { component_name: '', component_type: 'Earning', amount: 0 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof PayrollItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const totalEarnings = items.filter(i => i.component_type === 'Earning').reduce((s, i) => s + Number(i.amount), 0);
  const totalDeductions = items.filter(i => i.component_type === 'Deduction').reduce((s, i) => s + Number(i.amount), 0);
  const netSalary = totalEarnings - totalDeductions;

  const save = async () => {
    setError('');
    if (!empId) { setError('Select an employee'); return; }
    if (!month) { setError('Select payroll month'); return; }
    setSaving(true);
    try {
      await hrFetch('/payroll/', {
        method: 'POST',
        body: JSON.stringify({ employee_id: Number(empId), payroll_month: month, items, notes }),
      });
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Create Payroll</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Employee *</label>
              <select value={empId} onChange={e => setEmpId(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Payroll Month *</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Salary Components</label>
              <button onClick={addItem} className="text-xs text-[#14856E] hover:underline flex items-center gap-1">
                <Plus size={12} />Add Item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input list="component-names" value={item.component_name}
                      onChange={e => updateItem(i, 'component_name', e.target.value)}
                      placeholder="Component name"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#14856E]" />
                    <datalist id="component-names">
                      {components.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                  <div className="col-span-3">
                    <select value={item.component_type} onChange={e => updateItem(i, 'component_type', e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none">
                      <option value="Earning">Earning</option>
                      <option value="Deduction">Deduction</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="number" min="0" value={item.amount} onChange={e => updateItem(i, 'amount', Number(e.target.value))}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none" />
                  </div>
                  <button onClick={() => removeItem(i)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Net summary */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Total Earnings</span><span className="font-medium text-green-700">{fmt(totalEarnings)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Deductions</span><span className="font-medium text-red-600">{fmt(totalDeductions)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="font-semibold text-gray-800">Net Salary</span><span className="font-bold text-[#14856E]">{fmt(netSalary)}</span></div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Creating…' : 'Create Payroll'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Generate Modal ───────────────────────────────────────────────────────

function BulkGenerateModal({ defaultMonth, onClose, onSaved }: { defaultMonth: string; onClose: () => void; onSaved: () => void }) {
  const [month, setMonth] = useState(defaultMonth);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setError(''); setResult(null);
    if (!month) { setError('Select a month'); return; }
    setLoading(true);
    try {
      const r = await hrFetch<{ created: number; skipped: number }>('/payroll/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({ payroll_month: month }),
      });
      setResult(r);
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Bulk Generate Payroll</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-600 mb-4">Generates Draft payroll for all Active/Probation employees for the selected month. Existing records are skipped.</p>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm">
            <p className="font-medium text-green-800">Done!</p>
            <p className="text-green-700">Created: {result.created} · Skipped: {result.skipped}</p>
          </div>
        )}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600">Payroll Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={generate} disabled={loading}
              className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
              {loading ? 'Generating…' : 'Generate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────

function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptForm, setDeptForm] = useState<Partial<Department> | null>(null);
  const [desForm, setDesForm] = useState<Partial<Designation> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      hrFetch<{ data: Department[] }>('/departments/'),
      hrFetch<{ data: Designation[] }>('/departments/designations'),
    ]).then(([dr, desr]) => { setDepartments(dr.data); setDesignations(desr.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const saveDept = async () => {
    if (!deptForm?.name?.trim()) return;
    setSaving(true);
    try {
      if (deptForm.id) {
        await hrFetch(`/departments/${deptForm.id}`, { method: 'PUT', body: JSON.stringify(deptForm) });
      } else {
        await hrFetch('/departments/', { method: 'POST', body: JSON.stringify(deptForm) });
      }
      setDeptForm(null); load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const deleteDept = async (id: number) => {
    if (!confirm('Delete this department?')) return;
    try { await hrFetch(`/departments/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const saveDes = async () => {
    if (!desForm?.title?.trim()) return;
    setSaving(true);
    try {
      if (desForm.id) {
        await hrFetch(`/departments/designations/${desForm.id}`, { method: 'PUT', body: JSON.stringify(desForm) });
      } else {
        await hrFetch('/departments/designations', { method: 'POST', body: JSON.stringify(desForm) });
      }
      setDesForm(null); load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const deleteDes = async (id: number) => {
    if (!confirm('Delete this designation?')) return;
    try { await hrFetch(`/departments/designations/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const inp = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Departments */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Departments</h3>
          <button onClick={() => setDeptForm({})}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
            <Plus size={14} />Add
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {departments.map(d => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.name}
                  {d.code && <span className="ml-2 text-xs text-gray-400 font-mono">{d.code}</span>}
                </p>
                <p className="text-xs text-gray-500">{d.employee_count ?? 0} employees · {d.designation_count ?? 0} designations</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDeptForm(d)} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={13} /></button>
                <button onClick={() => deleteDept(d.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Designations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Designations</h3>
          <button onClick={() => setDesForm({})}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
            <Plus size={14} />Add
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {designations.map(d => (
            <div key={d.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{d.title}
                  {d.grade && <span className="ml-2 text-xs text-gray-400">[{d.grade}]</span>}
                </p>
                <p className="text-xs text-gray-500">{d.department_name || '—'} · {d.employee_count ?? 0} employees</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDesForm(d)} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={13} /></button>
                <button onClick={() => deleteDes(d.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Department Modal */}
      {deptForm !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{deptForm.id ? 'Edit' : 'New'} Department</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Name *</label>
                <input value={deptForm.name ?? ''} onChange={e => setDeptForm(p => ({ ...p, name: e.target.value }))} className={inp} /></div>
              <div><label className="text-xs font-medium text-gray-600">Code</label>
                <input value={deptForm.code ?? ''} onChange={e => setDeptForm(p => ({ ...p, code: e.target.value }))} className={inp} placeholder="e.g. ADMIN" /></div>
              <div><label className="text-xs font-medium text-gray-600">Head</label>
                <input value={deptForm.head_name ?? ''} onChange={e => setDeptForm(p => ({ ...p, head_name: e.target.value }))} className={inp} /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDeptForm(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={saveDept} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Designation Modal */}
      {desForm !== null && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{desForm.id ? 'Edit' : 'New'} Designation</h3>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-gray-600">Title *</label>
                <input value={desForm.title ?? ''} onChange={e => setDesForm(p => ({ ...p, title: e.target.value }))} className={inp} /></div>
              <div><label className="text-xs font-medium text-gray-600">Department</label>
                <select value={desForm.department_id ?? ''} onChange={e => setDesForm(p => ({ ...p, department_id: Number(e.target.value) || undefined }))} className={inp}>
                  <option value="">Select</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-medium text-gray-600">Grade</label>
                <input value={desForm.grade ?? ''} onChange={e => setDesForm(p => ({ ...p, grade: e.target.value }))} className={inp} placeholder="e.g. G-3" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setDesForm(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={saveDes} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [activeReport, setActiveReport] = useState<'employee-list' | 'salary-register'>('employee-list');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(currentMonth());
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    hrFetch<{ data: Department[] }>('/departments/').then(r => setDepartments(r.data)).catch(console.error);
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      if (activeReport === 'employee-list') {
        const qs = new URLSearchParams({ limit: '500' });
        if (deptFilter) qs.set('department_id', deptFilter);
        if (statusFilter) qs.set('status', statusFilter);
        const r = await hrFetch<{ data: any[] }>(`/employees/?${qs}`);
        setData(r.data);
      } else {
        const qs = new URLSearchParams();
        if (monthFilter) qs.set('payroll_month', monthFilter);
        if (deptFilter) qs.set('department_id', deptFilter);
        const r = await hrFetch<{ data: any[] }>(`/payroll/reports/salary-register?${qs}`);
        setData(r.data);
      }
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const print = () => window.print();

  return (
    <div className="space-y-4">
      {/* Report Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-3 mb-4">
          {(['employee-list', 'salary-register'] as const).map(r => (
            <button key={r} onClick={() => { setActiveReport(r); setData([]); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeReport === r ? 'bg-[#14856E] text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {r === 'employee-list' ? 'Employee List' : 'Salary Register'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600">Department</label>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {activeReport === 'employee-list' && (
            <div>
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">All Status</option>
                {EMP_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          {activeReport === 'salary-register' && (
            <div>
              <label className="text-xs font-medium text-gray-600">Month</label>
              <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
                className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          )}
          <button onClick={run} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            <BarChart2 size={14} />{loading ? 'Running…' : 'Run Report'}
          </button>
          {data.length > 0 && (
            <button onClick={print}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              <Printer size={14} />Print
            </button>
          )}
        </div>
      </div>

      {/* Report Output */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-700">
            {activeReport === 'employee-list' ? 'Employee Directory' : 'Salary Register'} — {data.length} records
          </div>
          <div className="overflow-x-auto">
            {activeReport === 'employee-list' ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Designation</th>
                    <th className="px-4 py-3 text-center">Type</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-left">Mobile</th>
                    <th className="px-4 py-3 text-left">Joining Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((e: any) => (
                    <tr key={e.id}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{e.employee_code}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{e.full_name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{e.department_name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{e.designation_title || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[e.employee_type as EmpType]}`}>{e.employee_type}</span></td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[e.employment_status as EmpStatus]}`}>{e.employment_status}</span></td>
                      <td className="px-4 py-2.5 text-gray-600">{e.mobile || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fmtDate(e.joining_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Basic</th>
                    <th className="px-4 py-3 text-right">Allowance</th>
                    <th className="px-4 py-3 text-right">Deduction</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((p: any, i: number) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{p.employee_code}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.employee_name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{p.department_name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{fmtMonth(p.payroll_month)}</td>
                      <td className="px-4 py-2.5 text-right">{fmt(p.basic_salary)}</td>
                      <td className="px-4 py-2.5 text-right text-green-700">{fmt(p.total_allowance)}</td>
                      <td className="px-4 py-2.5 text-right text-red-600">{fmt(p.total_deduction)}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{fmt(p.net_salary)}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${PAY_STATUS_COLORS[p.payment_status as PayStatus]}`}>{p.payment_status}</span></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={4} className="px-4 py-3">Total ({data.length})</td>
                    <td className="px-4 py-3 text-right">{fmt(data.reduce((s: number, p: any) => s + Number(p.basic_salary), 0))}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(data.reduce((s: number, p: any) => s + Number(p.total_allowance), 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600">{fmt(data.reduce((s: number, p: any) => s + Number(p.total_deduction), 0))}</td>
                    <td className="px-4 py-3 text-right">{fmt(data.reduce((s: number, p: any) => s + Number(p.net_salary), 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {data.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
          <p>Select filters and click "Run Report" to generate</p>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'employees', label: 'Employees', icon: Users },
  { id: 'payroll', label: 'Payroll', icon: Banknote },
  { id: 'departments', label: 'Departments', icon: Building2 },
  { id: 'reports', label: 'Reports', icon: FileText },
];

export function HR() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <img src="/logo.png" alt="Sombhabona" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">HR Management</h1>
        <p className="text-sm text-gray-600 mt-1">Employee profiles, payroll and organizational structure</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[#14856E] text-[#14856E] bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard'   && <DashboardTab />}
      {tab === 'employees'   && <EmployeesTab />}
      {tab === 'payroll'     && <PayrollTab />}
      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'reports'     && <ReportsTab />}
    </div>
  );
}
