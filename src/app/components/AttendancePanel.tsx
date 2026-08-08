import { useState, useEffect, useCallback } from 'react';
import { LogIn, LogOut, Clock, CheckCircle, AlertCircle, Loader2, Wifi } from 'lucide-react';

const HR_API = '/api/hr';

async function hrFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${HR_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).message || `HTTP ${res.status}`);
  return data as T;
}

// WebRTC-based local IP detection — works on LAN without any external service
function getDeviceIp(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const ips = new Set<string>();
      pc.createDataChannel('');
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => resolve(''));
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          pc.close();
          // Prefer private LAN IP (192.168.x.x / 10.x.x.x / 172.x.x.x)
          const lan = [...ips].find(ip => /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
          resolve(lan || [...ips][0] || '');
          return;
        }
        const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
        if (m && !m[1].startsWith('0.')) ips.add(m[1]);
      };
      setTimeout(() => { try { pc.close(); } catch { /* */ } resolve([...ips][0] || ''); }, 2000);
    } catch {
      resolve('');
    }
  });
}

interface AttRecord {
  id: number;
  login_time: string;
  current_login: string | null;
  logout_time: string | null;
  login_ip: string;
  logout_ip: string | null;
  is_active: boolean;
  working_minutes: number;
  session_count: number;
  status: string;
}

interface TodayData {
  mapped: boolean;
  employee?: { id: number; full_name: string; employee_code: string };
  record?: AttRecord | null;
}

function fmtTime(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-BD', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtMins(mins: number) {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function elapsedMins(from: string) {
  return Math.floor((Date.now() - new Date(from).getTime()) / 60000);
}

const STATUS_COLOR: Record<string, string> = {
  Present:    'text-green-700 bg-green-100',
  Late:       'text-yellow-700 bg-yellow-100',
  'Half-Day': 'text-blue-700 bg-blue-100',
  Incomplete: 'text-orange-700 bg-orange-100',
  Absent:     'text-red-700 bg-red-100',
  Active:     'text-[#14856E] bg-green-50',
};

function statusReason(rec: AttRecord, totalMins: number): string {
  const lateLogin = (() => {
    const d = new Date(rec.login_time);
    return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 15);
  })();

  if (rec.is_active) {
    if (totalMins >= 480) return 'Full day reached — log out when done';
    if (totalMins >= 120) {
      const need = 480 - totalMins;
      return `${fmtMins(need)} more for Present`;
    }
    const need = 120 - totalMins;
    return `${fmtMins(need)} more for Half-Day`;
  }

  switch (rec.status) {
    case 'Present':  return 'Full day completed ✓';
    case 'Late':     return `Full day completed — first login after 09:15 (${fmtTime(rec.login_time)})`;
    case 'Half-Day': return lateLogin
      ? `Half-day (late arrival at ${fmtTime(rec.login_time)})`
      : 'Half-day completed ✓';
    case 'Incomplete': {
      if (totalMins === 0) return 'No completed session recorded';
      const needHalf = 120 - totalMins;
      if (needHalf > 0) return `Worked ${fmtMins(totalMins)} — need ${fmtMins(needHalf)} more for Half-Day`;
      return `Worked ${fmtMins(totalMins)} — need ${fmtMins(480 - totalMins)} more for Present`;
    }
    default: return '';
  }
}

export function AttendancePanel() {
  const [data, setData]     = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(false);
  const [msg, setMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [, setTick]           = useState(0);

  const load = useCallback(async () => {
    try {
      const d = await hrFetch<TodayData>('/attendance/today');
      setData(d);
    } catch {
      setData({ mapped: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh elapsed time every minute while active
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const handleLogin = async () => {
    setActing(true);
    setMsg(null);
    try {
      const client_ip = await getDeviceIp();
      const r = await hrFetch<{ ok: boolean; device_ip: string }>(
        '/attendance/login',
        { method: 'POST', body: JSON.stringify({ client_ip }) }
      );
      setMsg({ type: 'ok', text: `Logged in from ${r.device_ip}` });
      await load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally { setActing(false); }
  };

  const handleLogout = async () => {
    setActing(true);
    setMsg(null);
    try {
      const client_ip = await getDeviceIp();
      const r = await hrFetch<{ duration: string; device_ip: string }>(
        '/attendance/logout',
        { method: 'POST', body: JSON.stringify({ client_ip }) }
      );
      setMsg({ type: 'ok', text: `Logged out (${r.duration}) from ${r.device_ip}` });
      await load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally { setActing(false); }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-3 text-gray-400">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Loading attendance…</span>
      </div>
    );
  }

  if (!data?.mapped) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} className="text-[#14856E]" />
          <h3 className="font-semibold text-gray-800 text-sm">Attendance</h3>
        </div>
        <p className="text-xs text-gray-500">Your account is not linked to an employee profile. Ask HR to link your account.</p>
      </div>
    );
  }

  const rec = data.record;
  const isActive = rec?.is_active ?? false;

  // Live cumulative time = completed minutes + current active session elapsed
  const liveMins = rec
    ? rec.working_minutes + (isActive && rec.current_login ? elapsedMins(rec.current_login) : 0)
    : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-[#14856E]" />
          <h3 className="font-semibold text-gray-800 text-sm">Attendance</h3>
        </div>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-BD', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Employee badge */}
      <div className="mb-4 px-3 py-2 bg-[#f0fdf8] rounded-lg">
        <p className="text-xs text-[#14856E] font-medium">{data.employee?.full_name}</p>
        <p className="text-[10px] text-gray-400">{data.employee?.employee_code}</p>
      </div>

      {/* Today's summary (only if there's a record) */}
      {rec && (
        <div className="mb-4 space-y-2">
          {/* Status badge + live total */}
          <div className="flex items-center justify-between">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[isActive ? 'Active' : rec.status] || 'text-gray-500 bg-gray-100'}`}>
              {isActive ? 'Active' : rec.status}
            </span>
            <span className="text-sm font-mono font-semibold text-gray-800">{fmtMins(liveMins)}</span>
          </div>

          {/* Status reason */}
          <p className="text-[11px] text-gray-500 leading-snug">{statusReason(rec, liveMins)}</p>

          {/* Time row */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>In: <span className="text-gray-800 font-medium">{fmtTime(rec.login_time)}</span></span>
            <span>Out: <span className="text-gray-800 font-medium">{isActive ? '…' : fmtTime(rec.logout_time)}</span></span>
          </div>

          {/* IP addresses */}
          <div className="flex items-start gap-1 text-[10px] text-gray-400">
            <Wifi size={10} className="mt-0.5 shrink-0" />
            <span>
              {rec.login_ip}
              {rec.logout_ip && rec.logout_ip !== rec.login_ip && ` → ${rec.logout_ip}`}
            </span>
          </div>

          {/* Sessions count */}
          {rec.session_count > 1 && (
            <p className="text-[10px] text-gray-400">{rec.session_count} sessions today</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleLogin}
          disabled={acting || isActive}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#14856E] text-white rounded-lg text-xs font-semibold hover:bg-[#0f6b5a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {acting && !isActive ? <Loader2 size={13} className="animate-spin" /> : <LogIn size={13} />}
          Login
        </button>
        <button
          onClick={handleLogout}
          disabled={acting || !isActive}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {acting && isActive ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          Logout
        </button>
      </div>

      {/* Feedback */}
      {msg && (
        <div className={`flex items-start gap-1.5 text-xs px-2.5 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'ok'
            ? <CheckCircle size={12} className="mt-0.5 shrink-0" />
            : <AlertCircle size={12} className="mt-0.5 shrink-0" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}
