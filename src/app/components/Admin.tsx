import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit2, Loader, AlertCircle, CheckCircle, X, Save, KeyRound, ClipboardList, Clock } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: { id: number; name: string }[];
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Module {
  id: number;
  name: string;
  description: string;
  route_name: string;
}

const LEAVE_ONLY_MODULE = {
  moduleName: 'Leave Management',
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: false,
  overrideRolePermissions: true,
};

function fmtDT(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDate(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
};

function AuditLogsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [action, setAction] = useState('');
  const [module, setModule] = useState('');
  const inp = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '200' });
      if (from) qs.set('from_date', from);
      if (to) qs.set('to_date', to);
      if (action) qs.set('action', action);
      if (module) qs.set('module', module);
      const r = await fetch(`/api/v1/admin/audit-logs?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setLogs(d.data || []);
      setTotal(d.total || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Action</label>
          <select value={action} onChange={e => setAction(e.target.value)} className={inp}>
            <option value="">All</option>
            {['LOGIN','LOGOUT','CREATE','UPDATE','DELETE'].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Module</label>
          <select value={module} onChange={e => setModule(e.target.value)} className={inp}>
            <option value="">All</option>
            {['Auth','Students','Donors','Sponsorships','Leaves','Accounting','Ledger'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
          {loading ? 'Loading…' : 'Filter'}
        </button>
      </div>

      <div className="text-xs text-gray-500">{total} total records</div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Time</th>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Module</th>
              <th className="px-4 py-3 text-left">Resource</th>
              <th className="px-4 py-3 text-left">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No logs found</td></tr>
            )}
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(l.created_at)}</td>
                <td className="px-4 py-2.5">
                  <p className="font-medium text-gray-900 text-xs">{l.full_name || l.username || '—'}</p>
                  <p className="text-[10px] text-gray-400">{l.username}</p>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACTION_COLORS[l.action] || 'bg-gray-100 text-gray-600'}`}>{l.action}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{l.module || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{l.resource_name || l.resource_id || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{l.ip_address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserActivityTab({ token }: { token: string }) {
  const [summary, setSummary] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [daily, setDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const inp = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from_date', from);
      if (to) qs.set('to_date', to);
      const r = await fetch(`/api/v1/admin/user-activity?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setSummary(d.summary || []); setSessions(d.sessions || []); setDaily(d.daily || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmtMin = (m: number | null) => {
    if (!m) return '—';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inp} />
        </div>
        <button onClick={load} disabled={loading}
          className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
          {loading ? 'Loading…' : 'Filter'}
        </button>
      </div>

      {/* User summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock size={15} /> Time Spent by User</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Sessions</th>
                <th className="px-4 py-3 text-right">Total Time</th>
                <th className="px-4 py-3 text-right">Avg Session</th>
                <th className="px-4 py-3 text-left">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-xs">No sessions recorded</td></tr>
              )}
              {summary.map((u, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 text-xs">{u.full_name || u.username}</p>
                    <p className="text-[10px] text-gray-400">{u.username}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{u.total_sessions}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#14856E]">{fmtMin(u.total_minutes)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmtMin(u.avg_session_min)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDT(u.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily active users */}
      {daily.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Daily Active Users (last 30 days)</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Active Users</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {daily.map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs">{fmtDate(d.date)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-[#14856E]">{d.active_users}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{d.sessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Sessions</h3>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">Login</th>
                <th className="px-4 py-3 text-left">Last Seen</th>
                <th className="px-4 py-3 text-left">Logout</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.slice(0, 50).map((s, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900 text-xs">{s.full_name || s.username}</p>
                    <p className="text-[10px] text-gray-400">{s.username}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDT(s.login_at)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(s.last_seen_at)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {s.logout_at
                      ? <span className="text-gray-500">{fmtDT(s.logout_at)}</span>
                      : <span className="text-green-600 font-medium">Active</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#14856E]">{fmtMin(s.duration_min)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{s.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Admin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    fullName: '',
    roleNames: [] as string[],
    password: '',
  });
  const [newUserForm, setNewUserForm] = useState({ username: '', email: '', password: '', fullName: '', roles: [] as string[] });

  useEffect(() => {
    if (token) {
      loadUsers();
      loadRoles();
      loadModules();
    }
  }, [token]);

  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        username: selectedUser.username,
        email: selectedUser.email,
        fullName: selectedUser.full_name,
        roleNames: (selectedUser.roles || []).map((role) => role?.name).filter(Boolean),
        password: '',
      });
      return;
    }

    setEditForm({
      username: '',
      email: '',
      fullName: '',
      roleNames: [],
      password: '',
    });
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/v1/admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadModules = async () => {
    try {
      const response = await fetch('/api/v1/admin/modules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUserForm.username,
          email: newUserForm.email,
          password: newUserForm.password,
          fullName: newUserForm.fullName,
          roles: newUserForm.roles,
        }),
      });

      if (response.ok) {
        setSuccess('User created successfully');
        setNewUserForm({ username: '', email: '', password: '', fullName: '', roles: [] });
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserRoles = async (userId: number, roleNames: string[]) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleNames }),
      });

      if (response.ok) {
        setSuccess('User roles updated successfully');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update user roles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        loadUsers();
      } else {
        setError('Failed to update user status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSelectedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const userResponse = await fetch(`/api/v1/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: editForm.username,
          email: editForm.email,
          fullName: editForm.fullName,
        }),
      });

      if (!userResponse.ok) {
        const data = await userResponse.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update user');
      }

      const rolesResponse = await fetch(`/api/v1/admin/users/${selectedUser.id}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleNames: editForm.roleNames }),
      });

      if (!rolesResponse.ok) {
        const data = await rolesResponse.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to update user roles');
      }

      setSuccess('User updated successfully');
      setSelectedUser(null);
      await loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (!editForm.password || editForm.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v1/admin/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: editForm.password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to reset password');
      }

      setEditForm((current) => ({ ...current, password: '' }));
      setSuccess('Password reset successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSelectedUser = async (userId: number) => {
    if (!window.confirm('Delete this user permanently?')) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
      await loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantLeaveOnlyAccess = async (userId: number, userRoles: { id: number; name: string }[]) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (userRoles.length > 0) {
        const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roleNames: [] }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to remove existing roles');
        }
      }

      const accessResponse = await fetch(`/api/v1/admin/users/${userId}/module-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(LEAVE_ONLY_MODULE),
      });

      if (accessResponse.ok) {
        setSuccess('Leave-only access granted successfully');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await accessResponse.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to grant leave-only access');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant leave-only access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage users, roles, and permissions</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Roles & Permissions
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'audit'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'activity'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Activity
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Leave the Roles list empty if you want this account to be leave-only. You can assign Leave Management access later from the user list.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Username"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                    <div className="flex flex-wrap gap-3">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newUserForm.roles.includes(role.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserForm({
                                  ...newUserForm,
                                  roles: [...newUserForm.roles, role.name],
                                });
                              } else {
                                setNewUserForm({
                                  ...newUserForm,
                                  roles: newUserForm.roles.filter((r) => r !== role.name),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Create User
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Users</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Username</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Full Name</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Roles</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-900 font-medium">{user.username}</td>
                          <td className="px-6 py-3 text-gray-600">{user.email}</td>
                          <td className="px-6 py-3 text-gray-600">{user.full_name}</td>
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.filter(Boolean).map((role) => (
                                  <span
                                    key={role.id}
                                    className="px-2 py-1 bg-[#14856E]/10 text-[#14856E] text-xs rounded-full font-medium"
                                  >
                                    {role.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-xs">No roles</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.is_active
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleGrantLeaveOnlyAccess(user.id, user.roles || [])}
                                disabled={isLoading || user.username === 'admin'}
                                title={user.username === 'admin' ? 'Cannot modify admin user' : ''}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Leave only
                              </button>
                              <button
                                onClick={() => handleDeleteSelectedUser(user.id)}
                                disabled={isLoading || user.username === 'admin'}
                                title={user.username === 'admin' ? 'Admin user cannot be deleted' : ''}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                {isLoading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                disabled={isLoading || (user.username === 'admin' && user.is_active)}
                                title={user.username === 'admin' && user.is_active ? 'Cannot deactivate admin user' : ''}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <div key={role.id} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2 capitalize">{role.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                      <button
                        onClick={() => {
                          /* Show role permissions editor */
                        }}
                        className="text-sm text-[#14856E] hover:underline font-medium"
                      >
                        Manage Permissions →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <div key={module.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1">{module.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                      <p className="text-xs text-gray-500">Route: {module.route_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && <AuditLogsTab token={token!} />}
          {activeTab === 'activity' && <UserActivityTab token={token!} />}
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Edit user</p>
                  {selectedUser.username === 'admin' && (
                    <span className="px-2.5 py-0.5 bg-amber-100 border border-amber-300 text-amber-700 text-xs font-semibold rounded-full">ADMIN</span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedUser.username}</h3>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateSelectedUser} className="p-5 space-y-5 overflow-auto">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Username
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium text-gray-700 block">
                Full name
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                />
              </label>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Roles</p>
                {selectedUser?.username === 'admin' && (
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium">⚠️ Admin Protection Active</p>
                    <p className="text-xs text-amber-700 mt-1">Admin user cannot be modified. Only password can be edited.</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editForm.roleNames.includes(role.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditForm({ ...editForm, roleNames: [...editForm.roleNames, role.name] });
                          } else {
                            setEditForm({ ...editForm, roleNames: editForm.roleNames.filter((name) => name !== role.name) });
                          }
                        }}
                        disabled={selectedUser?.username === 'admin'}
                        className="w-4 h-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className={`text-sm ${
                        selectedUser?.username === 'admin'
                          ? 'text-gray-400'
                          : 'text-gray-700'
                      }`}>{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">Reset password</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="New password"
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                  />
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14856E] px-4 py-2.5 text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors"
                  >
                    <KeyRound size={16} />
                    Reset password
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteSelectedUser(selectedUser.id)}
                  disabled={selectedUser?.username === 'admin'}
                  title={selectedUser?.username === 'admin' ? 'Admin user cannot be deleted' : ''}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Trash2 size={16} />
                  Delete user
                </button>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white hover:bg-[#0f6b5a] transition-colors disabled:opacity-50"
                  >
                    {isLoading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
