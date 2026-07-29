import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit2, Loader, AlertCircle, CheckCircle, X, Save, KeyRound, ClipboardList, Clock, Printer, Bell, Mail, Send, Globe, TestTube } from 'lucide-react';

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
  const [perUserDaily, setPerUserDaily] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<'summary' | 'daily' | 'sessions'>('summary');
  const inp = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]';

  // Default to current month
  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = now.toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);

  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set('from_date', from);
      if (to) qs.set('to_date', to);
      const r = await fetch(`/api/v1/admin/user-activity?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setSummary(d.summary || []);
      setSessions(d.sessions || []);
      setDaily(d.daily || []);
      setPerUserDaily(d.per_user_daily || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmtMin = (m: number | null) => {
    if (!m || m <= 0) return '—';
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const totalMinutes = summary.reduce((s, u) => s + (u.total_minutes || 0), 0);
  const totalSessions = summary.reduce((s, u) => s + (u.total_sessions || 0), 0);
  const totalActiveDays = daily.length;
  const maxDayMinutes = Math.max(...daily.map(d => d.total_minutes || 0), 1);

  const printReport = () => window.print();

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #activity-report, #activity-report * { visibility: visible; }
          #activity-report { position: fixed; top: 0; left: 0; width: 100%; padding: 24px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div id="activity-report">
        {/* Report header (visible on print) */}
        <div className="hidden print:block mb-6 border-b-2 border-[#14856E] pb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona Foundation</h1>
          <p className="text-sm text-gray-600 mt-1">User Activity Report · {fmtDate(from)} – {fmtDate(to)}</p>
        </div>

        {/* Controls */}
        <div className="no-print flex flex-wrap gap-3 items-end mb-6">
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
            {loading ? 'Loading…' : 'Apply'}
          </button>
          {/* Quick presets */}
          {[
            { label: 'This Month', from: firstOfMonth, to: today },
            { label: 'Last Month', from: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.toISOString().slice(0, 10); })(), to: (() => { const d = new Date(now.getFullYear(), now.getMonth(), 0); return d.toISOString().slice(0, 10); })() },
            { label: 'Last 7 Days', from: new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10), to: today },
          ].map(p => (
            <button key={p.label} onClick={() => { setFrom(p.from); setTo(p.to); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:border-[#14856E] hover:text-[#14856E]">
              {p.label}
            </button>
          ))}
          <button onClick={printReport}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            <Printer size={13} />Export PDF
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: summary.length, sub: 'with activity' },
            { label: 'Total Sessions', value: totalSessions, sub: 'logins recorded' },
            { label: 'Active Days', value: totalActiveDays, sub: 'days with activity' },
            { label: 'Total Time', value: fmtMin(totalMinutes), sub: 'combined usage' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold text-[#14856E] mt-1">{c.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div className="no-print flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
          {(['summary', 'daily', 'sessions'] as const).map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${activeView === v ? 'bg-white text-[#14856E] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'summary' ? 'User Summary' : v === 'daily' ? 'Daily Trend' : 'Session Log'}
            </button>
          ))}
        </div>

        {/* ── User Summary ── */}
        {(activeView === 'summary' || true) && (
          <div className={activeView !== 'summary' ? 'hidden print:block' : ''}>
            {activeView === 'summary' && <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Clock size={15} />User Activity Summary</h3>}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-right">Active Days</th>
                    <th className="px-4 py-3 text-right">Sessions</th>
                    <th className="px-4 py-3 text-right">Total Time</th>
                    <th className="px-4 py-3 text-right">Avg Session</th>
                    <th className="px-4 py-3 text-left">Last Seen</th>
                    <th className="no-print px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400 text-xs">No sessions recorded for this period</td></tr>
                  )}
                  {summary.map((u, i) => {
                    const userDays = perUserDaily.filter(r => r.user_id === u.user_id);
                    return (
                      <>
                        <tr key={u.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5">
                            <p className="font-semibold text-gray-900">{u.full_name || u.username}</p>
                            <p className="text-[10px] text-gray-400">{u.username}</p>
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{u.active_days}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{u.total_sessions}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-[#14856E]">{fmtMin(u.total_minutes)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmtMin(u.avg_session_min)}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDT(u.last_seen)}</td>
                          <td className="no-print px-4 py-2.5">
                            <button onClick={() => setExpandedUser(expandedUser === u.user_id ? null : u.user_id)}
                              className="text-xs text-[#14856E] hover:underline whitespace-nowrap">
                              {expandedUser === u.user_id ? 'Hide' : 'Daily →'}
                            </button>
                          </td>
                        </tr>
                        {expandedUser === u.user_id && (
                          <tr key={`exp-${u.user_id}`}>
                            <td colSpan={8} className="bg-green-50 px-6 py-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2">Daily breakdown — {u.full_name || u.username}</p>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                                {userDays.map((d: any) => (
                                  <div key={d.date} className="bg-white rounded-lg p-2 border border-green-100 text-center">
                                    <p className="text-[10px] text-gray-400">{fmtDate(d.date)}</p>
                                    <p className="text-sm font-bold text-[#14856E] mt-0.5">{fmtMin(d.minutes)}</p>
                                    <p className="text-[10px] text-gray-400">{d.sessions} session{d.sessions !== 1 ? 's' : ''}</p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Daily Trend ── */}
        {activeView === 'daily' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Daily Activity Trend</h3>
            {daily.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8 border border-dashed border-gray-200 rounded-xl">No data for this period</p>
            ) : (
              <>
                {/* Bar chart */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="flex items-end gap-1.5 h-28 overflow-x-auto">
                    {daily.map(d => {
                      const pct = Math.round(((d.total_minutes || 0) / maxDayMinutes) * 100);
                      return (
                        <div key={d.date} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: '28px' }}>
                          <div title={`${fmtDate(d.date)}: ${fmtMin(d.total_minutes)}`}
                            className="w-full bg-[#14856E] rounded-t-sm hover:bg-[#0f6b5a] transition-colors"
                            style={{ height: `${Math.max(pct, 4)}%` }} />
                          <p className="text-[8px] text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">
                            {new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-6 text-center">Total time per day (bar height = relative usage)</p>
                </div>
                {/* Daily table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-right">Active Users</th>
                        <th className="px-4 py-3 text-right">Sessions</th>
                        <th className="px-4 py-3 text-right">Total Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...daily].reverse().map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-800">{fmtDate(d.date)}</td>
                          <td className="px-4 py-2 text-right text-[#14856E] font-semibold">{d.active_users}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{d.sessions}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-700">{fmtMin(d.total_minutes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Session Log ── */}
        {activeView === 'sessions' && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Session Log ({sessions.length} sessions)</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Login</th>
                    <th className="px-4 py-3 text-left">Logout</th>
                    <th className="px-4 py-3 text-right">Duration</th>
                    <th className="px-4 py-3 text-left">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 text-xs">{s.full_name || s.username}</p>
                        <p className="text-[10px] text-gray-400">{s.username}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{fmtDT(s.login_at)}</td>
                      <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                        {s.logout_at
                          ? <span className="text-gray-500">{fmtDT(s.logout_at)}</span>
                          : <span className="text-green-600 font-medium">● Active</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[#14856E]">{fmtMin(s.duration_min)}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{s.ip_address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab({ token }: { token: string }) {
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const API = '/api/v1/notifications';

  const [cfg, setCfg] = useState<any>({});
  const [prefs, setPrefs] = useState<any>({});
  const [cfgSaving, setCfgSaving] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`${API}/config`, { headers }).then(r => r.ok ? r.json() : {}).then(d => setCfg(d || {})).catch(() => {});
    fetch(`${API}/preferences`, { headers }).then(r => r.ok ? r.json() : {}).then(d => setPrefs(d || {})).catch(() => {});
  }, []);

  const saveCfg = async (e: React.FormEvent) => {
    e.preventDefault();
    setCfgSaving(true);
    setMsg('');
    try {
      const r = await fetch(`${API}/config`, { method: 'PUT', headers, body: JSON.stringify(cfg) });
      setMsg(r.ok ? '✅ Server config saved.' : '❌ Failed to save.');
    } finally { setCfgSaving(false); }
  };

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setPrefSaving(true);
    setMsg('');
    try {
      const r = await fetch(`${API}/preferences`, { method: 'PUT', headers, body: JSON.stringify(prefs) });
      setMsg(r.ok ? '✅ Preferences saved.' : '❌ Failed to save.');
    } finally { setPrefSaving(false); }
  };

  const test = async (channel: string) => {
    setTesting(channel);
    setMsg('');
    try {
      const r = await fetch(`${API}/test`, { method: 'POST', headers, body: JSON.stringify({ channel }) });
      const data = await r.json();
      setMsg(r.ok ? `✅ Test ${channel} sent!` : `❌ ${data.message || 'Failed'}`);
    } finally { setTesting(null); }
  };

  const f = (key: string, val?: any) => {
    if (val !== undefined) setCfg((p: any) => ({ ...p, [key]: val }));
    return { value: cfg[key] ?? '', onChange: (e: any) => setCfg((p: any) => ({ ...p, [key]: e.target.value })) };
  };

  const pf = (key: string) => ({
    checked: !!prefs[key],
    onChange: (e: any) => setPrefs((p: any) => ({ ...p, [key]: e.target.checked })),
  });

  return (
    <div className="space-y-6">
      {msg && <div className={`px-4 py-2 rounded-lg text-sm ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{msg}</div>}

      {/* ── Email (SMTP) ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-blue-500" />
          <h3 className="font-semibold text-gray-900">Email (SMTP) Configuration</h3>
        </div>
        <form onSubmit={saveCfg} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500">SMTP Host</label>
              <input {...f('smtp_host')} placeholder="smtp.gmail.com"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Port</label>
              <input {...f('smtp_port')} placeholder="587" type="number"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Username / Email</label>
              <input {...f('smtp_user')} placeholder="you@gmail.com"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Password / App Password</label>
              <input {...f('smtp_pass')} placeholder="Leave blank to keep existing" type="password"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs text-gray-500">From Address</label>
              <input {...f('smtp_from')} placeholder="Sombhabona <noreply@sombhabona.org>"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input type="checkbox" id="smtp_secure" checked={!!cfg.smtp_secure}
                onChange={e => f('smtp_secure', e.target.checked)}
                className="accent-[#14856E]" />
              <label htmlFor="smtp_secure" className="text-sm text-gray-700">Use SSL (port 465)</label>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={cfgSaving}
              className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50 flex items-center gap-2">
              <Save size={14} /> Save SMTP Config
            </button>
            <button type="button" onClick={() => test('email')} disabled={!!testing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
              <TestTube size={14} /> {testing === 'email' ? 'Sending…' : 'Send Test Email'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Telegram ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Send size={16} className="text-sky-500" />
          <h3 className="font-semibold text-gray-900">Telegram Bot Configuration</h3>
        </div>
        <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 mb-4 text-xs text-sky-800 space-y-1">
          <p><strong>Setup:</strong> Create a bot via <code>@BotFather</code> on Telegram → get the Bot Token.</p>
          <p>Users get their Chat ID by messaging <code>@userinfobot</code> or <code>@get_id_bot</code>.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Bot Token</label>
            <input {...f('telegram_bot_token')} placeholder="1234567890:ABCdef..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={saveCfg} disabled={cfgSaving}
            className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50 flex items-center gap-2">
            <Save size={14} /> Save Token
          </button>
          <button onClick={() => test('telegram')} disabled={!!testing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
            <TestTube size={14} /> {testing === 'telegram' ? 'Sending…' : 'Send Test Message'}
          </button>
        </div>
      </div>

      {/* ── Web Push ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Globe size={16} className="text-green-500" />
          <h3 className="font-semibold text-gray-900">Web Push (Browser Notifications)</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          VAPID keys are auto-generated on first run and stored securely. Users click "Enable browser notifications" in the bell menu to subscribe.
        </p>
        {cfg.vapid_public_key && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-600 break-all mb-3">
            Public key: {cfg.vapid_public_key}
          </div>
        )}
        <button onClick={() => test('web')} disabled={!!testing}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2">
          <TestTube size={14} /> {testing === 'web' ? 'Sending…' : 'Send Test Push'}
        </button>
      </div>

      {/* ── My Notification Preferences ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-[#14856E]" />
          <h3 className="font-semibold text-gray-900">My Notification Preferences</h3>
          <span className="text-xs text-gray-400">(applies to your account)</span>
        </div>
        <form onSubmit={savePrefs} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email prefs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="email_enabled" {...pf('email_enabled')} className="accent-[#14856E]" />
                <label htmlFor="email_enabled" className="text-sm font-medium text-gray-700">Email Notifications</label>
              </div>
              {prefs.email_enabled && (
                <input value={prefs.email_address || ''} onChange={e => setPrefs((p: any) => ({ ...p, email_address: e.target.value }))}
                  placeholder="your@email.com" type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              )}
            </div>
            {/* Telegram prefs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="tg_enabled" {...pf('telegram_enabled')} className="accent-[#14856E]" />
                <label htmlFor="tg_enabled" className="text-sm font-medium text-gray-700">Telegram Notifications</label>
              </div>
              {prefs.telegram_enabled && (
                <input value={prefs.telegram_chat_id || ''} onChange={e => setPrefs((p: any) => ({ ...p, telegram_chat_id: e.target.value }))}
                  placeholder="Your Chat ID (e.g. 123456789)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              )}
            </div>
            {/* Web push prefs */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="wp_enabled" {...pf('web_push_enabled')} className="accent-[#14856E]" />
                <label htmlFor="wp_enabled" className="text-sm font-medium text-gray-700">Browser Push Notifications</label>
              </div>
              <p className="text-xs text-gray-400">Subscribe via the bell icon in the sidebar.</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Notify me when:</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...pf('notify_task_assigned')} className="accent-[#14856E]" />
                A task is assigned to me
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...pf('notify_leave_update')} className="accent-[#14856E]" />
                My leave request status changes
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...pf('notify_system')} className="accent-[#14856E]" />
                System notifications
              </label>
            </div>
          </div>
          <button type="submit" disabled={prefSaving}
            className="px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50 flex items-center gap-2">
            <Save size={14} /> Save My Preferences
          </button>
        </form>
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

  // Roles & Permissions state
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [rolePerms, setRolePerms] = useState<{ id: number; name: string; can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean }[]>([]);
  const [roleUserIds, setRoleUserIds] = useState<number[]>([]);
  const [addUserDropdown, setAddUserDropdown] = useState(false);
  const [permSaving, setPermSaving] = useState<string | null>(null);

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

  const openRole = async (role: Role) => {
    setActiveRole(role);
    setAddUserDropdown(false);
    const [permRes, usersRes] = await Promise.all([
      fetch(`/api/v1/admin/roles/${role.name}/permissions`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (permRes.ok) { const d = await permRes.json(); setRolePerms(d.permissions || []); }
    if (usersRes.ok) {
      const d = await usersRes.json();
      const tagged = (d.users || []).filter((u: User) => (u.roles || []).some(r => r.name === role.name)).map((u: User) => u.id);
      setRoleUserIds(tagged);
    }
  };

  const savePermission = async (moduleName: string, field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete', value: boolean) => {
    if (!activeRole) return;
    setPermSaving(moduleName + field);
    const updated = rolePerms.map(p => p.name === moduleName ? { ...p, [field]: value } : p);
    setRolePerms(updated);
    const perm = updated.find(p => p.name === moduleName)!;
    await fetch(`/api/v1/admin/roles/${activeRole.name}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ moduleName, canView: perm.can_view, canCreate: perm.can_create, canEdit: perm.can_edit, canDelete: perm.can_delete }),
    });
    setPermSaving(null);
  };

  const tagUser = async (user: User, add: boolean) => {
    if (!activeRole) return;
    const currentRoles = (user.roles || []).map(r => r.name);
    const newRoles = add ? [...currentRoles, activeRole.name] : currentRoles.filter(r => r !== activeRole.name);
    await fetch(`/api/v1/admin/users/${user.id}/roles`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roleNames: newRoles }),
    });
    setRoleUserIds(prev => add ? [...prev, user.id] : prev.filter(id => id !== user.id));
    loadUsers();
    setAddUserDropdown(false);
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
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-6 py-3 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell size={14} /> Notifications
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
            <div className="flex gap-6 min-h-[500px]">
              {/* Role list */}
              <div className="w-56 flex-shrink-0 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Roles</p>
                {roles.map(role => (
                  <button
                    key={role.id}
                    onClick={() => openRole(role)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      activeRole?.id === role.id
                        ? 'bg-[#14856E] text-white border-[#14856E]'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-[#14856E] hover:text-[#14856E]'
                    }`}
                  >
                    <span className="capitalize">{role.name}</span>
                    <span className={`block text-xs mt-0.5 font-normal ${activeRole?.id === role.id ? 'text-green-100' : 'text-gray-400'}`}>
                      {users.filter(u => (u.roles || []).some(r => r.name === role.name)).length} users
                    </span>
                  </button>
                ))}
              </div>

              {/* Role detail panel */}
              {activeRole ? (
                <div className="flex-1 min-w-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 capitalize">{activeRole.name}</h3>
                      <p className="text-sm text-gray-500">{activeRole.description}</p>
                    </div>
                  </div>

                  {/* Users tagged to this role */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Users with this role</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {users.filter(u => roleUserIds.includes(u.id)).map(u => (
                        <span key={u.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 border border-green-200 text-sm text-green-800 font-medium">
                          {u.full_name || u.username}
                          {u.username !== 'admin' && (
                            <button onClick={() => tagUser(u, false)}
                              className="ml-1 text-green-400 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          )}
                        </span>
                      ))}

                      {/* Add user dropdown */}
                      <div className="relative">
                        <button onClick={() => setAddUserDropdown(v => !v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-gray-300 text-sm text-gray-500 hover:border-[#14856E] hover:text-[#14856E] transition-colors">
                          <Plus size={13} />Add user
                        </button>
                        {addUserDropdown && (
                          <div className="absolute top-8 left-0 z-20 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[200px] py-1">
                            {users.filter(u => !roleUserIds.includes(u.id) && u.username !== 'admin').length === 0 ? (
                              <p className="px-4 py-2 text-xs text-gray-400">All users already tagged</p>
                            ) : (
                              users.filter(u => !roleUserIds.includes(u.id) && u.username !== 'admin').map(u => (
                                <button key={u.id} onClick={() => tagUser(u, true)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-[#14856E]">
                                  {u.full_name || u.username}
                                  <span className="block text-xs text-gray-400">{u.username}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {roleUserIds.length === 0 && !addUserDropdown && (
                        <span className="text-sm text-gray-400 italic">No users assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Permissions matrix */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Module Permissions</p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left font-medium text-gray-600">Module</th>
                            {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(f => (
                              <th key={f} className="px-3 py-2.5 text-center font-medium text-gray-600 w-20">
                                {f.replace('can_', '').charAt(0).toUpperCase() + f.replace('can_', '').slice(1)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {rolePerms.map(perm => (
                            <tr key={perm.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2.5 font-medium text-gray-800">{perm.name}</td>
                              {(['can_view', 'can_create', 'can_edit', 'can_delete'] as const).map(field => (
                                <td key={field} className="px-3 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={!!perm[field]}
                                    disabled={permSaving === perm.name + field}
                                    onChange={e => savePermission(perm.name, field, e.target.checked)}
                                    className="w-4 h-4 rounded accent-[#14856E] cursor-pointer disabled:opacity-50"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                          {rolePerms.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">No permissions found for this role</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <KeyRound size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a role to manage permissions and users</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'audit' && <AuditLogsTab token={token!} />}
          {activeTab === 'activity' && <UserActivityTab token={token!} />}
          {activeTab === 'notifications' && <NotificationsTab token={token!} />}
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
