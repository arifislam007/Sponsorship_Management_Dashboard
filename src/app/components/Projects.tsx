import { useCallback, useEffect, useState } from 'react';
import {
  Briefcase, Plus, Search, X, ChevronRight, MoreHorizontal,
  Calendar, Users, TrendingUp, AlertCircle, CheckCircle2, Clock,
  Flag, MessageSquare, Paperclip, Edit2, Trash2, Eye, ListTodo,
  BarChart2, Activity, AlertTriangle, RefreshCw, FolderOpen
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ── HR Employee Helper ────────────────────────────────────────────────────────

interface HrEmployee { id: number; employee_code: string; full_name: string; department_name?: string; designation_title?: string; }

async function fetchHrEmployees(): Promise<HrEmployee[]> {
  const token = localStorage.getItem('authToken');
  try {
    const res = await fetch('/api/hr/employees/?limit=200&status=Active', {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch { return []; }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectStatus = 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Archived';
type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
type Tab = 'dashboard' | 'projects' | 'tasks';

interface Project {
  id: number;
  code: string;
  name: string;
  category: string;
  description?: string;
  project_manager_id?: number;
  project_manager_name?: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  status: ProjectStatus;
  progress: number;
  task_count?: number;
  completed_tasks?: number;
  member_count?: number;
  created_at?: string;
  members?: ProjectMember[];
  documents?: ProjectDoc[];
}

interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  user_name: string;
  role: string;
}

interface ProjectDoc {
  id: number;
  file_name: string;
  file_size?: number;
  uploaded_by_name?: string;
  created_at: string;
}

interface Task {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  parent_task_id?: number;
  name: string;
  description?: string;
  assigned_user_id?: number;
  assigned_user_name?: string;
  priority: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
  status: TaskStatus;
  progress: number;
  comment_count?: number;
  created_at?: string;
  comments?: TaskComment[];
}

interface TaskComment {
  id: number;
  user_name: string;
  comment: string;
  created_at: string;
}

interface DashboardData {
  project_stats: {
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    on_hold_projects: number;
    planning_projects: number;
    avg_progress: number;
    overdue_tasks: number;
  };
  task_stats: {
    total_tasks: number;
    todo_tasks: number;
    in_progress_tasks: number;
    review_tasks: number;
    completed_tasks: number;
    overdue: number;
  };
  recent_activity: ActivityEntry[];
  progress_by_status: { status: string; count: number; avg_progress: number }[];
  tasks_by_priority: { priority: string; count: number }[];
  upcoming_tasks: Task[];
}

interface ActivityEntry {
  id: number;
  project_id?: number;
  task_id?: number;
  user_name?: string;
  action: string;
  project_name?: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PM_API = '/api/projects';

async function pmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${PM_API}${path}`, {
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

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planning: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  'On Hold': 'bg-amber-100 text-amber-700',
  Completed: 'bg-purple-100 text-purple-700',
  Archived: 'bg-gray-100 text-gray-500',
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  'To Do': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  Review: 'bg-amber-100 text-amber-700',
  Completed: 'bg-green-100 text-green-700',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  Low: 'bg-gray-400',
  Medium: 'bg-blue-500',
  High: 'bg-orange-500',
  Critical: 'bg-red-600',
};

const CATEGORIES = ['Education', 'ICT Training', 'Women Empowerment', 'Innovation Hub', 'Relief Program', 'Administration', 'Task Management'];
const PROJECT_STATUSES: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'];
const TASK_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Completed'];
const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

function fmt(n?: number | null) {
  if (n === undefined || n === null) return '৳0';
  return `৳${Number(n).toLocaleString()}`;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeSince(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isOverdue(due?: string | null, status?: string) {
  if (!due || status === 'Completed') return false;
  return new Date(due) < new Date();
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-[#14856E]', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2 bg-gray-100 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      pmFetch<DashboardData>('/dashboard/'),
      pmFetch<Project[]>('/dashboard/projects'),
    ]).then(([d, p]) => { setData(d); setRecentProjects(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-gray-400">Loading dashboard…</div>;
  if (!data) return null;

  const { project_stats: ps, task_stats: ts } = data;

  const statCards = [
    { label: 'Total Projects', value: ps.total_projects, icon: Briefcase, color: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
    { label: 'Active Projects', value: ps.active_projects, icon: TrendingUp, color: 'bg-green-50 text-green-600', border: 'border-green-100' },
    { label: 'Total Tasks', value: ts.total_tasks, icon: ListTodo, color: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
    { label: 'Pending Tasks', value: ts.todo_tasks + ts.in_progress_tasks + ts.review_tasks, icon: Clock, color: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
    { label: 'Completed Tasks', value: ts.completed_tasks, icon: CheckCircle2, color: 'bg-teal-50 text-teal-600', border: 'border-teal-100' },
    { label: 'Overdue Tasks', value: ps.overdue_tasks, icon: AlertCircle, color: ps.overdue_tasks > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500', border: ps.overdue_tasks > 0 ? 'border-red-100' : 'border-gray-100' },
  ];

  const actionLabels: Record<string, string> = {
    project_created: 'Created project',
    project_updated: 'Updated project',
    task_created: 'Created task',
    task_updated: 'Updated task',
    comment_added: 'Added comment',
    member_added: 'Added member',
  };

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className={`bg-white rounded-xl border ${c.border} p-4`}>
            <div className={`w-9 h-9 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active projects progress */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FolderOpen size={16} className="text-[#14856E]" />
            Active Projects
          </h3>
          {recentProjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No active projects</p>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400">{p.code}</span>
                      <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status as ProjectStatus]}`}>{p.status}</span>
                      <span className="text-xs font-semibold text-gray-600">{p.progress}%</span>
                    </div>
                  </div>
                  <ProgressBar value={p.progress} color={p.status === 'On Hold' ? 'bg-amber-400' : p.status === 'Completed' ? 'bg-purple-500' : 'bg-[#14856E]'} />
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{p.completed_tasks ?? 0}/{p.task_count ?? 0} tasks</span>
                    {p.end_date && <span>Due {fmtDate(p.end_date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-[#14856E]" />
            Recent Activity
          </h3>
          {data.recent_activity.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#14856E] mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700">
                      <span className="font-medium">{a.user_name || 'System'}</span>{' '}
                      {actionLabels[a.action] ?? a.action}
                      {a.project_name && <span className="text-gray-500"> in {a.project_name}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeSince(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming tasks + task pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-[#14856E]" />
            Upcoming Deadlines
          </h3>
          {data.upcoming_tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming tasks</p>
          ) : (
            <div className="space-y-2">
              {data.upcoming_tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0 mr-4">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.project_code} · {t.assigned_user_name || 'Unassigned'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-gray-700">{fmtDate(t.due_date)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 size={16} className="text-[#14856E]" />
            Task Pipeline
          </h3>
          <div className="space-y-3">
            {[
              { label: 'To Do', count: ts.todo_tasks, color: 'bg-gray-300', total: ts.total_tasks },
              { label: 'In Progress', count: ts.in_progress_tasks, color: 'bg-blue-500', total: ts.total_tasks },
              { label: 'Review', count: ts.review_tasks, color: 'bg-amber-400', total: ts.total_tasks },
              { label: 'Completed', count: ts.completed_tasks, color: 'bg-green-500', total: ts.total_tasks },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-600 flex-shrink-0">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`${s.color} h-full rounded-full`}
                    style={{ width: s.total ? `${(s.count / s.total) * 100}%` : '0%' }} />
                </div>
                <span className="w-8 text-sm font-semibold text-gray-700 text-right">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            {data.tasks_by_priority.map((p) => (
              <div key={p.priority} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[p.priority as TaskPriority] ?? 'bg-gray-400'}`} />
                <span className="text-xs text-gray-600">{p.priority}</span>
                <span className="text-xs font-bold text-gray-800 ml-auto">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project Form Modal ────────────────────────────────────────────────────────

const EMPTY_PROJECT = {
  code: '', name: '', category: 'Administration', description: '',
  project_manager_id: '', project_manager_name: '', start_date: '', end_date: '',
  budget: '', status: 'Planning' as ProjectStatus,
};

function ProjectFormModal({ editing, onClose, onSaved }: { editing?: Project | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(editing ? {
    code: editing.code,
    name: editing.name,
    category: editing.category,
    description: editing.description ?? '',
    project_manager_id: editing.project_manager_id ? String(editing.project_manager_id) : '',
    project_manager_name: editing.project_manager_name ?? '',
    start_date: editing.start_date?.slice(0, 10) ?? '',
    end_date: editing.end_date?.slice(0, 10) ?? '',
    budget: String(editing.budget ?? 0),
    status: editing.status,
  } : { ...EMPTY_PROJECT });
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchHrEmployees().then(setEmployees); }, []);

  const handleManagerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const emp = employees.find(em => String(em.id) === id);
    setForm(p => ({ ...p, project_manager_id: id, project_manager_name: emp?.full_name ?? '' }));
  };

  const save = async () => {
    setError('');
    if (!form.code.trim() || !form.name.trim()) { setError('Code and name are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: Number(form.budget || 0),
        project_manager_id: form.project_manager_id ? Number(form.project_manager_id) : null,
      };
      if (editing) {
        await pmFetch(`/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await pmFetch<Project>('/', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Project' : 'New Project'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Project Code *</label>
              <input value={form.code} onChange={f('code')} disabled={!!editing}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E] disabled:bg-gray-50"
                placeholder="e.g. PRJ-2024-001" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Category</label>
              <select value={form.category} onChange={f('category')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Project Name *</label>
            <input value={form.name} onChange={f('name')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea value={form.description} onChange={f('description')} rows={2}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Project Manager</label>
              <select value={form.project_manager_id} onChange={handleManagerChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">— Select Employee —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}{e.designation_title ? ` (${e.designation_title})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select value={form.status} onChange={f('status')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Start Date</label>
              <input type="date" value={form.start_date} onChange={f('start_date')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">End Date</label>
              <input type="date" value={form.end_date} onChange={f('end_date')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Budget (৳)</label>
              <input type="number" min="0" value={form.budget} onChange={f('budget')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Project Detail Modal ──────────────────────────────────────────────────────

function ProjectDetailModal({ project, onClose, onRefresh }: { project: Project; onClose: () => void; onRefresh: () => void }) {
  const [detail, setDetail] = useState<Project | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editProgress, setEditProgress] = useState<number | null>(null);
  const [editStatus, setEditStatus] = useState<ProjectStatus | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      pmFetch<Project>(`/${project.id}`),
      pmFetch<ActivityEntry[]>(`/${project.id}/activity`),
    ]).then(([d, a]) => { setDetail(d); setActivity(a); })
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [project.id]);

  const saveUpdate = async () => {
    if (editProgress === null && editStatus === null) return;
    setSaving(true);
    try {
      await pmFetch(`/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          progress: editProgress ?? detail?.progress,
          status: editStatus ?? detail?.status,
        }),
      });
      setEditProgress(null);
      setEditStatus(null);
      load();
      onRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-gray-500">Loading…</div>
    </div>
  );
  if (!detail) return null;

  const actionLabels: Record<string, string> = {
    project_created: 'Created project', project_updated: 'Updated project',
    task_created: 'Created task', task_updated: 'Updated task',
    comment_added: 'Added comment', member_added: 'Added member',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{detail.code}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[detail.status]}`}>{detail.status}</span>
              <span className="text-xs text-gray-500">{detail.category}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">{detail.name}</h2>
            {detail.description && <p className="text-sm text-gray-500 mt-1">{detail.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1 flex-shrink-0"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Manager</p>
              <p className="font-medium">{detail.project_manager_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="font-medium">{fmtDate(detail.start_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">End Date</p>
              <p className={`font-medium ${isOverdue(detail.end_date, detail.status) ? 'text-red-600' : ''}`}>{fmtDate(detail.end_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Budget</p>
              <p className="font-medium">{fmt(detail.budget)}</p>
            </div>
          </div>

          {/* Progress update */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-gray-900">{editProgress ?? detail.progress}%</span>
            </div>
            <ProgressBar value={editProgress ?? detail.progress} className="mb-3" />
            <div className="flex gap-3">
              <input type="range" min="0" max="100" value={editProgress ?? detail.progress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
                className="flex-1 accent-[#14856E]" />
              <select value={editStatus ?? detail.status}
                onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none">
                {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {(editProgress !== null || editStatus !== null) && (
                <button onClick={saveUpdate} disabled={saving}
                  className="px-3 py-1 bg-[#14856E] text-white rounded text-sm hover:bg-[#0f6b5a] disabled:opacity-50">
                  {saving ? '…' : 'Save'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {detail.completed_tasks ?? 0} of {detail.task_count ?? 0} tasks completed
            </p>
          </div>

          {/* Members */}
          {(detail.members?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Users size={14} />Team Members</h4>
              <div className="flex flex-wrap gap-2">
                {detail.members!.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-[#14856E] text-white flex items-center justify-center text-xs font-bold">
                      {m.user_name[0].toUpperCase()}
                    </span>
                    {m.user_name}
                    <span className="text-gray-400">· {m.role}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {activity.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2"><Activity size={14} />Activity</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {activity.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14856E] mt-1.5 flex-shrink-0" />
                    <span className="text-gray-600">
                      <span className="font-medium">{a.user_name || 'System'}</span>{' '}
                      {actionLabels[a.action] ?? a.action}
                    </span>
                    <span className="text-gray-400 ml-auto flex-shrink-0">{timeSince(a.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Projects Tab ──────────────────────────────────────────────────────────────

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter) qs.set('status', statusFilter);
    if (categoryFilter) qs.set('category', categoryFilter);
    if (search) qs.set('search', search);
    pmFetch<{ data: Project[]; total: number }>(`/?${qs}`)
      .then((r) => { setProjects(r.data); setTotal(r.total); })
      .catch(console.error).finally(() => setLoading(false));
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => { load(); }, [load]);

  const deleteProject = async () => {
    if (!deleting) return;
    try {
      await pmFetch(`/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Status</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => { setEditingProject(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />New Project
        </button>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <Briefcase size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No projects found.</p>
          <button onClick={() => setShowModal(true)}
            className="mt-3 text-[#14856E] text-sm font-medium hover:underline">Create your first project</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-400">{p.code}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 leading-snug">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{p.category}</p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button onClick={() => setViewingProject(p)} className="p-1.5 text-gray-400 hover:text-[#14856E] rounded">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => { setEditingProject(p); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeleting(p)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-gray-800">{p.progress}%</span>
                    </div>
                    <ProgressBar value={p.progress} color={p.status === 'On Hold' ? 'bg-amber-400' : p.status === 'Completed' ? 'bg-purple-500' : 'bg-[#14856E]'} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <ListTodo size={12} />{p.completed_tasks ?? 0}/{p.task_count ?? 0} tasks
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={12} />{p.member_count ?? 0} members
                    </span>
                    {p.end_date && (
                      <span className={`flex items-center gap-1 ${isOverdue(p.end_date, p.status) ? 'text-red-500' : ''}`}>
                        <Calendar size={12} />{fmtDate(p.end_date)}
                      </span>
                    )}
                  </div>
                  {p.budget > 0 && (
                    <p className="text-xs text-gray-500">Budget: <span className="font-semibold text-gray-700">{fmt(p.budget)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">Showing {projects.length} of {total} projects</p>
        </>
      )}

      {showModal && (
        <ProjectFormModal
          editing={editingProject}
          onClose={() => { setShowModal(false); setEditingProject(null); }}
          onSaved={load}
        />
      )}

      {viewingProject && (
        <ProjectDetailModal project={viewingProject} onClose={() => setViewingProject(null)} onRefresh={load} />
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Project</h3>
                <p className="text-sm text-gray-500">This will also delete all tasks and activity.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">Delete <strong>{deleting.name}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={deleteProject} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Task Form Modal ───────────────────────────────────────────────────────────

const EMPTY_TASK = {
  project_id: '', name: '', description: '',
  assigned_user_id: '', assigned_user_name: '',
  priority: 'Medium' as TaskPriority, due_date: '', estimated_hours: '',
  status: 'To Do' as TaskStatus, progress: '0',
};

function TaskFormModal({ projects, editing, defaultProjectId, onClose, onSaved }: {
  projects: Project[];
  editing?: Task | null;
  defaultProjectId?: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(editing ? {
    project_id: String(editing.project_id),
    name: editing.name,
    description: editing.description ?? '',
    assigned_user_id: editing.assigned_user_id ? String(editing.assigned_user_id) : '',
    assigned_user_name: editing.assigned_user_name ?? '',
    priority: editing.priority,
    due_date: editing.due_date?.slice(0, 10) ?? '',
    estimated_hours: editing.estimated_hours ? String(editing.estimated_hours) : '',
    status: editing.status,
    progress: String(editing.progress),
  } : { ...EMPTY_TASK, project_id: defaultProjectId ? String(defaultProjectId) : '' });
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [isManualAssignee, setIsManualAssignee] = useState(
    !!editing && !editing.assigned_user_id && !!editing.assigned_user_name
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchHrEmployees().then(setEmployees); }, []);

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === '__manual__') {
      setIsManualAssignee(true);
      setForm(p => ({ ...p, assigned_user_id: '', assigned_user_name: '' }));
    } else {
      setIsManualAssignee(false);
      const emp = employees.find(em => String(em.id) === id);
      setForm(p => ({ ...p, assigned_user_id: id, assigned_user_name: emp?.full_name ?? '' }));
    }
  };

  const f = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const save = async () => {
    setError('');
    if (!form.project_id || !form.name.trim()) { setError('Project and task name are required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        project_id: Number(form.project_id),
        assigned_user_id: form.assigned_user_id ? Number(form.assigned_user_id) : null,
        estimated_hours: form.estimated_hours ? Number(form.estimated_hours) : null,
        progress: Number(form.progress),
      };
      if (editing) {
        await pmFetch<Task>(`/tasks/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await pmFetch<Task>('/tasks/', { method: 'POST', body: JSON.stringify(payload) });
      }
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600">Project *</label>
            <select value={form.project_id} onChange={f('project_id')} disabled={!!editing}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E] disabled:bg-gray-50">
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Task Name *</label>
            <input value={form.name} onChange={f('name')}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea value={form.description} onChange={f('description')} rows={2}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Assigned To</label>
              <select
                value={form.assigned_user_id ? form.assigned_user_id : isManualAssignee ? '__manual__' : ''}
                onChange={handleAssigneeChange}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">— Unassigned —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}{e.designation_title ? ` (${e.designation_title})` : ''}
                  </option>
                ))}
                <option value="__manual__">✎ Enter manually...</option>
              </select>
              {isManualAssignee && (
                <input
                  placeholder="Type assignee name"
                  value={form.assigned_user_name}
                  onChange={e => setForm(p => ({ ...p, assigned_user_name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Priority</label>
              <select value={form.priority} onChange={f('priority')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Due Date</label>
              <input type="date" value={form.due_date} onChange={f('due_date')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Est. Hours</label>
              <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={f('estimated_hours')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Status</label>
              <select value={form.status} onChange={f('status')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Progress ({form.progress}%)</label>
              <input type="range" min="0" max="100" value={form.progress} onChange={f('progress')}
                className="mt-2 w-full accent-[#14856E]" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Detail Modal ─────────────────────────────────────────────────────────

function TaskDetailModal({ taskId, onClose, onRefresh }: { taskId: number; onClose: () => void; onRefresh: () => void }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const load = () => {
    setLoading(true);
    pmFetch<Task>(`/tasks/${taskId}`).then(setTask).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [taskId]);

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      await pmFetch(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ comment }) });
      setComment('');
      load();
      onRefresh();
    } catch (e: any) { alert(e.message); }
    finally { setPosting(false); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-gray-500">Loading…</div>
    </div>
  );
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_COLORS[task.status]}`}>{task.status}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
              <span className="text-xs text-gray-500">{task.project_code}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{task.name}</h3>
            {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-xs text-gray-500">Assigned</p><p className="font-medium">{task.assigned_user_name || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Due Date</p>
              <p className={`font-medium ${isOverdue(task.due_date, task.status) ? 'text-red-600' : ''}`}>{fmtDate(task.due_date)}</p>
            </div>
            <div><p className="text-xs text-gray-500">Est. Hours</p><p className="font-medium">{task.estimated_hours ?? '—'}</p></div>
            <div><p className="text-xs text-gray-500">Progress</p><p className="font-medium">{task.progress}%</p></div>
          </div>

          <ProgressBar value={task.progress} />

          {/* Comments */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={14} />Comments ({task.comments?.length ?? 0})
            </h4>
            <div className="space-y-3 max-h-40 overflow-y-auto mb-3">
              {(task.comments ?? []).map((c) => (
                <div key={c.id} className="bg-gray-50 rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-800">{c.user_name}</span>
                    <span className="text-xs text-gray-400">{timeSince(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-700">{c.comment}</p>
                </div>
              ))}
              {(task.comments?.length ?? 0) === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">No comments yet</p>
              )}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && postComment()}
                placeholder="Add a comment…"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              <button onClick={postComment} disabled={posting || !comment.trim()}
                className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
                {posting ? '…' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewTaskId, setViewTaskId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '100' });
    if (projectFilter) qs.set('project_id', projectFilter);
    if (statusFilter) qs.set('status', statusFilter);
    if (priorityFilter) qs.set('priority', priorityFilter);
    if (overdueOnly) qs.set('overdue', 'true');
    if (search) qs.set('search', search);

    Promise.all([
      pmFetch<{ data: Task[]; total: number }>(`/tasks/?${qs}`),
      pmFetch<{ data: Project[] }>('/'),
    ]).then(([tr, pr]) => { setTasks(tr.data); setTotal(tr.total); setProjects(pr.data); })
      .catch(console.error).finally(() => setLoading(false));
  }, [projectFilter, statusFilter, priorityFilter, overdueOnly, search]);

  useEffect(() => { load(); }, [load]);

  const deleteTask = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await pmFetch(`/tasks/${id}`, { method: 'DELETE' });
      load();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Status</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
          <option value="">All Priority</option>
          {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-red-600" />
          <span className="text-red-600 font-medium">Overdue only</span>
        </label>
        <button onClick={() => { setEditingTask(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />New Task
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tasks…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Task</th>
                  <th className="px-4 py-3 text-left">Project</th>
                  <th className="px-4 py-3 text-left">Assigned</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-center">Progress</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((t) => (
                  <tr key={t.id} className={`hover:bg-gray-50 ${isOverdue(t.due_date, t.status) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-[200px] truncate">{t.name}</div>
                      {(t.comment_count ?? 0) > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MessageSquare size={10} />{t.comment_count}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="font-mono text-xs">{t.project_code}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[100px] truncate">{t.assigned_user_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                        <span className="text-xs">{t.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_STATUS_COLORS[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isOverdue(t.due_date, t.status) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {fmtDate(t.due_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={t.progress} className="w-16" />
                        <span className="text-xs text-gray-500 w-8">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewTaskId(t.id)} className="p-1.5 text-gray-400 hover:text-[#14856E]"><Eye size={14} /></button>
                        <button onClick={() => { setEditingTask(t); setShowModal(true); }} className="p-1.5 text-gray-400 hover:text-gray-700"><Edit2 size={14} /></button>
                        <button onClick={() => deleteTask(t.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No tasks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {tasks.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
              Showing {tasks.length} of {total} tasks
            </div>
          )}
        </div>
      )}

      {showModal && (
        <TaskFormModal
          projects={projects}
          editing={editingTask}
          onClose={() => { setShowModal(false); setEditingTask(null); }}
          onSaved={load}
        />
      )}
      {viewTaskId !== null && (
        <TaskDetailModal taskId={viewTaskId} onClose={() => setViewTaskId(null)} onRefresh={load} />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'projects', label: 'Projects', icon: Briefcase },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
];

export function Projects() {
  const [tab, setTab] = useState<Tab>('dashboard');

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Project Management</h1>
        <p className="text-sm text-gray-600 mt-1">Track projects, tasks, and team progress</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[#14856E] text-[#14856E] bg-green-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'projects' && <ProjectsTab />}
      {tab === 'tasks' && <TasksTab />}
    </div>
  );
}
