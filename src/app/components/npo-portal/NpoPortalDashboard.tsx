import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, CheckCircle2, XCircle, Loader, BookOpen } from 'lucide-react';
import logo from '../../../../logo.png';

interface PendingApproval {
  request_id: number; approvable_type: string; approvable_id: number; stage: string; created_at: string;
  chapter_title?: string; chapter_label?: string; part?: string; chapter_content?: string;
  meeting_type?: 'agm' | 'regular'; meeting_date?: string; venue?: string; agenda?: string; minutes_resolutions?: string;
}

function displayTitle(item: PendingApproval): string {
  if (item.approvable_type === 'constitution_chapter') return item.chapter_title || 'Constitution chapter';
  if (item.approvable_type === 'meeting_minutes') {
    const kind = item.meeting_type === 'agm' ? 'Annual General Meeting' : 'Regular Board Meeting';
    const date = item.meeting_date ? new Date(item.meeting_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    return `${kind}${date ? ` — ${date}` : ''}`;
  }
  return `${item.approvable_type} #${item.approvable_id}`;
}

function displayContent(item: PendingApproval): string {
  if (item.approvable_type === 'constitution_chapter') return item.chapter_content || '';
  if (item.approvable_type === 'meeting_minutes') {
    const parts = [];
    if (item.agenda) parts.push(`Agenda:\n${item.agenda}`);
    if (item.minutes_resolutions) parts.push(`Minutes / Resolutions:\n${item.minutes_resolutions}`);
    return parts.join('\n\n');
  }
  return '';
}
interface Profile { voterType: 'board' | 'member'; id: number; full_name: string; board_type?: string; position_title?: string; }

const PORTAL_API = '/api/npo/portal';

async function portalFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('npoPortalToken');
  const res = await fetch(`${PORTAL_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || `Request failed: ${res.status}`;
    try { message = JSON.parse(text)?.message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function NpoPortalDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [items, setItems] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!localStorage.getItem('npoPortalToken')) { navigate('/npo-portal'); return; }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = () => {
    setLoading(true); setError('');
    Promise.all([
      portalFetch<Profile>('/me'),
      portalFetch<PendingApproval[]>('/pending-approvals'),
    ]).then(([p, list]) => { setProfile(p); setItems(list); })
      .catch(e => {
        if (String(e.message).toLowerCase().includes('token')) { handleLogout(); return; }
        setError(e.message);
      })
      .finally(() => setLoading(false));
  };

  const vote = async (requestId: number, decision: 'approve' | 'reject') => {
    setBusyId(requestId); setError('');
    try {
      await portalFetch(`/pending-approvals/${requestId}/vote`, { method: 'POST', body: JSON.stringify({ decision }) });
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyId(null); }
  };

  const handleLogout = () => {
    localStorage.removeItem('npoPortalToken');
    localStorage.removeItem('npoPortalName');
    navigate('/npo-portal');
  };

  if (loading && !profile) {
    return <div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-[#14856E]" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sombhabona" className="h-9 w-auto" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500">{profile?.voterType === 'board' ? `Executive Board${profile.position_title ? ` — ${profile.position_title}` : ''}` : 'General Member'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600">
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Pending Approvals</h2>
        <p className="text-sm text-gray-500 mb-4">Items waiting on your vote.</p>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{error}</p>}

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <BookOpen size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nothing waiting on your vote right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => {
              const expanded = expandedId === item.request_id;
              const busy = busyId === item.request_id;
              const content = displayContent(item);
              return (
                <div key={item.request_id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.chapter_label && <span className="text-xs font-mono text-gray-400 mr-2">{item.chapter_label}</span>}
                      <span className="text-sm font-medium text-gray-900">{displayTitle(item)}</span>
                      {(item.part || item.venue) && <p className="text-xs text-gray-400 mt-0.5">{item.part || item.venue}</p>}
                    </div>
                  </div>
                  {content && (
                    <button onClick={() => setExpandedId(expanded ? null : item.request_id)} className="text-xs text-[#14856E] mt-2 hover:underline">
                      {expanded ? 'Hide text' : 'Read full text'}
                    </button>
                  )}
                  {expanded && content && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2 bg-gray-50 rounded-lg p-3">{content}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => vote(item.request_id, 'approve')} disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
                      <CheckCircle2 size={15} /> Approve
                    </button>
                    <button onClick={() => vote(item.request_id, 'reject')} disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
