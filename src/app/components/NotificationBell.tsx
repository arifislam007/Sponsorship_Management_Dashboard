import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, CheckCheck, Mail, MessageCircle, Globe } from 'lucide-react';

const API = '/api/v1/notifications';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface NotifLog {
  id: number;
  channel: string;
  event_type: string;
  title: string;
  body: string;
  status: string;
  read_at: string | null;
  sent_at: string;
}

function channelIcon(channel: string) {
  if (channel === 'email') return <Mail size={11} className="text-blue-500" />;
  if (channel === 'telegram') return <MessageCircle size={11} className="text-sky-500" />;
  return <Globe size={11} className="text-green-500" />;
}

function timeSince(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Convert a base64url VAPID key to a Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

async function registerPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const keyRes = await fetch(`${API}/vapid-key`, { headers: authHeaders() });
    const { publicKey } = await keyRes.json();
    if (!publicKey) return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Re-register existing with backend
      const { endpoint, keys } = existing.toJSON() as any;
      await fetch(`${API}/subscribe`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ endpoint, p256dh: keys?.p256dh, auth: keys?.auth }),
      });
      return;
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON() as any;
    await fetch(`${API}/subscribe`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys?.p256dh, auth: json.keys?.auth }),
    });
  } catch { /* permission denied or unsupported */ }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [unread, setUnread] = useState(0);
  const [swReady, setSwReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/log?limit=15`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setUnread(data.unread || 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchLog();
    const id = setInterval(fetchLog, 30_000);
    return () => clearInterval(id);
  }, [fetchLog]);

  // Register Service Worker once
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').then(() => {
      setSwReady(true);
    }).catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) fetchLog();
  };

  const markAllRead = async () => {
    await fetch(`${API}/log/read-all`, { method: 'POST', headers: authHeaders() });
    setUnread(0);
    setLogs((prev) => prev.map((l) => ({ ...l, read_at: l.read_at || new Date().toISOString() })));
  };

  const enablePush = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') await registerPush();
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#14856E] hover:underline flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
            {logs.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-8">No notifications yet</p>
            )}
            {logs.map((n) => (
              <div key={n.id} className={`px-4 py-2.5 ${!n.read_at ? 'bg-[#14856E]/5' : ''}`}>
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{channelIcon(n.channel)}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium text-gray-800 truncate ${!n.read_at ? 'font-semibold' : ''}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeSince(n.sent_at)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            {swReady && Notification.permission !== 'granted' && (
              <button onClick={enablePush}
                className="w-full text-xs text-center text-[#14856E] font-medium hover:underline py-1">
                Enable browser notifications
              </button>
            )}
            {swReady && Notification.permission === 'granted' && (
              <p className="text-xs text-center text-gray-400">Browser notifications enabled</p>
            )}
            {!swReady && (
              <p className="text-xs text-center text-gray-400">Browser push not supported</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
