import { useCallback, useEffect, useState } from 'react';
import { ListTodo, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const PM_API = '/api/projects';

async function pmFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${PM_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Completed';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface MyTask {
  id: number;
  project_id: number;
  project_name?: string;
  project_code?: string;
  name: string;
  priority: TaskPriority;
  due_date?: string;
  status: TaskStatus;
  progress: number;
}

const STATUS_OPTIONS: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Completed'];

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  Critical: 'text-red-700 bg-red-100',
  High:     'text-orange-700 bg-orange-100',
  Medium:   'text-blue-700 bg-blue-100',
  Low:      'text-gray-600 bg-gray-100',
};

function isOverdue(dueDate?: string, status?: TaskStatus) {
  if (!dueDate || status === 'Completed') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

function fmtDue(dueDate?: string) {
  if (!dueDate) return null;
  return new Date(dueDate).toLocaleDateString('en-BD', { day: 'numeric', month: 'short' });
}

export function MyTasksPanel() {
  const [tasks, setTasks] = useState<MyTask[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await pmFetch<{ data: MyTask[] }>('/tasks/mine');
      setTasks(r.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load your tasks.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (taskId: number, status: TaskStatus) => {
    setUpdatingId(taskId);
    try {
      const progress = status === 'Completed' ? 100 : status === 'To Do' ? 0 : undefined;
      await pmFetch(`/tasks/mine/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, ...(progress !== undefined ? { progress } : {}) }),
      });
      await load();
    } catch {
      // silent — task list stays as-is, user can retry
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-3 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading your tasks…</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ListTodo size={18} className="text-[#14856E]" />
        <h3 className="font-semibold text-gray-800 text-sm">My Tasks</h3>
      </div>

      {error && (
        <div className="flex items-start gap-1.5 text-xs px-2.5 py-2 rounded-lg bg-red-50 text-red-700 mb-3">
          <AlertCircle size={12} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {!error && (!tasks || tasks.length === 0) && (
        <div className="text-center py-8">
          <CheckCircle2 size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-xs text-gray-400">No open tasks assigned to you</p>
        </div>
      )}

      {tasks && tasks.length > 0 && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          {tasks.map(t => (
            <div key={t.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-medium text-gray-800 leading-snug">{t.name}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${PRIORITY_COLOR[t.priority]}`}>
                  {t.priority}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mb-2">
                {t.project_code ? `${t.project_code} · ` : ''}{t.project_name}
              </p>

              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-2">
                <div className="h-1.5 rounded-full bg-[#14856E] transition-all duration-500" style={{ width: `${t.progress}%` }} />
              </div>

              <div className="flex items-center justify-between gap-2">
                <select
                  value={t.status}
                  disabled={updatingId === t.id}
                  onChange={(e) => updateStatus(t.id, e.target.value as TaskStatus)}
                  className="text-xs border border-gray-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-[#14856E] disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {t.due_date && (
                  <span className={`text-[11px] ${isOverdue(t.due_date, t.status) ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    Due {fmtDue(t.due_date)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
