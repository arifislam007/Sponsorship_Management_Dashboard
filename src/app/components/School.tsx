import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, ClipboardList, BarChart2,
  Plus, Search, X, Edit2, CheckCircle2, XCircle, Clock, Printer,
  ChevronDown, Save, Send, Trash2, BookOpen, TrendingUp, AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScClass { id: number; name: string; branch?: string; class_teacher?: string; student_count?: number; total_students?: number; is_active: boolean; }
interface Student { id: number; student_code: string; full_name: string; class_id?: number; class_name?: string; gender?: string; guardian_name?: string; guardian_mobile?: string; is_active: boolean; }
interface AttendanceRecord { student_id: number; full_name: string; student_code: string; status: 'Present' | 'Absent' | 'Late'; notes?: string; attendance_id?: number; }
interface AttendanceSummary { attendance_date: string; class_id: number; class_name: string; total: number; present: number; absent: number; late: number; pct: number; }
interface MonitoringItem { item_key: string; item_label: string; response: boolean | null; comment?: string; }
interface MonitoringForm {
  id: number; form_code: string; monitoring_date: string;
  class_id?: number; class_name?: string; branch?: string; class_teacher?: string;
  observer_name: string; status: 'Draft' | 'Submitted';
  overall_rating?: string; good_points?: string; improvement_areas?: string; next_week_actions?: string;
  yes_count: number; score_percent: number; items?: MonitoringItem[];
  created_at: string;
}
interface DashboardData {
  total_students: number; active_students: number; total_classes: number;
  today_attendance: { total_records: number; present: number; absent: number; late: number; percentage: number };
  recent_monitoring: MonitoringForm[];
  pending_monitoring: number;
  monthly_attendance: { month: string; month_label: string; avg_pct: number; total_attended: number; total_students: number }[];
  monthly_evaluation: { month: string; month_label: string; avg_score: number; count: number }[];
  this_month_by_class: { class_name: string; avg_pct: number; total_attended: number; total_students: number; days_recorded: number }[];
  top_eval_classes: { class_name: string; avg_score: number; total_evals: number }[];
  eval_overall: { total_evals: number; submitted_evals: number; avg_eval_score: number };
}

// ── API Helper ─────────────────────────────────────────────────────────────────

const SCHOOL_API = '/api/school';

async function schoolFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${SCHOOL_API}${path}`, {
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

// ── Constants ──────────────────────────────────────────────────────────────────

const MONITORING_ITEMS_DEF: { key: string; label: string }[] = [
  { key: 'student_attendance_90',       label: 'শিক্ষার্থীদের উপস্থিতি (৯০% বা তার বেশি)' },
  { key: 'teacher_on_time',             label: 'শিক্ষক সময়মতো উপস্থিত' },
  { key: 'syllabus_followed',           label: 'সিলেবাস অনুযায়ী পাঠদান' },
  { key: 'homework_given_evaluated',    label: 'বাড়ির কাজ দেওয়া ও মূল্যায়ন' },
  { key: 'student_participation',       label: 'শিক্ষার্থীদের পাঠে অংশগ্রহণ' },
  { key: 'language_practice',           label: 'বাংলা ও ইংরেজি ভাষায় কথা বলার অভ্যাস' },
  { key: 'math_progress',              label: 'গণিত চর্চার অগ্রগতি' },
  { key: 'classroom_clean',            label: 'শ্রেণিকক্ষ পরিচ্ছন্ন' },
  { key: 'teacher_student_relation',   label: 'শিক্ষক-শিক্ষার্থী সম্পর্ক ভালো' },
  { key: 'learning_materials',         label: 'শিক্ষাসামগ্রী ব্যবহার' },
  { key: 'weak_students_support',      label: 'দুর্বল শিক্ষার্থীদের সহায়তা' },
  { key: 'talented_students_encouraged', label: 'মেধাবী শিক্ষার্থীদের উৎসাহ প্রদান' },
  { key: 'parent_communication',       label: 'অভিভাবকের সঙ্গে যোগাযোগ' },
  { key: 'classroom_environment',      label: 'শ্রেণিকক্ষের পরিবেশ সুন্দর' },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', icon: CalendarDays },
  { id: 'monitoring', label: 'Evaluation', icon: ClipboardList },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
];

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

function BarChart({ bars, colorFn, maxVal }: {
  bars: { label: string; value: number; sub?: string }[];
  colorFn: (v: number) => string;
  maxVal?: number;
}) {
  const max = maxVal ?? Math.max(...bars.map(b => b.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {bars.map((b, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] font-semibold text-gray-600">{b.value > 0 ? `${b.value}%` : ''}</span>
          <div className="w-full flex flex-col justify-end" style={{ height: '72px' }}>
            <div
              className={`w-full rounded-t transition-all ${colorFn(b.value)}`}
              style={{ height: `${Math.max((b.value / max) * 72, b.value > 0 ? 4 : 0)}px` }}
            />
          </div>
          <span className="text-[10px] text-gray-500 text-center leading-tight truncate w-full">{b.label}</span>
          {b.sub && <span className="text-[9px] text-gray-400 truncate w-full text-center">{b.sub}</span>}
        </div>
      ))}
    </div>
  );
}

function DashboardTab({ classes }: { classes: ScClass[] }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    schoolFetch<DashboardData>('/dashboard/')
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading…</div>;
  if (!data) return null;

  const ta = data.today_attendance;
  const eo = data.eval_overall;

  const statCards = [
    { label: 'Total Classes', value: data.total_classes, icon: BookOpen, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    { label: 'Today Present', value: ta.total_records > 0 ? `${ta.present}/${ta.total_records}` : '—', icon: CalendarDays, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
    { label: "Today's Att. %", value: ta.total_records > 0 ? `${ta.percentage}%` : '—', icon: TrendingUp, color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
    { label: 'Total Evaluations', value: eo?.total_evals ?? 0, icon: ClipboardList, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Avg Eval Score', value: eo?.avg_eval_score ? `${eo.avg_eval_score}%` : '—', icon: BarChart2, color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
    { label: 'Pending Evals', value: data.pending_monitoring, icon: AlertCircle, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  ];

  const attColor = (v: number) => v >= 90 ? 'bg-emerald-500' : v >= 75 ? 'bg-teal-400' : v >= 60 ? 'bg-yellow-400' : 'bg-red-400';
  const evalColor = (v: number) => v >= 90 ? 'bg-emerald-500' : v >= 70 ? 'bg-teal-400' : v >= 50 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div className="space-y-5">

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map(c => (
          <div key={c.label} className={`bg-white rounded-xl border ${c.border} p-4`}>
            <div className={`inline-flex p-2 rounded-lg ${c.color} mb-2`}><c.icon size={16} /></div>
            <p className="text-xs text-gray-500 leading-tight">{c.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Today's attendance bar */}
      {ta.total_records > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800 text-sm">Today's Attendance</h3>
            <span className="text-sm font-bold text-[#14856E]">{ta.percentage}%</span>
          </div>
          <div className="flex gap-4 text-xs mb-3 flex-wrap">
            <span className="flex items-center gap-1 text-green-700"><CheckCircle2 size={12} /> Present <strong>{ta.present}</strong></span>
            <span className="flex items-center gap-1 text-red-600"><XCircle size={12} /> Absent <strong>{ta.absent}</strong></span>
            <span className="flex items-center gap-1 text-amber-600"><Clock size={12} /> Late <strong>{ta.late}</strong></span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex">
            <div className="h-full bg-[#14856E]" style={{ width: `${ta.percentage}%` }} />
            <div className="h-full bg-amber-400" style={{ width: `${ta.total_records > 0 ? Math.round(ta.late/ta.total_records*100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Monthly Attendance Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Attendance Trend (Last 6 Months)</h3>
          {data.monthly_attendance.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs">No attendance data recorded yet</p>
          ) : (
            <BarChart
              bars={data.monthly_attendance.map(m => ({
                label: m.month_label,
                value: Number(m.avg_pct ?? 0),
              }))}
              colorFn={attColor}
              maxVal={100}
            />
          )}
          {data.monthly_attendance.length > 0 && (
            <div className="mt-3 flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥90%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-teal-400 inline-block" /> ≥75%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-400 inline-block" /> ≥60%</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &lt;60%</span>
            </div>
          )}
        </div>

        {/* Monthly Evaluation Score Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 text-sm mb-4">Evaluation Score Trend (Last 6 Months)</h3>
          {data.monthly_evaluation.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs">No submitted evaluations yet</p>
          ) : (
            <BarChart
              bars={data.monthly_evaluation.map(m => ({
                label: m.month_label,
                value: Number(m.avg_score ?? 0),
                sub: `${m.count} eval${m.count !== 1 ? 's' : ''}`,
              }))}
              colorFn={evalColor}
              maxVal={100}
            />
          )}
        </div>
      </div>

      {/* This Month Class Attendance + Top Eval Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* This month by class */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">This Month — Attendance by Class</h3>
          </div>
          {data.this_month_by_class.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs">No attendance recorded this month</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-right">Days</th>
                  <th className="px-4 py-2 text-right">Attended</th>
                  <th className="px-4 py-2 text-left">Avg %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.this_month_by_class.map((r, i) => {
                  const pct = Number(r.avg_pct ?? 0);
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{r.class_name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{r.days_recorded}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{r.total_attended}/{r.total_students}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${attColor(pct)}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={`font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-teal-600' : pct >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Top evaluation classes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm">Evaluation Performance by Class</h3>
          </div>
          {data.top_eval_classes.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-xs">No submitted evaluations yet</p>
          ) : (
            <div className="p-4 space-y-3">
              {data.top_eval_classes.map((r, i) => {
                const pct = Number(r.avg_score ?? 0);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{r.class_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400">{r.total_evals} eval{r.total_evals !== 1 ? 's' : ''}</span>
                        <span className={`text-xs font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-teal-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${evalColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Evaluations */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 text-sm">Recent Evaluations</h3>
        </div>
        {data.recent_monitoring.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No evaluation forms yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data.recent_monitoring.map(f => {
              const pct = Number(f.score_percent ?? 0);
              return (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{f.class_name || '—'}</p>
                    <p className="text-xs text-gray-500 truncate">{fmtDate(f.monitoring_date)} · {f.observer_name}</p>
                    {f.class_teacher && <p className="text-xs text-gray-400">{f.class_teacher}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-base font-bold ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-teal-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {pct}%
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{f.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClassAttSummary {
  id: number; class_id: number; class_name: string; branch?: string;
  attendance_date: string; total_students: number; attended: number;
  absent: number; absent_percent: number; notes?: string; recorded_by?: string;
}

function _ClassAttendanceSummaryModal_UNUSED({ classes, onClose, onSaved }: {
  classes: ScClass[]; onClose: () => void; onSaved: () => void;
}) {
  // Deduplicate by name (keep first occurrence per unique name)
  const uniqueClasses = classes.filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx);

  const [selectedDate, setSelectedDate] = useState(today());
  const [entries, setEntries] = useState<{ class_id: string; total: string; attended: string; notes: string }[]>(
    uniqueClasses.map(c => ({
      class_id: String(c.id),
      total: String(c.total_students ?? c.student_count ?? 0),
      attended: '',
      notes: '',
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRow = (idx: number, field: string, val: string) =>
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: val } : e));

  const save = async () => {
    const toSave = entries.filter(e => e.attended !== '');
    if (!selectedDate) { setError('Date is required'); return; }
    if (toSave.length === 0) { setError('Enter attended count for at least one class'); return; }
    setSaving(true);
    setError('');
    try {
      await Promise.all([
        // Save attendance summaries
        ...toSave.map(e =>
          schoolFetch('/class-attendance/', {
            method: 'POST',
            body: JSON.stringify({
              class_id: Number(e.class_id),
              attendance_date: selectedDate,
              total_students: Number(e.total) || 0,
              attended: Number(e.attended),
              notes: e.notes || null,
            }),
          })
        ),
        // Persist total_students back to class record for all filled rows
        ...toSave.filter(e => Number(e.total) > 0).map(e =>
          schoolFetch(`/classes/${e.class_id}/total-students`, {
            method: 'PATCH',
            body: JSON.stringify({ total_students: Number(e.total) }),
          })
        ),
      ]);
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">শ্রেণিভিত্তিক উপস্থিতি</h3>
            <p className="text-xs text-gray-500 mt-0.5">Class-wise Attendance Summary</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div>
            <label className="text-xs font-medium text-gray-600">তারিখ *</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="mt-1 w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600">শ্রেণি</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600">মোট শিক্ষার্থী</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600">উপস্থিত</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600">অনুপস্থিত</th>
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-600">অনুপস্থিত %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((row, idx) => {
                  const total = Number(row.total) || 0;
                  const attended = row.attended !== '' ? Number(row.attended) : null;
                  const absent = attended !== null ? Math.max(0, total - attended) : null;
                  const absentPct = attended !== null && total > 0 ? Math.round((absent! / total) * 100) : null;
                  return (
                    <tr key={row.class_id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800 font-medium">
                        {uniqueClasses.find(c => String(c.id) === row.class_id)?.name}
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" value={row.total} onChange={e => setRow(idx, 'total', e.target.value)}
                          className={`${inp} text-center`} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" max={row.total || undefined} value={row.attended}
                          onChange={e => setRow(idx, 'attended', e.target.value)}
                          placeholder="—" className={`${inp} text-center`} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-sm font-medium ${absent !== null && absent > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {absent !== null ? absent : '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-sm font-bold ${absentPct !== null && absentPct > 20 ? 'text-red-600' : absentPct !== null ? 'text-green-600' : 'text-gray-400'}`}>
                          {absentPct !== null ? `${absentPct}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">শুধুমাত্র যে শ্রেণিতে উপস্থিতি সংখ্যা দেওয়া আছে সেগুলো সংরক্ষণ হবে।</p>
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">বাতিল</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm hover:bg-[#0f6b5a] disabled:opacity-50">
            <Save size={14} />{saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Attendance Tab ─────────────────────────────────────────────────────────────

function AttendanceTab({ classes }: { classes: ScClass[] }) {
  const thisMonth = today().slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pre-Primary first, then Class-1…Class-8 numerically — deduplicated by name
  const seen = new Set<string>();
  const cols = [
    ...classes.filter(c => c.name === 'Pre-Primary'),
    ...classes.filter(c => c.name !== 'Pre-Primary').sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
  ].filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });

  // total students per class_id (editable header row)
  const [totals, setTotals] = useState<Record<number, string>>({});
  // attended per date per class_id
  const [grid, setGrid] = useState<Record<string, Record<number, string>>>({});

  // All days of selected month
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const allDates = Array.from({ length: daysInMonth }, (_, i) =>
    `${month}-${String(i + 1).padStart(2, '0')}`
  );

  const load = useCallback(async (m: string) => {
    setLoading(true);
    try {
      const [yr, mn] = m.split('-');
      const from = `${yr}-${mn}-01`;
      const last = new Date(Number(yr), Number(mn), 0).getDate();
      const to   = `${yr}-${mn}-${String(last).padStart(2, '0')}`;
      const data = await schoolFetch<{ data: ClassAttSummary[] }>(`/class-attendance/?from=${from}&to=${to}`);

      const t: Record<number, string> = {};
      classes.forEach(c => { if (c.total_students) t[c.id] = String(c.total_students); });
      data.data.forEach(s => { t[s.class_id] = String(s.total_students); });
      setTotals(t);

      const g: Record<string, Record<number, string>> = {};
      data.data.forEach(s => {
        const d = s.attendance_date.slice(0, 10);
        if (!g[d]) g[d] = {};
        g[d][s.class_id] = String(s.attended);
      });
      setGrid(g);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [classes]);

  useEffect(() => { load(month); setDirty(false); setSaved(false); }, [month, load]);

  const setCell = (date: string, classId: number, val: string) => {
    setGrid(g => ({ ...g, [date]: { ...(g[date] ?? {}), [classId]: val } }));
    setDirty(true); setSaved(false);
  };

  const setTotal = (classId: number, val: string) => {
    setTotals(t => ({ ...t, [classId]: val }));
    setDirty(true); setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const ops: Promise<unknown>[] = [];
      cols.forEach(c => {
        const t = totals[c.id];
        if (t && Number(t) > 0) ops.push(schoolFetch(`/classes/${c.id}/total-students`, { method: 'PATCH', body: JSON.stringify({ total_students: Number(t) }) }));
      });
      allDates.forEach(date => {
        cols.forEach(c => {
          const val = grid[date]?.[c.id];
          if (val === undefined || val === '') return;
          ops.push(schoolFetch('/class-attendance/', {
            method: 'POST',
            body: JSON.stringify({ class_id: c.id, attendance_date: date, total_students: Number(totals[c.id] ?? 0), attended: Number(val) }),
          }));
        });
      });
      await Promise.all(ops);
      setDirty(false); setSaved(true);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const inp = 'w-12 text-center px-0 py-0.5 text-sm border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-[#14856E] focus:rounded outline-none';

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Month</span>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-40">
          <Save size={14} />{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Inline grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: `${96 + cols.length * 176}px` }}>
              <thead>
                {/* Row 1: class group headers with editable total students */}
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th rowSpan={2} className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-500 border-r border-b border-gray-200 w-24 align-middle">Date</th>
                  {cols.map(c => (
                    <th key={c.id} colSpan={4} className="px-2 py-1.5 text-center text-xs font-bold text-gray-700 border-r border-gray-200">
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{c.name}</span>
                        <span className="text-gray-400 font-normal">·</span>
                        <span className="text-gray-500 font-normal text-[10px]">Total:</span>
                        <input type="number" min="0" value={totals[c.id] ?? ''} onChange={e => setTotal(c.id, e.target.value)}
                          placeholder="0" className="w-10 text-center px-1 py-0.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#14856E]" />
                      </div>
                    </th>
                  ))}
                </tr>
                {/* Row 2: sub-column headers */}
                <tr className="border-b border-gray-200">
                  {cols.map(c => (
                    <React.Fragment key={c.id}>
                      <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-green-700 bg-green-50 whitespace-nowrap border-r border-gray-100 w-10">Present</th>
                      <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-red-600 bg-red-50 whitespace-nowrap border-r border-gray-100 w-10">Absent</th>
                      <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-green-700 bg-green-50/60 whitespace-nowrap border-r border-gray-100 w-12">P%</th>
                      <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-gray-400 bg-gray-50 whitespace-nowrap border-r border-gray-200 w-10">A%</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allDates.map((date, di) => {
                  const row = grid[date] ?? {};
                  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                  return (
                    <tr key={date} className={`border-b border-gray-100 ${di % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-[#14856E]/5`}>
                      <td className={`sticky left-0 z-10 px-3 py-1.5 text-xs font-medium text-gray-600 border-r border-gray-200 whitespace-nowrap ${di % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        {label}
                      </td>
                      {cols.map(c => {
                        const present = row[c.id] !== undefined && row[c.id] !== '' ? Number(row[c.id]) : null;
                        const total   = Number(totals[c.id]) || 0;
                        const absent  = present !== null && total > 0 ? Math.max(0, total - present) : null;
                        const pPct    = present !== null && total > 0 ? Math.round((present / total) * 100) : null;
                        const aPct    = absent  !== null && total > 0 ? Math.round((absent  / total) * 100) : null;
                        return (
                          <React.Fragment key={c.id}>
                            <td className="px-1 py-1 text-center border-r border-gray-100">
                              <input type="number" min="0" max={total || undefined}
                                value={row[c.id] ?? ''}
                                onChange={e => setCell(date, c.id, e.target.value)}
                                placeholder="·"
                                className="w-10 text-center px-0 py-0.5 text-xs border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-[#14856E] focus:rounded outline-none" />
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-100 text-red-600 font-medium">
                              {absent !== null ? absent : <span className="text-gray-200">—</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-100">
                              {pPct !== null ? <span className="font-semibold text-green-700">{pPct}%</span> : <span className="text-gray-200">—</span>}
                            </td>
                            <td className="px-2 py-1.5 text-center border-r border-gray-200">
                              {aPct !== null ? <span className={aPct > 20 ? 'text-red-500 font-semibold' : 'text-gray-400'}>{aPct}%</span> : <span className="text-gray-200">—</span>}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#14856E]/5 border-t-2 border-[#14856E]/20 font-semibold">
                  <td className="sticky left-0 bg-[#14856E]/5 px-3 py-2 text-xs font-bold text-gray-700 border-r border-gray-200">Monthly</td>
                  {cols.map(c => {
                    const mPresent = allDates.reduce((s, d) => s + (grid[d]?.[c.id] ? Number(grid[d][c.id]) : 0), 0);
                    const mDays    = allDates.filter(d => grid[d]?.[c.id]).length;
                    const mTotal   = (Number(totals[c.id]) || 0) * mDays;
                    const mAbsent  = mTotal > 0 ? mTotal - mPresent : 0;
                    const mPPct    = mTotal > 0 ? Math.round((mPresent / mTotal) * 100) : null;
                    const mAPct    = mTotal > 0 ? Math.round((mAbsent  / mTotal) * 100) : null;
                    return (
                      <React.Fragment key={c.id}>
                        <td className="px-2 py-2 text-center border-r border-gray-100 text-[#14856E] font-bold">{mDays > 0 ? mPresent : <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-2 text-center border-r border-gray-100 text-red-600 font-bold">{mTotal > 0 ? mAbsent : <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-2 text-center border-r border-gray-100 text-green-700 font-bold">{mPPct !== null ? `${mPPct}%` : <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-2 text-center border-r border-gray-200 font-bold"><span className={mAPct !== null && mAPct > 20 ? 'text-red-500' : 'text-gray-400'}>{mAPct !== null ? `${mAPct}%` : '—'}</span></td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Monitoring Form Modal ──────────────────────────────────────────────────────

function MonitoringFormModal({ formId, classes, onClose, onSaved }: {
  formId?: number; classes: ScClass[]; onClose: () => void; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [manualTeacher, setManualTeacher] = useState(false);
  const [form, setForm] = useState({
    monitoring_date: today(),
    class_id: '',
    class_name: '',
    branch: '',
    class_teacher: '',
    observer_name: '',
    good_points: '',
    improvement_areas: '',
    next_week_actions: '',
  });
  const [items, setItems] = useState<MonitoringItem[]>(
    MONITORING_ITEMS_DEF.map(m => ({ item_key: m.key, item_label: m.label, response: null, comment: '' }))
  );
  const [savedFormId, setSavedFormId] = useState<number | undefined>(formId);
  const [formStatus, setFormStatus] = useState<'Draft' | 'Submitted'>('Draft');

  useEffect(() => {
    if (formId) {
      schoolFetch<MonitoringForm & { items: MonitoringItem[] }>(`/monitoring/${formId}`)
        .then(data => {
          setForm({
            monitoring_date: data.monitoring_date?.slice(0, 10) ?? today(),
            class_id: data.class_id ? String(data.class_id) : '',
            class_name: data.class_name ?? '',
            branch: data.branch ?? '',
            class_teacher: data.class_teacher ?? '',
            observer_name: data.observer_name,
            good_points: data.good_points ?? '',
            improvement_areas: data.improvement_areas ?? '',
            next_week_actions: data.next_week_actions ?? '',
          });
          setManualTeacher(false);
          setFormStatus(data.status);
          if (data.items?.length) setItems(data.items.map(i => ({
            item_key: i.item_key, item_label: i.item_label,
            response: i.response, comment: i.comment ?? '',
          })));
        }).catch(console.error);
    }
  }, [formId]);

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const onClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const cls = classes.find(c => String(c.id) === id);
    setManualTeacher(false);
    setForm(p => ({ ...p, class_id: id, class_name: cls?.name ?? '', branch: cls?.branch ?? '', class_teacher: cls?.class_teacher ?? '' }));
  };

  const setItemResponse = (idx: number, val: boolean | null) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, response: val } : it));

  const setItemComment = (idx: number, val: string) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, comment: val } : it));

  const yesCount = items.filter(i => i.response === true).length;
  const score = Math.round((yesCount / items.length) * 100);

  const savePayload = () => ({
    ...form,
    class_id: form.class_id ? Number(form.class_id) : null,
    items,
  });

  const saveDraft = async () => {
    setError('');
    if (!form.observer_name.trim()) { setError('Observer name is required'); return; }
    if (!form.monitoring_date) { setError('Date is required'); return; }
    setSaving(true);
    try {
      if (!savedFormId) {
        const created = await schoolFetch<MonitoringForm>('/monitoring/', { method: 'POST', body: JSON.stringify(form) });
        setSavedFormId(created.id);
        await schoolFetch(`/monitoring/${created.id}`, { method: 'PUT', body: JSON.stringify(savePayload()) });
      } else {
        await schoolFetch(`/monitoring/${savedFormId}`, { method: 'PUT', body: JSON.stringify(savePayload()) });
      }
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const submitForm = async () => {
    setError('');
    setSubmitting(true);
    try {
      if (!savedFormId) {
        const created = await schoolFetch<MonitoringForm>('/monitoring/', { method: 'POST', body: JSON.stringify(form) });
        setSavedFormId(created.id);
        await schoolFetch(`/monitoring/${created.id}`, { method: 'PUT', body: JSON.stringify(savePayload()) });
        await schoolFetch(`/monitoring/${created.id}/submit`, { method: 'POST' });
      } else {
        await schoolFetch(`/monitoring/${savedFormId}`, { method: 'PUT', body: JSON.stringify(savePayload()) });
        await schoolFetch(`/monitoring/${savedFormId}/submit`, { method: 'POST' });
      }
      setFormStatus('Submitted');
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const inp = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';
  const lbl = 'text-xs font-medium text-gray-600';
  const sectionHead = 'text-xs font-semibold uppercase tracking-wide text-[#14856E] mb-3 pb-1 border-b border-green-100';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-gray-900">ডিজিটাল ক্লাস মনিটরিং</h3>
            <p className="text-xs text-gray-500 mt-0.5">Classroom Monitoring Form</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Single scrollable body */}
        <div className="p-5 space-y-6 max-h-[75vh] overflow-y-auto">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          {/* Section 1: প্রাথমিক তথ্য */}
          <div>
            <p className={sectionHead}>প্রাথমিক তথ্য</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>পর্যবেক্ষণের তারিখ *</label>
                <input type="date" value={form.monitoring_date} onChange={f('monitoring_date')} className={inp} />
              </div>
              <div>
                <label className={lbl}>শ্রেণি</label>
                <select value={form.class_id} onChange={onClassChange} className={inp}>
                  <option value="">নির্বাচন করুন</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.branch ? ` (${c.branch})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>শাখা (Branch)</label>
                <select value={form.branch} onChange={f('branch')} className={inp}>
                  <option value="">— Select —</option>
                  <option value="Morning">Morning</option>
                  <option value="Day">Day</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Class Teacher</label>
                <select
                  value={manualTeacher ? '__other__' : form.class_teacher}
                  onChange={e => {
                    if (e.target.value === '__other__') {
                      setManualTeacher(true);
                      setForm(p => ({ ...p, class_teacher: '' }));
                    } else {
                      setManualTeacher(false);
                      setForm(p => ({ ...p, class_teacher: e.target.value }));
                    }
                  }}
                  className={inp}
                >
                  <option value="">— Select —</option>
                  {[...new Set(classes.map(c => c.class_teacher).filter(Boolean))].map(t => (
                    <option key={t} value={t!}>{t}</option>
                  ))}
                  <option value="__other__">Other…</option>
                </select>
                {manualTeacher && (
                  <input
                    value={form.class_teacher}
                    onChange={e => setForm(p => ({ ...p, class_teacher: e.target.value }))}
                    placeholder="Enter teacher name"
                    autoFocus
                    className={`${inp} mt-1`}
                  />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className={lbl}>Visitor's Name *</label>
                <input value={form.observer_name} onChange={f('observer_name')} placeholder="Enter visitor name" className={inp} />
              </div>
            </div>
          </div>

          {/* Section 2: মূল্যায়ন */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-green-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#14856E]">মূল্যায়ন</p>
              <span className="text-sm font-bold text-[#14856E]">{yesCount}/{items.length} · {score}%</span>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={item.item_key} className="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
                  <div className="flex items-start gap-3">
                    <p className="flex-1 text-sm text-gray-800">{item.item_label}</p>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setItemResponse(idx, item.response === true ? null : true)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${item.response === true ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-green-400'}`}>
                        ✅ হ্যাঁ
                      </button>
                      <button onClick={() => setItemResponse(idx, item.response === false ? null : false)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${item.response === false ? 'bg-red-500 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-red-400'}`}>
                        ❌ না
                      </button>
                    </div>
                  </div>
                  <input value={item.comment ?? ''} onChange={e => setItemComment(idx, e.target.value)}
                    placeholder="মন্তব্য (ঐচ্ছিক)"
                    className="mt-2 w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#14856E] bg-white" />
                </div>
              ))}
            </div>

            {/* Auto rating */}
            <div className={`mt-3 rounded-xl p-3 border text-sm font-medium ${
              score >= 90 ? 'bg-green-50 border-green-200 text-green-800'
              : score >= 80 ? 'bg-blue-50 border-blue-200 text-blue-800'
              : score >= 70 ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              সার্বিক মূল্যায়ন: {score >= 90 ? '⭐ চমৎকার (৯০–১০০%)' : score >= 80 ? '⭐ ভালো (৮০–৮৯%)' : score >= 70 ? '⭐ সন্তোষজনক (৭০–৭৯%)' : '⭐ উন্নতি প্রয়োজন (৭০%-এর নিচে)'}
            </div>
          </div>

          {/* Section 3: মন্তব্য */}
          <div>
            <p className={sectionHead}>মন্তব্য</p>
            <div className="space-y-3">
              <div>
                <label className={lbl}>ভালো দিক</label>
                <textarea value={form.good_points} onChange={f('good_points')} rows={3} className={inp} placeholder="ইতিবাচক দিকগুলো লিখুন…" />
              </div>
              <div>
                <label className={lbl}>উন্নতির সুযোগ</label>
                <textarea value={form.improvement_areas} onChange={f('improvement_areas')} rows={3} className={inp} placeholder="যেসব বিষয়ে উন্নতি দরকার…" />
              </div>
              <div>
                <label className={lbl}>আগামী সপ্তাহের করণীয়</label>
                <textarea value={form.next_week_actions} onChange={f('next_week_actions')} rows={3} className={inp} placeholder="পরবর্তী পদক্ষেপ…" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 flex flex-wrap gap-2 justify-end">
          {formStatus !== 'Submitted' && (
            <button onClick={saveDraft} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#14856E] text-[#14856E] rounded-lg text-sm hover:bg-green-50 disabled:opacity-50">
              <Save size={14} />{saving ? 'Saving…' : 'Save Draft'}
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            <Printer size={14} />Print
          </button>
          {formStatus !== 'Submitted' && (
            <button onClick={submitForm} disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm hover:bg-[#0f6b5a] disabled:opacity-50">
              <Send size={14} />{submitting ? 'Submitting…' : 'Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Monitoring Tab ─────────────────────────────────────────────────────────────

function MonitoringTab({ classes }: { classes: ScClass[] }) {
  const [forms, setForms] = useState<MonitoringForm[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '50' });
      if (statusFilter) qs.set('status', statusFilter);
      const data = await schoolFetch<{ data: MonitoringForm[]; total: number }>(`/monitoring/?${qs}`);
      setForms(data.data); setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const deleteForm = async (id: number) => {
    if (!confirm('Delete this draft?')) return;
    try { await schoolFetch(`/monitoring/${id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {['', 'Draft', 'Submitted'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-[#14856E] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s || 'All'} {!s && total > 0 && <span className="ml-1 text-xs">({total})</span>}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditId(undefined); setShowNew(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />New Form
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Observer</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {forms.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{f.form_code}</td>
                    <td className="px-4 py-3 text-gray-700">{fmtDate(f.monitoring_date)}</td>
                    <td className="px-4 py-3 text-gray-700">{f.class_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{f.observer_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#14856E]">{f.score_percent ?? 0}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{f.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => { setEditId(f.id); setShowNew(true); }} className="p-1.5 text-gray-400 hover:text-[#14856E]"><Edit2 size={14} /></button>
                        {f.status === 'Draft' && <button onClick={() => deleteForm(f.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {forms.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">No monitoring forms</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <MonitoringFormModal
          formId={editId}
          classes={classes}
          onClose={() => { setShowNew(false); setEditId(undefined); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ── Students Tab ───────────────────────────────────────────────────────────────

function StudentsTab({ classes }: { classes: ScClass[] }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (classFilter) qs.set('class_id', classFilter);
      const data = await schoolFetch<{ data: Student[] }>(`/students/?${qs}`);
      setStudents(data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, classFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />Add Student
        </button>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Class</th>
                  <th className="px-4 py-3 text-left">Gender</th>
                  <th className="px-4 py-3 text-left">Guardian</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.full_name}</p>
                      <p className="text-xs font-mono text-gray-400">{s.student_code}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.class_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.gender || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{s.guardian_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => { setEditing(s); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-[#14856E]"><Edit2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {students.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-gray-400">No students found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <StudentFormModal
          editing={editing}
          classes={classes}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </div>
  );
}

function StudentFormModal({ editing, classes, onClose, onSaved }: {
  editing?: Student | null; classes: ScClass[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    full_name: editing?.full_name ?? '',
    class_id: editing?.class_id ? String(editing.class_id) : '',
    gender: editing?.gender ?? '',
    date_of_birth: '',
    guardian_name: editing?.guardian_name ?? '',
    guardian_mobile: editing?.guardian_mobile ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, class_id: form.class_id ? Number(form.class_id) : null };
      if (editing) {
        await schoolFetch(`/students/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await schoolFetch('/students/', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const inp = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';
  const lbl = 'text-xs font-medium text-gray-600';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">{editing ? 'Edit Student' : 'Add Student'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{error}</p>}
        <div className="space-y-3">
          <div><label className={lbl}>Full Name *</label><input value={form.full_name} onChange={f('full_name')} className={inp} /></div>
          <div><label className={lbl}>Class</label>
            <select value={form.class_id} onChange={f('class_id')} className={inp}>
              <option value="">Select</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Gender</label>
              <select value={form.gender} onChange={f('gender')} className={inp}>
                <option value="">Select</option>
                <option>Male</option><option>Female</option>
              </select>
            </div>
            <div><label className={lbl}>Date of Birth</label><input type="date" value={form.date_of_birth} onChange={f('date_of_birth')} className={inp} /></div>
          </div>
          <div><label className={lbl}>Guardian Name</label><input value={form.guardian_name} onChange={f('guardian_name')} className={inp} /></div>
          <div><label className={lbl}>Guardian Mobile</label><input value={form.guardian_mobile} onChange={f('guardian_mobile')} className={inp} /></div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Evaluation Analysis ────────────────────────────────────────────────────────

function scoreColor(pct: number | null) {
  if (pct == null) return 'text-gray-400';
  if (pct >= 90) return 'text-emerald-600';
  if (pct >= 70) return 'text-yellow-600';
  return 'text-red-600';
}
function scoreBg(pct: number | null) {
  if (pct == null) return 'bg-gray-100';
  if (pct >= 90) return 'bg-emerald-100';
  if (pct >= 70) return 'bg-yellow-100';
  return 'bg-red-100';
}
function ratingLabel(pct: number | null) {
  if (pct == null) return '—';
  if (pct >= 90) return 'Excellent';
  if (pct >= 80) return 'Good';
  if (pct >= 70) return 'Satisfactory';
  return 'Needs Improvement';
}

function EvaluationAnalysis({ classes }: { classes: ScClass[] }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [byObserver, setByObserver] = useState<any[]>([]);

  const run = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from)    qs.set('from_date', from);
      if (to)      qs.set('to_date', to);
      if (classId) qs.set('class_id', classId);
      const [sumData, itemData, obsData] = await Promise.all([
        schoolFetch<any>(`/monitoring/reports/summary?${qs}`),
        schoolFetch<{ data: any[] }>(`/monitoring/reports/by-item?${qs}`),
        schoolFetch<{ data: any[] }>(`/monitoring/reports/by-observer?${qs}`),
      ]);
      setSummary(sumData);
      setItems(itemData.data);
      setByObserver(obsData.data);
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  const inp = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Filter</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">From Date</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">To Date</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} className={inp}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button onClick={run} disabled={loading}
            className="px-5 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {loading ? 'Loading…' : 'Generate Report'}
          </button>
        </div>
      </div>

      {summary && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Evaluations', value: summary.total ?? 0, sub: null, color: 'text-gray-800' },
              { label: 'Submitted', value: summary.submitted ?? 0, sub: `${summary.total ? Math.round((summary.submitted/summary.total)*100) : 0}% of total`, color: 'text-[#14856E]' },
              { label: 'Average Score', value: `${summary.avg_score ?? 0}%`, sub: ratingLabel(summary.avg_score), color: scoreColor(summary.avg_score) },
              { label: 'Score Range', value: `${summary.min_score ?? 0}–${summary.max_score ?? 0}%`, sub: 'Min – Max', color: 'text-gray-700' },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Per-Class Performance */}
            {summary.by_class?.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Performance by Class</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Class</th>
                      <th className="px-4 py-2 text-right">Evaluations</th>
                      <th className="px-4 py-2 text-right">Avg Score</th>
                      <th className="px-4 py-2 text-left">Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.by_class.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{r.class_name || '—'}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{r.total}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${scoreColor(r.avg_score)}`}>{r.avg_score ?? 0}%</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreBg(r.avg_score)} ${scoreColor(r.avg_score)}`}>
                            {ratingLabel(r.avg_score)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* By Visitor */}
            {byObserver.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Performance by Visitor</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Visitor</th>
                      <th className="px-4 py-2 text-right">Forms</th>
                      <th className="px-4 py-2 text-right">Submitted</th>
                      <th className="px-4 py-2 text-right">Avg Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {byObserver.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{r.observer_name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{r.total_forms}</td>
                        <td className="px-4 py-2.5 text-right text-emerald-600">{r.submitted}</td>
                        <td className={`px-4 py-2.5 text-right font-bold ${scoreColor(r.avg_score)}`}>{r.avg_score ?? 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Per-Item Breakdown */}
          {items.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Evaluation Criteria Breakdown</p>
                <p className="text-xs text-gray-500 mt-0.5">Sorted by lowest pass rate — highlights areas needing attention</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Criteria</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Yes</th>
                      <th className="px-4 py-2 text-right">No</th>
                      <th className="px-4 py-2 text-left w-48">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((r: any) => {
                      const pct = Number(r.yes_rate ?? 0);
                      return (
                        <tr key={r.item_key} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-800 max-w-xs">{r.item_label}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{r.total}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{r.yes_count}</td>
                          <td className="px-4 py-2.5 text-right text-red-500">{r.no_count}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-10 text-right ${scoreColor(pct)}`}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Reports Tab ────────────────────────────────────────────────────────────────

function ReportsTab({ classes }: { classes: ScClass[] }) {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'eval-analysis'>('eval-analysis');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setData([]);
    try {
      let result: any;
      if (reportType === 'daily') {
        const qs = new URLSearchParams({ from_date: date, to_date: date });
        if (classId) qs.set('class_id', classId);
        result = await schoolFetch<{ data: any[] }>(`/attendance/?${qs}`);
        setData(result.data);
      } else if (reportType === 'monthly') {
        if (!classId) { alert('Please select a class'); setLoading(false); return; }
        result = await schoolFetch<{ data: any[] }>(`/attendance/monthly?class_id=${classId}&month=${month}`);
        setData(result.data);
      }
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Report type tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          ['eval-analysis', 'Evaluation Analysis'],
          ['daily', 'Daily Attendance'],
          ['monthly', 'Monthly Attendance'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => { setReportType(key); setData([]); }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${reportType === key ? 'bg-[#14856E] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {reportType === 'eval-analysis' && <EvaluationAnalysis classes={classes} />}

      {(reportType === 'daily' || reportType === 'monthly') && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs font-medium text-gray-600">Class</label>
              <select value={classId} onChange={e => setClassId(e.target.value)}
                className="mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">All Classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {reportType === 'daily' && (
              <div>
                <label className="text-xs font-medium text-gray-600">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              </div>
            )}
            {reportType === 'monthly' && (
              <div>
                <label className="text-xs font-medium text-gray-600">Month</label>
                <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                  className="mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              </div>
            )}
            <button onClick={run} disabled={loading}
              className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
              {loading ? 'Loading…' : 'Run Report'}
            </button>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">{data.length} records</span>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              <Printer size={12} />Print
            </button>
          </div>
          <div className="overflow-x-auto">
            {reportType === 'daily' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Class</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Absent</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{fmtDate(r.attendance_date)}</td>
                      <td className="px-4 py-3 text-gray-700">{r.class_name}</td>
                      <td className="px-4 py-3 text-right">{r.total}</td>
                      <td className="px-4 py-3 text-right text-green-700 font-medium">{r.present}</td>
                      <td className="px-4 py-3 text-right text-red-600">{r.absent}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#14856E]">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {reportType === 'monthly' && (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Student</th>
                    <th className="px-4 py-3 text-right">Days</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Absent</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{r.full_name}</p>
                        <p className="text-xs font-mono text-gray-400">{r.student_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right">{r.total_days}</td>
                      <td className="px-4 py-3 text-right text-green-700">{r.present}</td>
                      <td className="px-4 py-3 text-right text-red-600">{r.absent}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#14856E]">{r.pct ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function School() {
  const [tab, setTab] = useState<'dashboard' | 'attendance' | 'monitoring' | 'students' | 'reports'>('dashboard');
  const [classes, setClasses] = useState<ScClass[]>([]);

  useEffect(() => {
    schoolFetch<{ data: ScClass[] }>('/classes/').then(d => setClasses(d.data)).catch(console.error);
  }, []);

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <img src="/logo.png" alt="Sombhabona" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Puspokoli School</h1>
        <p className="text-sm text-gray-600 mt-1">Attendance tracking, classroom monitoring & reports</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-[#14856E] text-[#14856E] bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard'   && <DashboardTab classes={classes} />}
      {tab === 'attendance'  && <AttendanceTab classes={classes} />}
      {tab === 'monitoring'  && <MonitoringTab classes={classes} />}
      {tab === 'students'    && <StudentsTab classes={classes} />}
      {tab === 'reports'     && <ReportsTab classes={classes} />}
    </div>
  );
}
