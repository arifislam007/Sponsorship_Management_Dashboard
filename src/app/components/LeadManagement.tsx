import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import * as XLSX from 'xlsx';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  LayoutDashboard, Users, BookOpen, PhoneCall, GraduationCap, FileBarChart,
  Plus, Search, X, Edit2, Trash2, Upload, Download, Loader2, ExternalLink, Printer, Mail, RefreshCw,
  MessageCircle, Send, Building2,
} from 'lucide-react';
import { ShareEmailModal, buildEmailHtml } from './ShareEmailModal';
import { Modal } from './Modal';
import { EmptyState } from './EmptyState';
import { TabBar } from './TabBar';
import { LoadingState } from './Spinner';
import { ErrorBanner } from './ErrorBanner';

// ── Types ──────────────────────────────────────────────────────────────────────

type LeadStatus = 'New' | 'Contacted' | 'Interested' | 'Follow-up' | 'Admitted' | 'Lost';

interface Course { id: number; name: string; code?: string; duration_months?: number; fee?: number; is_active: boolean; lead_count?: number; }
interface Institute {
  id: number; name: string; institute_type: string; location?: string;
  contact_person_name?: string; contact_person_designation?: string; contact_person_phone?: string;
  approx_student_count?: number; status: string; notes?: string; created_at?: string;
}
interface Lead {
  id: number; full_name: string; phone: string; email?: string; gender?: string; address?: string;
  course_id?: number | null; course_name?: string; source: string; reference_name?: string; status: LeadStatus;
  institute_id?: number | null; institute_name?: string;
  assigned_to?: string; notes?: string; admission_date?: string; batch?: string;
  created_at: string; updated_at: string;
}
interface Followup {
  id: number; lead_id: number; attempt_number: number; followup_date: string; method: string; outcome?: string;
  comment?: string; next_followup_date?: string; created_by?: string; created_at: string;
  lead_name?: string; lead_phone?: string; lead_status?: string; lead_course_name?: string;
}
interface DashboardData {
  lead_stats: { total_leads: number; admitted_leads: number; new_this_month: number; conversion_rate: number };
  status_breakdown: { status: string; count: number }[];
  course_breakdown: { course_name: string; lead_count: number }[];
  source_breakdown: { source: string; count: number }[];
  overdue_followups: number;
  recent_leads: { id: number; full_name: string; phone: string; status: string; created_at: string; course_name?: string }[];
  leads_by_month: { month: string; month_label: string; count: number }[];
  status_by_source: { source: string; new: number; contacted: number; interested: number; followup: number; admitted: number; lost: number }[];
  admitted_by_attempts: { attempts: number; lead_count: number }[];
}
interface WhatsAppMessage {
  id: number; lead_id: number; external_message_id: string | null; chat_id: string;
  direction: 'outbound' | 'inbound'; message_type: string; body: string | null;
  from_me: boolean; is_group: boolean; status: string; created_by: number | null; created_at: string;
}
interface MonthCount { month: string; month_label: string; count: number; }
interface ReportsData {
  admitted_by_month: MonthCount[];
  followup_calls_by_month: { month: string; month_label: string; total_calls: number; phone_calls: number }[];
  lost_by_source: { source: string; count: number }[];
  new_leads_by_month: MonthCount[];
  course_conversion: { course_name: string; total_leads: number; admitted: number; conversion_pct: number | null }[];
  staff_performance: { assigned_to: string; total_leads: number; admitted: number }[];
  leads_by_date_status: { date: string; date_label: string; status: string; count: number }[];
}

// ── API Helper ─────────────────────────────────────────────────────────────────

const LEAD_API = '/api/leads';

async function leadFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${LEAD_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed: ${res.status}`;
    try { message = JSON.parse(text)?.message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  return res.json();
}

const HR_API = '/api/hr';

async function hrFetch<T>(path: string): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${HR_API}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(await res.text() || `Request failed: ${res.status}`);
  return res.json();
}

interface HrEmployee { id: number; full_name: string; }

async function fetchIctEmployees(): Promise<HrEmployee[]> {
  const deptRes = await hrFetch<{ data: { id: number; name: string }[] }>('/departments/');
  const ictDept = deptRes.data.find(d => d.name.trim().toLowerCase() === 'ict');
  if (!ictDept) return [];
  const empRes = await hrFetch<{ data: HrEmployee[] }>(`/employees/?department_id=${ictDept.id}&status=Active&limit=200`);
  return empRes.data;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Interested', 'Follow-up', 'Admitted', 'Lost'];
const SOURCES = ['Facebook', 'Other Social Media', 'Poster/Banner', 'Announcement', 'Reference', 'Other'];
const METHODS = ['Call', 'SMS', 'Email', 'Visit'];
const OUTCOME_OPTIONS = [
  'Phone Switch Off', 'Not Receive', 'Interested', 'Not Interested',
  'Call Next', 'Busy', 'In a Class', 'Wrong Number', 'Other',
];

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Interested: 'bg-purple-100 text-purple-700',
  'Follow-up': 'bg-orange-100 text-orange-700',
  Admitted: 'bg-green-100 text-green-700',
  Lost: 'bg-gray-100 text-gray-600',
};

const INSTITUTE_TYPES = ['School', 'College', 'University', 'Coaching Center', 'Madrasa', 'Other'];
const INSTITUTE_STATUSES = ['Prospect', 'Contacted', 'Visited', 'Partnered', 'Not Interested'];
const INSTITUTE_STATUS_COLORS: Record<string, string> = {
  Prospect: 'bg-blue-100 text-blue-700',
  Contacted: 'bg-amber-100 text-amber-700',
  Visited: 'bg-purple-100 text-purple-700',
  Partnered: 'bg-green-100 text-green-700',
  'Not Interested': 'bg-gray-100 text-gray-600',
};

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const MAX_FOLLOWUP_ATTEMPTS = 5;

function ordinal(n: number) {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const rem = n % 100;
  return `${n}${suffixes[(rem - 20) % 10] || suffixes[rem] || suffixes[0]}`;
}

const inp = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';
const lbl = 'text-xs font-medium text-gray-600';

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

const PIE_COLORS = ['#14856E', '#F59E0B', '#8B5CF6', '#F97316', '#22C55E', '#9CA3AF'];

function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    leadFetch<DashboardData>('/dashboard/').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading dashboard…</div>;
  if (!data) return null;

  const cards = [
    { label: 'Total Leads', value: data.lead_stats.total_leads },
    { label: 'New This Month', value: data.lead_stats.new_this_month },
    { label: 'Follow-ups Due', value: data.overdue_followups },
    { label: 'Admitted', value: data.lead_stats.admitted_leads },
    { label: 'Conversion Rate', value: `${data.lead_stats.conversion_rate}%` },
  ];

  // This tab is the live "at a glance" snapshot — current status mix, recent
  // trend, and latest activity. Deeper/period-filterable breakdowns (by
  // course, by source, by follow-up effort) live in the Reports tab instead
  // of being duplicated here.
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Leads Trend (12 months)</h3>
          {data.leads_by_month.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.leads_by_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month_label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Line type="monotone" dataKey="count" name="New Leads" stroke="#14856E" strokeWidth={2.5} dot={{ fill: '#14856E', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-2">Leads by Status</h3>
          {data.status_breakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.status_breakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="count" nameKey="status">
                    {data.status_breakdown.map((entry, index) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ? PIE_COLORS[index % PIE_COLORS.length] : '#9CA3AF'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {data.status_breakdown.map((s, i) => (
                  <div key={s.status} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-gray-600">{s.status} ({s.count})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-200"><h3 className="font-semibold text-gray-800">Recent Leads</h3></div>
        <div className="divide-y divide-gray-100">
          {data.recent_leads.map(l => (
            <div key={l.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">{l.full_name}</p>
                <p className="text-xs text-gray-500">{l.phone} · {l.course_name || '—'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
            </div>
          ))}
          {data.recent_leads.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No leads yet</p>}
        </div>
      </div>
    </div>
  );
}

// ── Lead Form Modal ───────────────────────────────────────────────────────────

function LeadFormModal({ editing, courses, institutes, onClose, onSaved }: {
  editing?: Lead | null; courses: Course[]; institutes: Institute[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assignees, setAssignees] = useState<HrEmployee[]>([]);
  const titleId = useId();

  useEffect(() => {
    fetchIctEmployees().then(setAssignees).catch(console.error);
  }, []);

  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    phone: editing?.phone ?? '',
    email: editing?.email ?? '',
    gender: editing?.gender ?? '',
    address: editing?.address ?? '',
    course_id: editing?.course_id ? String(editing.course_id) : '',
    institute_id: editing?.institute_id ? String(editing.institute_id) : '',
    source: editing?.source ?? 'Other',
    reference_name: editing?.reference_name ?? '',
    status: editing?.status ?? 'New',
    assigned_to: editing?.assigned_to ?? '',
    notes: editing?.notes ?? '',
    admission_date: editing?.admission_date?.slice(0, 10) ?? '',
    batch: editing?.batch ?? '',
  });

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    if (!form.phone.trim()) { setError('Phone is required'); return; }
    if (form.source === 'Reference' && !form.reference_name.trim()) { setError('Reference name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        course_id: form.course_id ? Number(form.course_id) : null,
        institute_id: form.institute_id ? Number(form.institute_id) : null,
      };
      if (editing) {
        await leadFetch(`/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await leadFetch('/', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 id={titleId} className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'New'} Lead</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Full Name *</label><input value={form.full_name} onChange={f('full_name')} className={inp} /></div>
            <div><label className={lbl}>Phone *</label><input value={form.phone} onChange={f('phone')} className={inp} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Email</label><input type="email" value={form.email} onChange={f('email')} className={inp} /></div>
            <div><label className={lbl}>Gender</label>
              <select value={form.gender} onChange={f('gender')} className={inp}>
                <option value="">Select</option>
                {['Male', 'Female', 'Other'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Address</label><textarea value={form.address} onChange={f('address')} rows={2} className={`${inp} resize-none`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Course</label>
              <select value={form.course_id} onChange={f('course_id')} className={inp}>
                <option value="">Select</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Source</label>
              <select value={form.source} onChange={f('source')} className={inp}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className={lbl}>Institute</label>
            <select value={form.institute_id} onChange={f('institute_id')} className={inp}>
              <option value="">— None —</option>
              {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          {form.source === 'Reference' && (
            <div><label className={lbl}>Reference Name *</label>
              <input value={form.reference_name} onChange={f('reference_name')} placeholder="Name of the referee" className={inp} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Status</label>
              <select value={form.status} onChange={f('status')} className={inp}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Assigned To</label>
              <select value={form.assigned_to} onChange={f('assigned_to')} className={inp}>
                <option value="">Unassigned</option>
                {assignees.map(a => <option key={a.id} value={a.full_name}>{a.full_name}</option>)}
              </select>
            </div>
          </div>
          {form.status === 'Admitted' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>Admission Date</label><input type="date" value={form.admission_date} onChange={f('admission_date')} className={inp} /></div>
              <div><label className={lbl}>Batch</label><input value={form.batch} onChange={f('batch')} className={inp} /></div>
            </div>
          )}
          <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={f('notes')} rows={2} className={`${inp} resize-none`} /></div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
    </Modal>
  );
}

// ── Bulk Lead Upload Modal ────────────────────────────────────────────────────

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}
function getValue(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const match = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizeHeader(alias));
    if (match) return match[1];
  }
  return undefined;
}

function BulkLeadUploadModal({ courses, onClose, onUploaded }: { courses: Course[]; onClose: () => void; onUploaded: () => void }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<{ created: number; skipped: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const downloadSample = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { name: 'Rafi Ahmed', phone: '01700000000', email: '', course: 'Web Development', source: 'Facebook', reference_name: '', notes: '' },
    ], { header: ['name', 'phone', 'email', 'course', 'source', 'reference_name', 'notes'] });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'lead-bulk-upload-sample.xlsx'; link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true); setSummary(null);
    try {
      const buf = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buf, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
        .filter(row => Object.values(row).some(v => String(v ?? '').trim() !== ''));

      if (!rows.length) throw new Error('The worksheet is empty.');

      const parsed = rows.map(row => {
        const courseName = String(getValue(row, ['course']) ?? '').trim();
        const course = courses.find(c => c.name.toLowerCase() === courseName.toLowerCase());
        return {
          full_name: String(getValue(row, ['name', 'full_name']) ?? '').trim(),
          phone: String(getValue(row, ['phone', 'mobile']) ?? '').trim(),
          email: String(getValue(row, ['email']) ?? '').trim() || undefined,
          course_id: course?.id,
          source: String(getValue(row, ['source']) ?? 'Other').trim() || 'Other',
          reference_name: String(getValue(row, ['reference_name', 'reference', 'referee']) ?? '').trim() || undefined,
          notes: String(getValue(row, ['notes']) ?? '').trim() || undefined,
        };
      });

      const result = await leadFetch<{ created: number; skipped: number; failed: number; errors: { row: number; message: string }[] }>(
        '/bulk', { method: 'POST', body: JSON.stringify(parsed) }
      );
      setSummary(result);
      onUploaded();
    } catch (e: any) {
      setSummary({ created: 0, skipped: 0, failed: 1, errors: [{ row: 0, message: e.message || 'Upload failed' }] });
    } finally { setUploading(false); }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <h3 id={titleId} className="text-lg font-bold text-gray-900">Upload Leads from Excel</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-[#14856E]/20 bg-[#14856E]/5 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">Required columns</p>
            <p className="mb-2"><span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">name</span>{' '}
              <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">phone</span></p>
            <p className="text-gray-600">Optional: email, course, source, notes</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={downloadSample} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
              <Download size={16} />Sample file
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-sm text-white hover:bg-[#0f6b5a]">
              <Upload size={16} />{selectedFile ? 'Change file' : 'Choose file'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setSummary(null); setSelectedFile(e.target.files?.[0] || null); }} />
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            {selectedFile ? selectedFile.name : 'No file selected yet.'}
          </div>
          {summary && (
            <div className="rounded-lg border border-gray-200 p-3 text-sm space-y-1">
              <p>Created: {summary.created} · Skipped (duplicate phone): {summary.skipped} · Failed: {summary.failed}</p>
              {summary.errors.length > 0 && (
                <ul className="list-disc pl-5 text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {summary.errors.slice(0, 10).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                </ul>
              )}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Close</button>
            <button onClick={handleUpload} disabled={!selectedFile || uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
              {uploading && <Loader2 size={14} className="animate-spin" />}{uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </div>
    </Modal>
  );
}

// ── Google Sheet Sync Modal ───────────────────────────────────────────────────

interface SheetConfig { id: number; spreadsheet_id: string; sheet_name: string; last_synced_at?: string | null; }

function GoogleSheetSyncModal({ onClose, onSynced }: { onClose: () => void; onSynced: () => void }) {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [cfg, setCfg] = useState<SheetConfig | null>(null);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [spreadsheetInput, setSpreadsheetInput] = useState('');
  const [sheetNameInput, setSheetNameInput] = useState('Sheet1');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<{ created: number; skipped: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const titleId = useId();

  const loadConfig = () => {
    setLoadingConfig(true);
    leadFetch<{ config: SheetConfig | null; service_account_email: string | null }>('/sheet-sync/config')
      .then(r => {
        setCfg(r.config);
        setServiceAccountEmail(r.service_account_email);
        setEditing(!r.config);
        if (r.config) { setSpreadsheetInput(r.config.spreadsheet_id); setSheetNameInput(r.config.sheet_name); }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingConfig(false));
  };
  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async () => {
    setError('');
    if (!spreadsheetInput.trim()) { setError('Sheet URL or ID is required'); return; }
    setSaving(true);
    try {
      const saved = await leadFetch<SheetConfig>('/sheet-sync/config', {
        method: 'PUT',
        body: JSON.stringify({ spreadsheet_id: spreadsheetInput.trim(), sheet_name: sheetNameInput.trim() || 'Sheet1' }),
      });
      setCfg(saved);
      setEditing(false);
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const syncNow = async () => {
    setError(''); setSummary(null); setSyncing(true);
    try {
      const result = await leadFetch<{ created: number; skipped: number; failed: number; errors: { row: number; message: string }[] }>(
        '/sheet-sync/sync', { method: 'POST' }
      );
      setSummary(result);
      onSynced();
    } catch (e: any) { setError(e.message); }
    finally { setSyncing(false); }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <h3 id={titleId} className="text-lg font-bold text-gray-900">Sync with Google Sheet</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {loadingConfig ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
          ) : (
            <>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              {serviceAccountEmail && (
                <div className="rounded-xl border border-[#14856E]/20 bg-[#14856E]/5 p-4 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900 mb-1">Before syncing</p>
                  <p>Share the Google Sheet (Viewer access is enough) with:</p>
                  <p className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1 mt-1 inline-block break-all">{serviceAccountEmail}</p>
                </div>
              )}

              {editing ? (
                <div className="space-y-3">
                  <div><label className={lbl}>Google Sheet URL or ID *</label>
                    <input value={spreadsheetInput} onChange={e => setSpreadsheetInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..." className={inp} />
                  </div>
                  <div><label className={lbl}>Tab / Sheet Name</label>
                    <input value={sheetNameInput} onChange={e => setSheetNameInput(e.target.value)} placeholder="Sheet1" className={inp} />
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900 mb-1">Expected columns (first row = headers)</p>
                    <p><span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">name</span>{' '}
                      <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">phone</span></p>
                    <p className="text-gray-600 mt-1">Optional: email, course, source, reference_name, notes</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    {cfg && <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>}
                    <button onClick={saveConfig} disabled={saving}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save Sheet'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{cfg?.sheet_name}</p>
                    <p className="text-xs text-gray-500 break-all mt-0.5">{cfg?.spreadsheet_id}</p>
                    {cfg?.last_synced_at && <p className="text-xs text-gray-400 mt-1">Last synced: {fmtDate(cfg.last_synced_at)}</p>}
                    <button onClick={() => setEditing(true)} className="text-xs text-[#14856E] font-medium hover:underline mt-2">Change sheet</button>
                  </div>

                  {summary && (
                    <div className="rounded-lg border border-gray-200 p-3 text-sm space-y-1">
                      <p>Created: {summary.created} · Skipped (duplicate phone): {summary.skipped} · Failed: {summary.failed}</p>
                      {summary.errors.length > 0 && (
                        <ul className="list-disc pl-5 text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                          {summary.errors.slice(0, 10).map((e, i) => <li key={i}>Row {e.row}: {e.message}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Close</button>
                    <button onClick={syncNow} disabled={syncing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      {syncing && <Loader2 size={14} className="animate-spin" />}{syncing ? 'Syncing…' : 'Sync Now'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </Modal>
  );
}

// ── WhatsApp Thread Modal ─────────────────────────────────────────────────────

function WhatsAppThreadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const titleId = useId();
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    leadFetch<{ data: WhatsAppMessage[] }>(`/whatsapp/${lead.id}?limit=100&offset=0`)
      .then(r => setMessages(r.data))
      .catch(e => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, [lead.id]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSendError('');
    setSending(true);
    try {
      const created = await leadFetch<WhatsAppMessage>('/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ lead_id: lead.id, text: trimmed }),
      });
      setMessages(prev => [...prev, created]);
      setText('');
    } catch (e: any) {
      setSendError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <div>
          <h3 id={titleId} className="text-lg font-bold text-gray-900">WhatsApp — {lead.full_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>

      <div className="p-5 max-h-[70vh] overflow-y-auto bg-gray-50">
        {loading && <LoadingState label="Loading messages…" />}
        {!loading && loadError && <ErrorBanner message={loadError} />}
        {!loading && !loadError && messages.length === 0 && (
          <p className="text-center py-10 text-gray-400 text-sm">No messages yet. Send the first one below.</p>
        )}
        {!loading && !loadError && messages.length > 0 && (
          <div className="space-y-2">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.from_me ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    m.from_me ? 'bg-[#14856E] text-white rounded-br-sm' : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.body !== null ? (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  ) : (
                    <p className={`italic ${m.from_me ? 'text-white/70' : 'text-gray-500'}`}>[non-text message]</p>
                  )}
                  <p className={`text-[10px] mt-1 text-right ${m.from_me ? 'text-white/70' : 'text-gray-500'}`}>{fmtDateTime(m.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>
        )}
      </div>

      <div className="p-5 border-t border-gray-200 space-y-2">
        {sendError && <ErrorBanner message={sendError} />}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            className={`${inp} mt-0 flex-1`}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50 shrink-0"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Leads Tab ─────────────────────────────────────────────────────────────────

function LeadsTable({ statusFilter, admissionsView }: { statusFilter?: LeadStatus; admissionsView?: boolean }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(statusFilter ?? '');
  const [courseFilter, setCourseFilter] = useState('');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Lead | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showSheetSync, setShowSheetSync] = useState(false);
  const [followupLead, setFollowupLead] = useState<Lead | null>(null);
  const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);
  const deleteTitleId = useId();

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '100' });
    if (status) qs.set('status', status);
    if (courseFilter) qs.set('course_id', courseFilter);
    if (instituteFilter) qs.set('institute_id', instituteFilter);
    if (search) qs.set('search', search);
    Promise.all([
      leadFetch<{ data: Lead[]; total: number }>(`/?${qs}`),
      leadFetch<{ data: Course[] }>('/courses/'),
      leadFetch<{ data: Institute[] }>('/institutes/'),
    ]).then(([lr, cr, ir]) => { setLeads(lr.data); setTotal(lr.total); setCourses(cr.data); setInstitutes(ir.data); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [status, courseFilter, instituteFilter, search]);

  const deleteLead = async () => {
    if (!deleting) return;
    try { await leadFetch(`/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-3">
        <div className="relative flex-[2] min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone…" className={`pl-9 ${inp} mt-0 w-full`} />
        </div>
        {!statusFilter && (
          <select value={status} onChange={e => setStatus(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        )}
        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={instituteFilter} onChange={e => setInstituteFilter(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`}>
          <option value="">All Institutes</option>
          {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <div className="flex gap-3 shrink-0">
          {admissionsView ? (
            <Link to="/dashboard/ict?tab=admission-form&new=1"
              className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] whitespace-nowrap">
              <ExternalLink size={16} />New Admission in ICT Form
            </Link>
          ) : (
            <>
              <button onClick={() => { setEditing(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] whitespace-nowrap">
                <Plus size={16} />Add Lead
              </button>
              <button onClick={() => setShowBulk(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap">
                <Upload size={16} />Upload Excel
              </button>
              <button onClick={() => setShowSheetSync(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap">
                <RefreshCw size={16} />Sync Google Sheet
              </button>
            </>
          )}
        </div>
      </div>

      {admissionsView && (
        <p className="text-sm text-gray-500 -mt-2">
          These leads have been marked <span className="font-medium">Admitted</span>. Fill out the official record in the{' '}
          <Link to="/dashboard/ict?tab=admission-form" className="text-[#14856E] font-medium hover:underline">ICT Admission Form</Link> — this list is just the lead-side tracking, not a replacement for it.
        </p>
      )}

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Course</th>
                  <th className="px-4 py-3 text-left">Institute</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {statusFilter === 'Admitted' && <th className="px-4 py-3 text-left">Batch</th>}
                  <th className="px-4 py-3 text-left">Created</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{l.full_name}</td>
                    <td className="px-4 py-3 text-gray-600">{l.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{l.course_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{l.institute_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{l.source}{l.source === 'Reference' && l.reference_name ? ` (${l.reference_name})` : ''}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[l.status] ?? 'bg-gray-100 text-gray-600'}`}>{l.status}</span>
                    </td>
                    {statusFilter === 'Admitted' && <td className="px-4 py-3 text-gray-600">{l.batch || '—'}</td>}
                    <td className="px-4 py-3 text-gray-600 text-sm">{fmtDate(l.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        {admissionsView && (
                          <Link to="/dashboard/ict?tab=admission-form&new=1" className="p-1.5 text-gray-400 hover:text-[#14856E]" title="Open ICT Admission Form"><ExternalLink size={14} /></Link>
                        )}
                        <button onClick={() => setFollowupLead(l)} className="p-1.5 text-gray-400 hover:text-[#14856E]" title="Log Follow-up"><PhoneCall size={14} /></button>
                        <button onClick={() => setWhatsappLead(l)} className="p-1.5 text-gray-400 hover:text-[#14856E]" title="Send WhatsApp Message"><MessageCircle size={14} /></button>
                        <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleting(l)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && (
                  <tr><td colSpan={9}>
                    <EmptyState
                      icon={PhoneCall}
                      title="No leads found"
                      description={admissionsView ? 'No admitted leads yet.' : 'Add your first lead to start tracking prospective students.'}
                      action={admissionsView ? undefined : { label: 'Add Lead', icon: Plus, onClick: () => { setEditing(null); setShowForm(true); } }}
                    />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {leads.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Showing {leads.length} of {total} leads</div>
          )}
        </div>
      )}

      {showForm && (
        <LeadFormModal editing={editing} courses={courses} institutes={institutes} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={load} />
      )}
      {showBulk && (
        <BulkLeadUploadModal courses={courses} onClose={() => setShowBulk(false)} onUploaded={load} />
      )}
      {showSheetSync && (
        <GoogleSheetSyncModal onClose={() => setShowSheetSync(false)} onSynced={load} />
      )}
      {followupLead && (
        <FollowupFormModal leads={leads} initialLeadId={followupLead.id} onClose={() => setFollowupLead(null)} onSaved={load} />
      )}
      {whatsappLead && (
        <WhatsAppThreadModal lead={whatsappLead} onClose={() => setWhatsappLead(null)} />
      )}
      {deleting && (
        <Modal onClose={() => setDeleting(null)} titleId={deleteTitleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 id={deleteTitleId} className="text-lg font-bold text-gray-900 mb-2">Delete Lead</h3>
            <p className="text-sm text-gray-600 mb-4">Delete <span className="font-medium">{deleting.full_name}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={deleteLead} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
        </Modal>
      )}
    </div>
  );
}

function LeadsTab() { return <LeadsTable />; }
function AdmissionsTab() { return <LeadsTable statusFilter="Admitted" admissionsView />; }

// ── Courses Tab ───────────────────────────────────────────────────────────────

function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<Course> | null>(null);
  const [saving, setSaving] = useState(false);
  const titleId = useId();

  const load = () => {
    setLoading(true);
    leadFetch<{ data: Course[] }>('/courses/').then(r => setCourses(r.data)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form?.name?.trim()) return;
    setSaving(true);
    try {
      if (form.id) await leadFetch(`/courses/${form.id}`, { method: 'PUT', body: JSON.stringify(form) });
      else await leadFetch('/courses/', { method: 'POST', body: JSON.stringify(form) });
      setForm(null); load();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this course?')) return;
    try { await leadFetch(`/courses/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-2xl">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">Courses</h3>
        <button onClick={() => setForm({})} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={14} />Add
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {courses.map(c => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">{c.name}{c.code && <span className="ml-2 text-xs text-gray-400 font-mono">{c.code}</span>}</p>
              <p className="text-xs text-gray-500">{c.duration_months ? `${c.duration_months} months · ` : ''}{c.lead_count ?? 0} leads</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setForm(c)} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={13} /></button>
              <button onClick={() => remove(c.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
        {courses.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No courses yet</p>}
      </div>

      {form !== null && (
        <Modal onClose={() => setForm(null)} titleId={titleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 id={titleId} className="text-lg font-bold text-gray-900 mb-4">{form.id ? 'Edit' : 'New'} Course</h3>
            <div className="space-y-3">
              <div><label className={lbl}>Name *</label><input value={form.name ?? ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} /></div>
              <div><label className={lbl}>Code</label><input value={form.code ?? ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className={inp} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Duration (months)</label><input type="number" value={form.duration_months ?? ''} onChange={e => setForm(p => ({ ...p, duration_months: Number(e.target.value) }))} className={inp} /></div>
                <div><label className={lbl}>Fee</label><input type="number" value={form.fee ?? ''} onChange={e => setForm(p => ({ ...p, fee: Number(e.target.value) }))} className={inp} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setForm(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
        </Modal>
      )}
    </div>
  );
}

// ── Institutes Tab ────────────────────────────────────────────────────────────

function InstituteFormModal({ editing, onClose, onSaved }: { editing?: Institute | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Institute>>(editing ?? { institute_type: 'School', status: 'Prospect' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();

  const f = (field: keyof Institute) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.name?.trim()) { setError('Institute name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, approx_student_count: form.approx_student_count ? Number(form.approx_student_count) : null };
      if (editing) await leadFetch(`/institutes/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await leadFetch('/institutes/', { method: 'POST', body: JSON.stringify(payload) });
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
      <div className="flex items-center justify-between p-5 border-b border-gray-200">
        <h3 id={titleId} className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'New'} Institute</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>
      <div className="p-5 space-y-3">
        <ErrorBanner message={error} />
        <div><label className={lbl}>Institute Name *</label>
          <input value={form.name ?? ''} onChange={f('name')} className={inp} placeholder="e.g. Kalshi High School" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Type</label>
            <select value={form.institute_type ?? 'School'} onChange={f('institute_type')} className={inp}>
              {INSTITUTE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Status</label>
            <select value={form.status ?? 'Prospect'} onChange={f('status')} className={inp}>
              {INSTITUTE_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div><label className={lbl}>Location</label>
          <input value={form.location ?? ''} onChange={f('location')} className={inp} placeholder="Area, city" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Contact Person Name</label>
            <input value={form.contact_person_name ?? ''} onChange={f('contact_person_name')} className={inp} />
          </div>
          <div><label className={lbl}>Designation</label>
            <input value={form.contact_person_designation ?? ''} onChange={f('contact_person_designation')} className={inp} placeholder="e.g. Headmaster" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl}>Contact Phone</label>
            <input value={form.contact_person_phone ?? ''} onChange={f('contact_person_phone')} className={inp} />
          </div>
          <div><label className={lbl}>Approx. Student Count</label>
            <input type="number" min="0" value={form.approx_student_count ?? ''} onChange={f('approx_student_count')} className={inp} />
          </div>
        </div>
        <div><label className={lbl}>Notes</label>
          <textarea value={form.notes ?? ''} onChange={f('notes')} rows={2} className={`${inp} resize-none`} />
        </div>
      </div>
      <div className="flex gap-3 p-5 border-t border-gray-200">
        <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
        <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  );
}

function InstitutesTab() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Institute | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<Institute | null>(null);
  const deleteTitleId = useId();

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '100' });
    if (search) qs.set('search', search);
    leadFetch<{ data: Institute[]; total: number }>(`/institutes/?${qs}`)
      .then(r => { setInstitutes(r.data); setTotal(r.total); })
      .catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search]);

  const remove = async () => {
    if (!deleting) return;
    try { await leadFetch(`/institutes/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, location, contact person…" className={`pl-9 ${inp} mt-0 w-full`} />
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] whitespace-nowrap shrink-0">
          <Plus size={16} />Add Institute
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Contact Person</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-right">Students</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {institutes.map(i => (
                  <tr key={i.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3 text-gray-600">{i.institute_type}</td>
                    <td className="px-4 py-3 text-gray-600">{i.location || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {i.contact_person_name || '—'}
                      {i.contact_person_designation && <span className="text-xs text-gray-400 block">{i.contact_person_designation}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{i.contact_person_phone || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{i.approx_student_count ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INSTITUTE_STATUS_COLORS[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditing(i); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={14} /></button>
                        <button onClick={() => setDeleting(i)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {institutes.length === 0 && (
                  <tr><td colSpan={8}>
                    <EmptyState
                      icon={Building2}
                      title="No institutes yet"
                      description="Add schools, colleges, or coaching centers you're reaching out to for outreach programs."
                      action={{ label: 'Add Institute', icon: Plus, onClick: () => { setEditing(null); setShowForm(true); } }}
                    />
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          {institutes.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">Showing {institutes.length} of {total} institutes</div>
          )}
        </div>
      )}

      {showForm && (
        <InstituteFormModal editing={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={load} />
      )}
      {deleting && (
        <Modal onClose={() => setDeleting(null)} titleId={deleteTitleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 id={deleteTitleId} className="text-lg font-bold text-gray-900 mb-2">Delete Institute</h3>
          <p className="text-sm text-gray-600 mb-4">Delete <span className="font-medium">{deleting.name}</span>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button onClick={remove} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Follow-ups Tab ────────────────────────────────────────────────────────────

function FollowupFormModal({ leads, initialLeadId, onClose, onSaved }: { leads: Lead[]; initialLeadId?: number; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [outcomeTags, setOutcomeTags] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [existingCount, setExistingCount] = useState(0);
  const [courses, setCourses] = useState<Course[]>([]);
  const titleId = useId();
  const [form, setForm] = useState({
    lead_id: initialLeadId ? String(initialLeadId) : '', followup_date: new Date().toISOString().slice(0, 10), method: 'Call',
    comment: '', next_followup_date: '', created_by: '', new_status: '', new_course_id: '',
  });
  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const toggleOutcome = (option: string) => {
    setOutcomeTags(prev => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
  };

  useEffect(() => {
    leadFetch<{ data: Course[] }>('/courses/').then(r => setCourses(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (!form.lead_id) { setExistingCount(0); return; }
    leadFetch<{ data: Followup[] }>(`/followups/?lead_id=${form.lead_id}`)
      .then(r => setExistingCount(r.data.length))
      .catch(() => setExistingCount(0));
  }, [form.lead_id]);

  const selectedLead = leads.find(l => String(l.id) === form.lead_id);
  const nextAttempt = existingCount + 1;
  const limitReached = form.lead_id !== '' && nextAttempt > MAX_FOLLOWUP_ATTEMPTS;

  const save = async () => {
    setError('');
    if (!form.lead_id) { setError('Select a lead'); return; }
    if (limitReached) { setError(`Maximum of ${MAX_FOLLOWUP_ATTEMPTS} follow-up attempts reached for this lead`); return; }
    setSaving(true);
    try {
      const outcome = [
        ...outcomeTags.filter(o => o !== 'Other'),
        ...(outcomeTags.includes('Other') && otherText.trim() ? [`Other: ${otherText.trim()}`] : []),
      ].join(', ');
      await leadFetch('/followups/', { method: 'POST', body: JSON.stringify({ ...form, lead_id: Number(form.lead_id), outcome }) });
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose} titleId={titleId} containerClassName="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 id={titleId} className="text-lg font-bold text-gray-900">Log Follow-up</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div><label className={lbl}>Lead *</label>
            {initialLeadId ? (
              <div className={`${inp} bg-gray-50 text-gray-700`}>{selectedLead ? `${selectedLead.full_name} (${selectedLead.phone})` : '—'}</div>
            ) : (
              <select value={form.lead_id} onChange={f('lead_id')} className={inp}>
                <option value="">Select</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.full_name} ({l.phone})</option>)}
              </select>
            )}
            {form.lead_id !== '' && (
              limitReached ? (
                <p className="text-xs text-red-600 mt-1">Maximum of {MAX_FOLLOWUP_ATTEMPTS} follow-up attempts already reached for this lead.</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">This will be logged as the {ordinal(nextAttempt)} follow-up for this lead.</p>
              )
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Date</label><input type="date" value={form.followup_date} onChange={f('followup_date')} className={inp} /></div>
            <div><label className={lbl}>Method</label>
              <select value={form.method} onChange={f('method')} className={inp}>{METHODS.map(m => <option key={m}>{m}</option>)}</select>
            </div>
          </div>
          <div>
            <label className={lbl}>Outcome</label>
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
              {OUTCOME_OPTIONS.map(option => (
                <label key={option} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={outcomeTags.includes(option)} onChange={() => toggleOutcome(option)} />
                  {option}
                </label>
              ))}
            </div>
            {outcomeTags.includes('Other') && (
              <input value={otherText} onChange={e => setOtherText(e.target.value)} placeholder="Briefly describe…" className={`${inp} mt-2`} />
            )}
          </div>
          <div><label className={lbl}>Comment</label>
            <textarea value={form.comment} onChange={f('comment')} rows={2} placeholder="Any additional notes about this follow-up…" className={`${inp} resize-none`} />
          </div>
          <div><label className={lbl}>Next Follow-up Date</label><input type="date" value={form.next_followup_date} onChange={f('next_followup_date')} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Update Status</label>
              <select value={form.new_status} onChange={f('new_status')} className={inp}>
                <option value="">Keep current</option>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={lbl}>Update Course</label>
              <select value={form.new_course_id} onChange={f('new_course_id')} className={inp}>
                <option value="">Keep current</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving || limitReached} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
        </div>
    </Modal>
  );
}

function FollowupsTab() {
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (dueOnly) qs.set('due_before', new Date().toISOString().slice(0, 10));
    if (dateFilter) qs.set('date', dateFilter);
    if (statusFilter) qs.set('status', statusFilter);
    Promise.all([
      leadFetch<{ data: Followup[] }>(`/followups/?${qs}`),
      leadFetch<{ data: Lead[] }>('/?limit=200'),
    ]).then(([fr, lr]) => { setFollowups(fr.data); setLeads(lr.data); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [dueOnly, dateFilter, statusFilter]);

  const visibleFollowups = search.trim()
    ? followups.filter(fu => {
        const q = search.trim().toLowerCase();
        return fu.lead_name?.toLowerCase().includes(q) || fu.lead_phone?.toLowerCase().includes(q);
      })
    : followups;

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-nowrap items-center gap-3">
        <div className="relative flex-[2] min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by lead name, phone…" className={`pl-9 ${inp} mt-0 w-full`} />
        </div>
        <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`}>
          <option value="">All Lead Status</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap shrink-0">
          <input type="checkbox" checked={dueOnly} onChange={e => setDueOnly(e.target.checked)} />
          Due or overdue only
        </label>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] whitespace-nowrap shrink-0">
          <Plus size={16} />Log Follow-up
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Lead</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Course</th>
                <th className="px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Comment</th>
                <th className="px-4 py-3 text-left">Next Follow-up</th>
                <th className="px-4 py-3 text-center">Lead Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleFollowups.map(fu => (
                <tr key={fu.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{fu.lead_name}</p>
                    <p className="text-xs text-gray-400">{fu.lead_phone} · {ordinal(fu.attempt_number)} follow-up</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(fu.followup_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{fu.method}</td>
                  <td className="px-4 py-3 text-gray-600">{fu.lead_course_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px]">{fu.outcome || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 italic max-w-[220px]">{fu.comment || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fu.next_followup_date ? <span className="text-amber-600">{fmtDate(fu.next_followup_date)}</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[fu.lead_status ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>{fu.lead_status}</span>
                  </td>
                </tr>
              ))}
              {visibleFollowups.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400 text-sm">No follow-ups found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <FollowupFormModal leads={leads} onClose={() => setShowForm(false)} onSaved={load} />}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

const TH = 'border:1px solid #e5e7eb;padding:6px 10px;font-size:12px;text-align:left;background:#f9fafb;font-weight:600;color:#374151';
const TD = 'border:1px solid #e5e7eb;padding:6px 10px;font-size:12px;text-align:left;color:#1f2937';
const REPORT_TABLE_STYLE = 'width:100%;border-collapse:collapse;margin:6px 0 4px';

function buildReportBodyHtml(dash: DashboardData, rep: ReportsData, periodLabel?: string) {
  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const barTable = (title: string, colLabel: string, rows: { label: string; value: number }[]) => `
    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827">${title}</h3>
    <table style="${REPORT_TABLE_STYLE}"><thead><tr><th style="${TH}">${colLabel}</th><th style="${TH}">Count</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td style="${TD}">${r.label}</td><td style="${TD}">${r.value}</td></tr>`).join('') || `<tr><td style="${TD}" colspan="2">No data</td></tr>`}</tbody></table>`;

  return `
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280">Generated on ${generatedOn}</p>
    ${periodLabel ? `<p style="margin:0 0 16px;font-size:13px;color:#6b7280">Period: ${periodLabel}</p>` : '<div style="margin-bottom:16px"></div>'}
    <p style="margin:0 0 4px;font-size:13px"><strong>Total Leads:</strong> ${dash.lead_stats.total_leads} &nbsp;·&nbsp;
       <strong>Admitted:</strong> ${dash.lead_stats.admitted_leads} &nbsp;·&nbsp;
       <strong>Conversion Rate:</strong> ${dash.lead_stats.conversion_rate}%</p>
    ${barTable('Admitted in a Month', 'Month', rep.admitted_by_month.map(m => ({ label: m.month_label, value: m.count })))}
    ${barTable('Follow-up Calls by Month', 'Month', rep.followup_calls_by_month.map(m => ({ label: m.month_label, value: m.total_calls })))}
    ${barTable('Lost Leads by Source', 'Source', rep.lost_by_source.map(s => ({ label: s.source, value: s.count })))}
    ${barTable('New Leads by Month', 'Month', rep.new_leads_by_month.map(m => ({ label: m.month_label, value: m.count })))}
    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827">Conversion by Course</h3>
    <table style="${REPORT_TABLE_STYLE}"><thead><tr><th style="${TH}">Course</th><th style="${TH}">Leads</th><th style="${TH}">Admitted</th><th style="${TH}">Conversion</th></tr></thead>
    <tbody>${rep.course_conversion.map(c => `<tr><td style="${TD}">${c.course_name}</td><td style="${TD}">${c.total_leads}</td><td style="${TD}">${c.admitted}</td><td style="${TD}">${c.conversion_pct ?? 0}%</td></tr>`).join('') || `<tr><td style="${TD}" colspan="4">No data</td></tr>`}</tbody></table>
    <h3 style="margin:20px 0 8px;font-size:15px;color:#111827">Staff Performance</h3>
    <table style="${REPORT_TABLE_STYLE}"><thead><tr><th style="${TH}">Assigned To</th><th style="${TH}">Leads</th><th style="${TH}">Admitted</th></tr></thead>
    <tbody>${rep.staff_performance.map(s => `<tr><td style="${TD}">${s.assigned_to}</td><td style="${TD}">${s.total_leads}</td><td style="${TD}">${s.admitted}</td></tr>`).join('') || `<tr><td style="${TD}" colspan="3">No data</td></tr>`}</tbody></table>
  `;
}

type ReportPeriod = 'all' | 'this_month' | 'last_month' | 'custom';

function toISODate(d: Date) { return d.toISOString().slice(0, 10); }

function getReportRange(period: ReportPeriod, customFrom: string, customTo: string): { from: string; to: string } | null {
  const now = new Date();
  if (period === 'this_month') {
    return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) };
  }
  if (period === 'last_month') {
    return {
      from: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      to: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (period === 'custom' && customFrom && customTo) {
    return { from: customFrom, to: customTo };
  }
  return null;
}

function ReportsTab() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [rep, setRep] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [period, setPeriod] = useState<ReportPeriod>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyFollowups, setDailyFollowups] = useState<Followup[] | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const range = getReportRange(period, customFrom, customTo);

  useEffect(() => {
    setDailyLoading(true);
    leadFetch<{ data: Followup[] }>(`/followups/?date=${dailyDate}`)
      .then(r => setDailyFollowups(r.data))
      .catch(console.error).finally(() => setDailyLoading(false));
  }, [dailyDate]);

  useEffect(() => {
    setLoading(true);
    const qs = range ? `?from=${range.from}&to=${range.to}` : '';
    Promise.all([
      leadFetch<DashboardData>('/dashboard/'),
      leadFetch<ReportsData>(`/reports/${qs}`),
    ]).then(([d, r]) => {
      setDash(d);
      // Drop legacy source values that are no longer in the current source list.
      setRep({ ...r, lost_by_source: r.lost_by_source.filter(s => SOURCES.includes(s.source)) });
    }).catch(console.error).finally(() => setLoading(false));
  }, [period, customFrom, customTo]);

  const exportExcel = () => {
    if (!dash || !rep) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.admitted_by_month), 'Admitted by Month');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.followup_calls_by_month), 'Follow-up Calls');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.lost_by_source), 'Lost by Source');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.new_leads_by_month), 'New Leads by Month');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.course_conversion), 'Course Conversion');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rep.staff_performance), 'Staff Performance');
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(leadsByDateStatus.map(({ date, ...row }) => row)),
      'Daily Lead Summary'
    );
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'lead-management-report.xlsx'; link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => window.print();

  if (loading) return <div className="text-center py-12 text-gray-400">Loading…</div>;
  if (!dash || !rep) return null;

  const periodLabel = period === 'all' ? undefined
    : period === 'this_month' ? 'This Month'
    : period === 'last_month' ? 'Last Month'
    : range ? `${fmtDate(range.from)} to ${fmtDate(range.to)}` : undefined;

  const summaryCards = [
    { label: 'Total Leads', value: dash.lead_stats.total_leads },
    { label: 'Admitted', value: dash.lead_stats.admitted_leads },
    { label: 'Conversion Rate', value: `${dash.lead_stats.conversion_rate}%` },
    { label: 'Follow-ups Due', value: dash.overdue_followups },
  ];

  // One combined timeline instead of three separate bar-lists — merges New
  // Leads / Admitted / Follow-up Calls by month, keyed on the raw `month`
  // value (not the label) so the merge is correct even if a month is
  // present in one series but not another.
  const monthMap = new Map<string, { month: string; month_label: string; new: number; admitted: number; calls: number }>();
  for (const m of rep.new_leads_by_month) monthMap.set(m.month, { month: m.month, month_label: m.month_label, new: m.count, admitted: 0, calls: 0 });
  for (const m of rep.admitted_by_month) {
    const row = monthMap.get(m.month) ?? { month: m.month, month_label: m.month_label, new: 0, admitted: 0, calls: 0 };
    row.admitted = m.count; monthMap.set(m.month, row);
  }
  for (const m of rep.followup_calls_by_month) {
    const row = monthMap.get(m.month) ?? { month: m.month, month_label: m.month_label, new: 0, admitted: 0, calls: 0 };
    row.calls = m.total_calls; monthMap.set(m.month, row);
  }
  const monthlyTrendData = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));

  const admittedByAttemptsData = dash.admitted_by_attempts.map(a => ({
    label: a.attempts === 0 ? 'No calls logged' : `${ordinal(a.attempts)} call`,
    value: a.lead_count,
  }));

  // Every current lead source, zero-filled if it has no data yet; legacy
  // sources no longer in the list are dropped.
  const bySourceMap = new Map(dash.status_by_source.map(row => [row.source, row]));
  const emptyRow = { new: 0, contacted: 0, interested: 0, followup: 0, admitted: 0, lost: 0 };
  const statusBySource = SOURCES.map(s => ({ source: s, ...emptyRow, ...bySourceMap.get(s) }));

  // Pivot leads_by_date_status (one row per date+status) into one row per
  // date with a column per status, newest date first.
  const dateStatusMap = new Map<string, { date: string; date_label: string } & Record<string, number>>();
  for (const row of rep.leads_by_date_status) {
    const existing = dateStatusMap.get(row.date) ?? { date: row.date, date_label: row.date_label };
    existing[row.status] = row.count;
    dateStatusMap.set(row.date, existing);
  }
  const leadsByDateStatus = [...dateStatusMap.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(row => ({ ...row, total: STATUSES.reduce((sum, s) => sum + (row[s] ?? 0), 0) }));

  const sectionHead = 'text-xs font-semibold uppercase tracking-wide text-[#14856E] mb-1';

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #lead-report-print-root { visibility: visible; display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: white; padding: 32px; }
          #lead-report-print-root * { visibility: visible; }
        }
        @media screen {
          #lead-report-print-root { display: none; }
        }
      `}</style>

      <div className="flex flex-nowrap items-center gap-3">
        <select value={period} onChange={e => setPeriod(e.target.value as ReportPeriod)} className={`${inp} mt-0 flex-1 min-w-0`}>
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="last_month">Last Month</option>
          <option value="custom">Specific Date Range…</option>
        </select>
        {period === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`} />
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={`${inp} mt-0 flex-1 min-w-0`} />
          </>
        )}
        <div className="flex gap-3 shrink-0 ml-auto">
        <button onClick={() => setShowEmail(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          <Mail size={16} />Email Report
        </button>
        <button onClick={exportPdf} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
          <Printer size={16} />Export PDF
        </button>
        <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Download size={16} />Export to Excel
        </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className={sectionHead}>Daily Call Activity</p>
          <input type="date" value={dailyDate} onChange={e => setDailyDate(e.target.value)} className={`${inp} mt-0 w-auto`} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 mt-2">
          {dailyLoading ? (
            <p className="text-center py-8 text-gray-400 text-sm">Loading…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 border-b border-gray-200">
                <div>
                  <p className="text-2xl font-bold text-[#14856E]">{dailyFollowups?.filter(f => f.method === 'Call').length ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Calls Conducted</p>
                </div>
                {METHODS.filter(m => m !== 'Call').map(m => (
                  <div key={m}>
                    <p className="text-2xl font-bold text-gray-900">{dailyFollowups?.filter(f => f.method === m).length ?? 0}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m}</p>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {(dailyFollowups ?? []).map(fu => (
                  <div key={fu.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <span className="text-gray-800 font-medium">{fu.lead_name}</span>
                      <span className="text-gray-400"> · {fu.lead_phone} · {fu.method}</span>
                      {fu.outcome && <span className="text-gray-500"> — {fu.outcome}</span>}
                    </div>
                    {fu.created_by && <span className="text-xs text-gray-400 shrink-0 ml-2">{fu.created_by}</span>}
                  </div>
                ))}
                {(dailyFollowups ?? []).length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No follow-up activity on this day</p>}
              </div>
            </>
          )}
        </div>
      </div>

      <div>
        <p className={sectionHead}>Monthly Trends</p>
        <div className="bg-white rounded-xl border border-gray-200 p-5 mt-2">
          {monthlyTrendData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month_label" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="new" name="New Leads" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="admitted" name="Admitted" stroke="#14856E" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="calls" name="Follow-up Calls" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div>
        <p className={sectionHead}>Distribution</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Lost Leads by Source</h3>
            {rep.lost_by_source.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={rep.lost_by_source} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="source" stroke="#9ca3af" tick={{ fontSize: 12 }} width={110} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="count" name="Lost" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Admitted by Follow-up Calls</h3>
            {admittedByAttemptsData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-16">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={admittedByAttemptsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                  <Bar dataKey="value" name="Admitted" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div>
        <p className={sectionHead}>Follow-up Status by Source</p>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-right">New</th>
                  <th className="px-4 py-2 text-right">Contacted</th>
                  <th className="px-4 py-2 text-right">Interested</th>
                  <th className="px-4 py-2 text-right">Follow-up</th>
                  <th className="px-4 py-2 text-right">Admitted</th>
                  <th className="px-4 py-2 text-right">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {statusBySource.map(row => (
                  <tr key={row.source}>
                    <td className="px-4 py-2.5 text-gray-800 font-medium">{row.source}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.new}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.contacted}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.interested}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{row.followup}</td>
                    <td className="px-4 py-2.5 text-right text-green-700 font-medium">{row.admitted}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{row.lost}</td>
                  </tr>
                ))}
                {statusBySource.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className={sectionHead}>Daily Lead Summary</p>
          {period === 'all' && <span className="text-xs text-gray-400">Trailing 30 days (select a period above for a wider range)</span>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-2">
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  {STATUSES.map(s => <th key={s} className="px-4 py-2 text-right">{s}</th>)}
                  <th className="px-4 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leadsByDateStatus.map(row => (
                  <tr key={row.date}>
                    <td className="px-4 py-2.5 text-gray-800 font-medium whitespace-nowrap">{row.date_label}</td>
                    {STATUSES.map(s => (
                      <td key={s} className={`px-4 py-2.5 text-right ${s === 'Admitted' ? 'text-green-700 font-medium' : s === 'Lost' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {row[s] ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{row.total}</td>
                  </tr>
                ))}
                {leadsByDateStatus.length === 0 && (
                  <tr><td colSpan={STATUSES.length + 2} className="text-center py-6 text-gray-400">No leads in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <p className={sectionHead}>Performance</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200"><h3 className="font-semibold text-gray-800">Conversion by Course</h3></div>
            {rep.course_conversion.length > 0 && (
              <div className="px-4 pt-4">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={rep.course_conversion}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="course_name" stroke="#9ca3af" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="total_leads" name="Leads" fill="#93C5FD" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="admitted" name="Admitted" fill="#14856E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr><th className="px-4 py-2 text-left">Course</th><th className="px-4 py-2 text-right">Leads</th><th className="px-4 py-2 text-right">Admitted</th><th className="px-4 py-2 text-right">Conversion</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rep.course_conversion.map(c => (
                    <tr key={c.course_name}>
                      <td className="px-4 py-2.5 text-gray-800">{c.course_name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{c.total_leads}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{c.admitted}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{c.conversion_pct ?? 0}%</td>
                    </tr>
                  ))}
                  {rep.course_conversion.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200"><h3 className="font-semibold text-gray-800">Staff Performance</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr><th className="px-4 py-2 text-left">Assigned To</th><th className="px-4 py-2 text-right">Leads</th><th className="px-4 py-2 text-right">Admitted</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rep.staff_performance.map(s => (
                    <tr key={s.assigned_to}>
                      <td className="px-4 py-2.5 text-gray-800">{s.assigned_to}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{s.total_leads}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{s.admitted}</td>
                    </tr>
                  ))}
                  {rep.staff_performance.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-gray-400">No data</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Printable version (hidden on screen) */}
      <div id="lead-report-print-root">
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#111' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #14856E', paddingBottom: '12px', marginBottom: '16px' }}>
            <h1 style={{ color: '#14856E', fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Sombhabona Foundation</h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Lead Management Report</p>
          </div>
          <div dangerouslySetInnerHTML={{ __html: buildReportBodyHtml(dash, rep, periodLabel) }} />
        </div>
      </div>

      {showEmail && (
        <ShareEmailModal
          defaultSubject="Lead Management Report"
          getHtml={(logo) => buildEmailHtml('Lead Management Report', 'Monthly Summary', buildReportBodyHtml(dash, rep, periodLabel), logo)}
          onClose={() => setShowEmail(false)}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'leads' | 'courses' | 'institutes' | 'followups' | 'admissions' | 'reports';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'courses', label: 'Courses', icon: BookOpen },
  { id: 'institutes', label: 'Institutes', icon: Building2 },
  { id: 'followups', label: 'Follow-ups', icon: PhoneCall },
  { id: 'admissions', label: 'Admissions', icon: GraduationCap },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
];

export function LeadManagement() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <img src="/logo.png" alt="Sombhabona" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Lead Management</h1>
        <p className="text-sm text-gray-600 mt-1">ICT student lead pipeline, follow-ups and admissions</p>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'dashboard'  && <DashboardTab />}
      {tab === 'leads'      && <LeadsTab />}
      {tab === 'courses'    && <CoursesTab />}
      {tab === 'institutes' && <InstitutesTab />}
      {tab === 'followups'  && <FollowupsTab />}
      {tab === 'admissions' && <AdmissionsTab />}
      {tab === 'reports'    && <ReportsTab />}
    </div>
  );
}
