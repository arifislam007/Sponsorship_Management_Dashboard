import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  GitBranch, Users, Award, CalendarDays, Plus, Edit2, Trash2, X,
  Search, Download, FileText, History, Camera, BookOpen, PenTool, ChevronRight,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Modal } from './Modal';
import { LoadingState } from './Spinner';
import { EmptyState } from './EmptyState';
import { ErrorBanner } from './ErrorBanner';
import { TabBar } from './TabBar';
import logo from '../../../logo.png';

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'organogram' | 'membership' | 'executive-board' | 'advisor-board' | 'meetings' | 'constitution';
type BoardType = 'executive' | 'advisor';
type MemberStatus = 'active' | 'inactive' | 'suspended';
type MeetingType = 'agm' | 'regular';

interface Position {
  id: number; title: string; person_name?: string; photo?: string; phone?: string; board_position_title?: string;
  parent_position_id?: number | null; sort_order?: number; board_member_id?: number | null;
}
interface BoardMember {
  id: number; board_type: BoardType; full_name: string; position_title?: string;
  photo?: string; signature?: string; phone?: string; email?: string;
  term_start_date?: string; term_end_date?: string; bio_notes?: string; portal_username?: string;
  member_id?: number | null;
}
interface Member {
  id: number; full_name: string; father_name?: string; mother_name?: string;
  national_id?: string; present_address?: string; permanent_address?: string;
  phone?: string; email?: string; occupation?: string; date_joined?: string;
  membership_fee_paid?: number; photo?: string; signature?: string; status: MemberStatus; notes?: string;
  portal_username?: string;
}
interface MeetingListItem {
  id: number; meeting_type: MeetingType; meeting_date: string; meeting_time?: string;
  venue?: string; next_meeting_date?: string; has_pdf: boolean; approval: ApprovalSummary | null;
}
interface AttendeeInput {
  attendee_type: 'board_member' | 'member';
  board_member_id?: number | null;
  member_id?: number | null;
  attendee_name_snapshot: string;
  signature_snapshot?: string | null;
}
type ApprovalStage = 'board_review' | 'member_vote' | 'approved' | 'rejected';
interface ApprovalSummary {
  request_id: number; stage: ApprovalStage;
  board_approve_count: number; board_reject_count: number; board_required: number;
  member_approve_count: number; member_reject_count: number; member_required: number;
}
interface ConstitutionChapter {
  id: number; part?: string; chapter_label?: string; title: string; content?: string;
  sort_order?: number; approval: ApprovalSummary | null;
  created_at: string; updated_at?: string;
}
interface ApprovalVote {
  stage: 'board_review' | 'member_vote'; voter_type: 'board' | 'member'; voter_id: number;
  decision: 'approve' | 'reject'; voted_at: string; voter_name: string;
}

// ── API helper (mirrors HR.tsx's hrFetch — local to this module, no central api.ts) ──

const NPO_API = '/api/npo';

async function npoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${NPO_API}${path}`, {
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
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BOARD_POSITIONS = ['Chairperson', 'Secretary', 'Finance Secretary', 'Vice Finance Secretary', 'Youth Secretary', 'Members'];
const EXECUTIVE_POSITIONS = [
  'Chairman', 'Vice Chairman', 'President', 'Vice President', 'General Secretary',
  'Finance Secretary', 'Vice Finance Secretary', 'Youth Secretary', 'Vice Youth Secretary',
  'Education Secretary', 'Cultural Secretary', 'Office Secretary', 'Member',
  "Women's Rights Secretary", "Children's Rights Secretary",
];
const ADD_NEW_POSITION = '__add_new__';
const MEMBER_STATUSES: MemberStatus[] = ['active', 'inactive', 'suspended'];
const STATUS_COLORS: Record<MemberStatus, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
};

const TABS: { id: Tab; label: string; icon: typeof GitBranch }[] = [
  { id: 'organogram', label: 'Organogram', icon: GitBranch },
  { id: 'membership', label: 'Membership', icon: Users },
  { id: 'executive-board', label: 'Executive Board', icon: Award },
  { id: 'advisor-board', label: 'Advisor Board', icon: Award },
  { id: 'meetings', label: 'Meetings', icon: CalendarDays },
  { id: 'constitution', label: 'Constitution', icon: BookOpen },
];

// ── PDF generation helpers ─────────────────────────────────────────────────────
// Same pattern established across HR.tsx / Accounting.tsx / AcknowledgmentLetter.tsx:
// html2canvas 1.4.1 cannot parse Tailwind v4's oklch() palette or Chrome's default
// oklab() outline-color, so every capture target here uses plain inline hex styles
// and an onclone hook that strips stylesheets from the disposable clone.

async function waitForImages(root: HTMLElement) {
  await Promise.all(
    Array.from(root.querySelectorAll('img')).map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      })
    )
  );
}

function neutralizeUnsupportedColorsInClone(clonedDoc: Document) {
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());
  const style = clonedDoc.createElement('style');
  style.textContent = '* { outline-color: transparent !important; }';
  clonedDoc.head.appendChild(style);
}

async function generatePagedPdfBase64(pageEls: HTMLElement[]): Promise<string | null> {
  try {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pageEls.length; i++) {
      const target = pageEls[i];
      await waitForImages(target);
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false, onclone: neutralizeUnsupportedColorsInClone });
      const imgData = canvas.toDataURL('image/png');
      const scaleRatio = pdfW / canvas.width;
      const scaledH = canvas.height * scaleRatio;
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, Math.min(scaledH, pdfH));
    }

    const bytes = new Uint8Array(pdf.output('arraybuffer'));
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  } catch (e) {
    console.error('[NPO] Paged PDF generation failed:', e);
    return null;
  }
}

function downloadBlobAsFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  downloadBlobAsFile(new Blob([buf], { type: 'application/pdf' }), filename);
}

// Protected PDF routes require the Bearer header (JWT lives in localStorage, not
// a cookie) — a plain <a href> download 401s, same gotcha fixed in HR.tsx.
async function downloadNpoPdf(path: string, filename: string) {
  const token = localStorage.getItem('authToken');
  const res = await fetch(`${NPO_API}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text || 'Failed to download PDF';
    try { message = JSON.parse(text)?.message || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  downloadBlobAsFile(await res.blob(), filename);
}

// ── Letterhead (mirrored from HR.tsx — plain inline hex styles only) ──────────

function Letterhead({ compact }: { compact?: boolean }) {
  return (
    <div style={{ textAlign: 'center', borderBottom: '2px solid #14856E', paddingBottom: compact ? '6px' : '12px', marginBottom: compact ? '10px' : '20px' }}>
      <img src={logo} alt="Sombhabona logo" style={{ height: compact ? '28px' : '44px', width: 'auto', margin: '0 auto', display: 'block' }} />
      <p style={{ fontSize: compact ? '9px' : '12px', color: '#4b5563', marginTop: '8px' }}>
        756 West Sewrapara, Mirpur, Dhaka | Phone: 01737243447 | Email: info@sombhabona.org
      </p>
    </div>
  );
}

// ── Shared photo-upload widget (mirrored from HR.tsx's employee photo picker) ─

function PhotoPicker({ photo, onChange, size = 96 }: { photo: string; onChange: (dataUrl: string) => void; size?: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex justify-center mb-2">
      <div className="relative">
        <div
          onClick={() => inputRef.current?.click()}
          style={{ width: size, height: size }}
          className="rounded-full border-2 border-dashed border-gray-300 hover:border-[#14856E] cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 transition-colors"
        >
          {photo ? (
            <img src={photo} alt="Photo" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <Camera size={20} />
              <span className="text-[10px] mt-1">Upload Photo</span>
            </div>
          )}
        </div>
        {photo && (
          <button type="button" onClick={() => onChange('')}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
            <X size={10} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(reader.result as string);
            reader.readAsDataURL(file);
            e.target.value = '';
          }} />
      </div>
    </div>
  );
}

// Rectangular signature-image picker (same FileReader-to-data-URL upload
// pattern as PhotoPicker, just shaped for a signature scan instead of a
// headshot — no circular crop).
function SignaturePicker({ signature, onChange }: { signature: string; onChange: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="text-xs text-gray-500 flex items-center gap-1 mb-1"><PenTool size={12} /> Signature</label>
      <div className="relative inline-block">
        <div
          onClick={() => inputRef.current?.click()}
          className="w-48 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#14856E] cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 transition-colors"
        >
          {signature ? (
            <img src={signature} alt="Signature" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center text-gray-400">
              <PenTool size={18} />
              <span className="text-[10px] mt-1">Upload Signature</span>
            </div>
          )}
        </div>
        {signature && (
          <button type="button" onClick={() => onChange('')}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
            <X size={10} />
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => onChange(reader.result as string);
            reader.readAsDataURL(file);
            e.target.value = '';
          }} />
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Organogram Tab ─────────────────────────────────────────────────────────────

interface PositionFormState {
  title: string; person_name: string; photo: string; parent_position_id: string; board_member_id: string;
}
const EMPTY_POSITION_FORM: PositionFormState = { title: '', person_name: '', photo: '', parent_position_id: '', board_member_id: '' };

function descendantIds(positions: Position[], rootId: number): Set<number> {
  const ids = new Set<number>();
  const stack = [rootId];
  while (stack.length) {
    const cur = stack.pop()!;
    positions.filter(p => p.parent_position_id === cur).forEach(child => {
      if (!ids.has(child.id)) { ids.add(child.id); stack.push(child.id); }
    });
  }
  return ids;
}

function OrganogramTab() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [executives, setExecutives] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Position | null>(null);
  const [form, setForm] = useState<PositionFormState>(EMPTY_POSITION_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      npoFetch<Position[]>('/positions'),
      npoFetch<BoardMember[]>('/board-members?type=executive'),
    ]).then(([p, b]) => { setPositions(p); setExecutives(b); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const byParent = useMemo(() => {
    const map = new Map<number | null, Position[]>();
    positions.forEach(p => {
      const key = p.parent_position_id ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return map;
  }, [positions]);

  const roots = byParent.get(null) ?? [];

  function renderTree(pos: Position): ReactNode {
    const kids = byParent.get(pos.id) ?? [];
    return (
      <div key={pos.id} className="flex flex-col items-center">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex flex-col items-center w-40">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center mb-2">
            {pos.photo ? <img src={pos.photo} alt={pos.title} className="w-full h-full object-cover" /> : <Users size={18} className="text-gray-400" />}
          </div>
          <p className="text-sm font-semibold text-gray-900 text-center leading-tight">{pos.title}</p>
          {pos.person_name && <p className="text-xs text-gray-500 mt-0.5 text-center">{pos.person_name}</p>}
          {pos.board_position_title && <p className="text-[10px] text-gray-400 text-center">{pos.board_position_title}</p>}
          {pos.phone && <p className="text-[10px] text-gray-400 text-center">{pos.phone}</p>}
        </div>
        {kids.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-300" />
            <div className="flex gap-6">{kids.map(renderTree)}</div>
          </>
        )}
      </div>
    );
  }

  const openAdd = () => { setEditing(null); setForm(EMPTY_POSITION_FORM); setShowForm(true); };
  const openEdit = (p: Position) => {
    setEditing(p);
    setForm({
      title: p.title, person_name: p.person_name || '', photo: p.photo || '',
      parent_position_id: p.parent_position_id ? String(p.parent_position_id) : '',
      board_member_id: p.board_member_id ? String(p.board_member_id) : '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        title: form.title.trim(), person_name: form.board_member_id ? null : (form.person_name || null),
        photo: form.board_member_id ? null : (form.photo || null),
        parent_position_id: form.parent_position_id ? Number(form.parent_position_id) : null,
        board_member_id: form.board_member_id ? Number(form.board_member_id) : null,
      };
      if (editing) await npoFetch(`/positions/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await npoFetch('/positions', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (p: Position) => {
    if (!confirm(`Remove position "${p.title}"?`)) return;
    try { await npoFetch(`/positions/${p.id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const validParentOptions = editing ? positions.filter(p => p.id !== editing.id && !descendantIds(positions, editing.id).has(p.id)) : positions;

  if (loading) return <LoadingState label="Loading organogram…" fullHeight />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div className="flex justify-end">
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} /> Add Position
        </button>
      </div>

      {roots.length === 0 ? (
        <EmptyState icon={GitBranch} title="No positions yet" description="Add the top-level position to start building the organogram." bordered />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
          <div className="flex gap-10 justify-center min-w-max">{roots.map(renderTree)}</div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr><th className="px-4 py-2">Title</th><th className="px-4 py-2">Person</th><th className="px-4 py-2">Position</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Reports To</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {positions.map(p => (
              <tr key={p.id}>
                <td className="px-4 py-2 font-medium text-gray-900">{p.title}</td>
                <td className="px-4 py-2 text-gray-600">{p.person_name || '—'}</td>
                <td className="px-4 py-2 text-gray-600">{p.board_position_title || '—'}</td>
                <td className="px-4 py-2 text-gray-600">{p.phone || '—'}</td>
                <td className="px-4 py-2 text-gray-600">{positions.find(x => x.id === p.parent_position_id)?.title || '—'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-[#14856E] mr-2"><Edit2 size={15} /></button>
                  <button onClick={() => remove(p)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Position' : 'Add Position'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <ErrorBanner message={error} className="mb-3" />
            {!form.board_member_id && <PhotoPicker photo={form.photo} onChange={(v) => setForm(f => ({ ...f, photo: v }))} />}
            <div className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Position title (e.g. Executive Director)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Select from Executive Board (optional)</label>
                <select value={form.board_member_id} onChange={e => {
                  const boardMemberId = e.target.value;
                  const selected = executives.find(b => String(b.id) === boardMemberId);
                  setForm(f => ({ ...f, board_member_id: boardMemberId, title: (!f.title.trim() && selected?.position_title) ? selected.position_title : f.title }));
                }}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">— Enter name manually —</option>
                  {executives.map(b => <option key={b.id} value={b.id}>{b.full_name}{b.phone ? ` — ${b.phone}` : ''}{b.position_title ? ` — ${b.position_title}` : ''}</option>)}
                </select>
              </div>
              {!form.board_member_id && (
                <input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))}
                  placeholder="Person's name" className="w-full border rounded-lg px-3 py-2 text-sm" />
              )}
              <select value={form.parent_position_id} onChange={e => setForm(f => ({ ...f, parent_position_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">— Top level (no manager) —</option>
                {validParentOptions.map(p => <option key={p.id} value={p.id}>{p.title}{p.person_name ? ` (${p.person_name})` : ''}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Membership Tab ─────────────────────────────────────────────────────────────

interface MemberFormState {
  full_name: string; father_name: string; mother_name: string; national_id: string;
  present_address: string; permanent_address: string; phone: string; email: string;
  occupation: string; date_joined: string; membership_fee_paid: string; photo: string; signature: string;
  status: MemberStatus; notes: string; portal_username: string; portal_password: string;
}
const EMPTY_MEMBER_FORM: MemberFormState = {
  full_name: '', father_name: '', mother_name: '', national_id: '',
  present_address: '', permanent_address: '', phone: '', email: '',
  occupation: '', date_joined: '', membership_fee_paid: '', photo: '', signature: '',
  status: 'active', notes: '', portal_username: '', portal_password: '',
};
const MEMBER_ROWS_PER_PAGE = 18;

function MembershipTab() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'single' | 'bulk' | null>(null);
  const singlePageRef = useRef<HTMLDivElement>(null);
  const bulkPageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [bulkTarget, setBulkTarget] = useState<Member | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    npoFetch<Member[]>(`/members?${params.toString()}`).then(setMembers).catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [search, statusFilter]);

  const openAdd = () => { setEditing(null); setForm(EMPTY_MEMBER_FORM); setShowForm(true); };
  const openEdit = (m: Member) => {
    setEditing(m);
    setForm({
      full_name: m.full_name, father_name: m.father_name || '', mother_name: m.mother_name || '',
      national_id: m.national_id || '', present_address: m.present_address || '', permanent_address: m.permanent_address || '',
      phone: m.phone || '', email: m.email || '', occupation: m.occupation || '',
      date_joined: m.date_joined ? m.date_joined.slice(0, 10) : '', membership_fee_paid: m.membership_fee_paid != null ? String(m.membership_fee_paid) : '',
      photo: m.photo || '', signature: m.signature || '', status: m.status, notes: m.notes || '',
      portal_username: m.portal_username || '', portal_password: '',
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.full_name.trim()) { setError('Full name is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        membership_fee_paid: form.membership_fee_paid ? Number(form.membership_fee_paid) : null,
        date_joined: form.date_joined || null,
      };
      if (editing) await npoFetch(`/members/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await npoFetch('/members', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (m: Member) => {
    if (!confirm(`Deactivate member "${m.full_name}"?`)) return;
    try { await npoFetch(`/members/${m.id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const exportSingle = async (m: Member) => {
    setExporting('single');
    setBulkTarget(m);
    await new Promise(r => setTimeout(r, 50));
    try {
      if (!singlePageRef.current) return;
      const base64 = await generatePagedPdfBase64([singlePageRef.current]);
      if (base64) downloadBase64Pdf(base64, `npo-member-${m.full_name.replace(/\s+/g, '-')}.pdf`);
    } finally { setExporting(null); setBulkTarget(null); }
  };

  const exportBulkList = async () => {
    setExporting('bulk');
    await new Promise(r => setTimeout(r, 50));
    try {
      const pages = bulkPageRefs.current.filter(Boolean) as HTMLDivElement[];
      if (pages.length === 0) return;
      const base64 = await generatePagedPdfBase64(pages);
      if (base64) downloadBase64Pdf(base64, `npo-member-list-${Date.now()}.pdf`);
    } finally { setExporting(null); }
  };

  const bulkPages = useMemo(() => {
    const pages: Member[][] = [];
    for (let i = 0; i < members.length; i += MEMBER_ROWS_PER_PAGE) pages.push(members.slice(i, i + MEMBER_ROWS_PER_PAGE));
    return pages;
  }, [members]);

  const thCell: CSSProperties = { border: '1px solid #d1d5db', padding: '6px 8px', background: '#f3f4f6', fontSize: '10px', textAlign: 'left' };
  const tdCell: CSSProperties = { border: '1px solid #e5e7eb', padding: '6px 8px', fontSize: '10px' };

  if (loading && members.length === 0) return <LoadingState label="Loading members…" fullHeight />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, phone, NID…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {MEMBER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={exportBulkList} disabled={exporting !== null || members.length === 0}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
            <Download size={15} /> {exporting === 'bulk' ? 'Exporting…' : 'Export List (PDF)'}
          </button>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <EmptyState icon={Users} title="No members found" description="Add your first member to get started." bordered />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2">Name</th><th className="px-4 py-2">Phone</th>
                <th className="px-4 py-2">Date Joined</th><th className="px-4 py-2">Status</th><th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{m.full_name}</td>
                  <td className="px-4 py-2 text-gray-600">{m.phone || '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{fmtDate(m.date_joined)}</td>
                  <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[m.status]}`}>{m.status}</span></td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => exportSingle(m)} disabled={exporting !== null} className="text-gray-400 hover:text-[#14856E] mr-2" title="Export PDF"><FileText size={15} /></button>
                    <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-[#14856E] mr-2"><Edit2 size={15} /></button>
                    <button onClick={() => remove(m)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Member' : 'Add Member'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <ErrorBanner message={error} className="mb-3" />
            <PhotoPicker photo={form.photo} onChange={(v) => setForm(f => ({ ...f, photo: v }))} />
            <div className="flex justify-center mb-3">
              <SignaturePicker signature={form.signature} onChange={(v) => setForm(f => ({ ...f, signature: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Father's name" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Mother's name" value={form.mother_name} onChange={e => setForm(f => ({ ...f, mother_name: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="NID / Birth Cert No." value={form.national_id} onChange={e => setForm(f => ({ ...f, national_id: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Occupation" value={form.occupation} onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <textarea className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Present address" value={form.present_address} onChange={e => setForm(f => ({ ...f, present_address: e.target.value }))} />
              <textarea className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Permanent address" value={form.permanent_address} onChange={e => setForm(f => ({ ...f, permanent_address: e.target.value }))} />
              <div>
                <label className="text-xs text-gray-500">Date joined</label>
                <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.date_joined} onChange={e => setForm(f => ({ ...f, date_joined: e.target.value }))} />
              </div>
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Membership fee paid" value={form.membership_fee_paid} onChange={e => setForm(f => ({ ...f, membership_fee_paid: e.target.value }))} />
              <select className="col-span-2 border rounded-lg px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MemberStatus }))}>
                {MEMBER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <textarea className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <div className="col-span-2 border-t pt-3 mt-1">
                <p className="text-xs text-gray-500 mb-2">Portal login (optional) — lets this member log in and vote on constitution chapters themselves.</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Portal username" value={form.portal_username} onChange={e => setForm(f => ({ ...f, portal_username: e.target.value }))} />
                  <input className="border rounded-lg px-3 py-2 text-sm" type="password" placeholder={editing ? 'New password (leave blank to keep)' : 'Portal password'} value={form.portal_password} onChange={e => setForm(f => ({ ...f, portal_password: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Hidden single-member PDF capture target */}
      {bulkTarget && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          <div ref={singlePageRef} style={{ position: 'relative', boxSizing: 'border-box', width: '210mm', minHeight: '297mm', padding: '15mm 12mm', fontFamily: 'Arial, sans-serif', color: '#111', background: '#ffffff' }}>
            <Letterhead />
            <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '12px 0 20px' }}>MEMBERSHIP RECORD</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <tbody>
                {[
                  ['Full Name', bulkTarget.full_name], ["Father's Name", bulkTarget.father_name || '—'],
                  ["Mother's Name", bulkTarget.mother_name || '—'], ['NID / Birth Cert.', bulkTarget.national_id || '—'],
                  ['Present Address', bulkTarget.present_address || '—'], ['Permanent Address', bulkTarget.permanent_address || '—'],
                  ['Phone', bulkTarget.phone || '—'], ['Email', bulkTarget.email || '—'], ['Occupation', bulkTarget.occupation || '—'],
                  ['Date Joined', fmtDate(bulkTarget.date_joined)], ['Membership Fee Paid', bulkTarget.membership_fee_paid != null ? `৳${bulkTarget.membership_fee_paid}` : '—'],
                  ['Status', bulkTarget.status],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px', background: '#f3f4f6', fontWeight: 'bold', width: '35%' }}>{label}</td>
                    <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkTarget.signature && (
              <div style={{ marginTop: '24px', textAlign: 'right' }}>
                <img src={bulkTarget.signature} alt="Signature" style={{ height: '40px', display: 'inline-block' }} />
                <p style={{ fontSize: '10px', color: '#4b5563', borderTop: '1px solid #9ca3af', paddingTop: '2px', marginTop: '2px' }}>Member Signature</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden paginated bulk-list PDF capture target */}
      {exporting === 'bulk' && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          {bulkPages.map((pageRows, pageIdx) => {
            const isFirst = pageIdx === 0;
            return (
              <div key={pageIdx} ref={el => { bulkPageRefs.current[pageIdx] = el; }}
                style={{ position: 'relative', boxSizing: 'border-box', width: '210mm', minHeight: '297mm', padding: '15mm 12mm', fontFamily: 'Arial, sans-serif', color: '#111', background: '#ffffff' }}>
                {isFirst && (<><Letterhead /><h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '12px 0 20px' }}>MEMBERSHIP LIST</h2></>)}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thCell}>Name</th><th style={thCell}>Phone</th><th style={thCell}>NID</th>
                      <th style={thCell}>Date Joined</th><th style={thCell}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map(m => (
                      <tr key={m.id}>
                        <td style={tdCell}>{m.full_name}</td><td style={tdCell}>{m.phone || '—'}</td>
                        <td style={tdCell}>{m.national_id || '—'}</td><td style={tdCell}>{fmtDate(m.date_joined)}</td>
                        <td style={tdCell}>{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bulkPages.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '10mm', right: '12mm', fontSize: '9px', color: '#9ca3af' }}>Page {pageIdx + 1} of {bulkPages.length}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Executive / Advisor Board Tabs (shared component, parameterized by board_type) ──

interface BoardFormState {
  full_name: string; position_title: string; photo: string; signature: string; phone: string; email: string;
  term_start_date: string; term_end_date: string; bio_notes: string; portal_username: string; portal_password: string;
  member_id: string;
}
const EMPTY_BOARD_FORM: BoardFormState = {
  full_name: '', position_title: BOARD_POSITIONS[0], photo: '', signature: '', phone: '', email: '',
  term_start_date: '', term_end_date: '', bio_notes: '', portal_username: '', portal_password: '', member_id: '',
};

function BoardList({ boardType }: { boardType: BoardType }) {
  const [list, setList] = useState<BoardMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BoardMember | null>(null);
  const [form, setForm] = useState<BoardFormState>(EMPTY_BOARD_FORM);
  const [saving, setSaving] = useState(false);
  const [customPosition, setCustomPosition] = useState(false);

  const positionOptions = boardType === 'executive' ? EXECUTIVE_POSITIONS : BOARD_POSITIONS;

  const load = () => {
    setLoading(true);
    Promise.all([
      npoFetch<BoardMember[]>(`/board-members?type=${boardType}`),
      npoFetch<Member[]>('/members?status=active&limit=500'),
    ]).then(([l, m]) => { setList(l); setMembers(m); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [boardType]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_BOARD_FORM, position_title: positionOptions[0] });
    setCustomPosition(false);
    setShowForm(true);
  };
  const openEdit = (b: BoardMember) => {
    setEditing(b);
    const positionTitle = b.position_title || positionOptions[0];
    setForm({
      full_name: b.full_name, position_title: positionTitle, photo: b.photo || '', signature: b.signature || '',
      phone: b.phone || '', email: b.email || '',
      term_start_date: b.term_start_date ? b.term_start_date.slice(0, 10) : '',
      term_end_date: b.term_end_date ? b.term_end_date.slice(0, 10) : '',
      bio_notes: b.bio_notes || '', portal_username: b.portal_username || '', portal_password: '',
      member_id: b.member_id ? String(b.member_id) : '',
    });
    setCustomPosition(!positionOptions.includes(positionTitle));
    setShowForm(true);
  };

  const save = async () => {
    if (boardType === 'executive' && !form.member_id) { setError('Executive Board members must be linked to an existing General Member'); return; }
    if (!form.member_id && !form.full_name.trim()) { setError('Full name is required, or link a General Member'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form, board_type: boardType, term_start_date: form.term_start_date || null, term_end_date: form.term_end_date || null,
        member_id: form.member_id ? Number(form.member_id) : null,
      };
      if (editing) await npoFetch(`/board-members/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await npoFetch('/board-members', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (b: BoardMember) => {
    if (!confirm(`Remove "${b.full_name}" from the ${boardType} board?`)) return;
    try { await npoFetch(`/board-members/${b.id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const isPast = (b: BoardMember) => b.term_end_date && new Date(b.term_end_date) < new Date();

  if (loading) return <LoadingState label="Loading board members…" fullHeight />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div className="flex justify-end">
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} /> Add {boardType === 'executive' ? 'Executive' : 'Advisor'}
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Award} title={`No ${boardType} board members yet`} bordered />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(b => (
            <div key={b.id} className={`bg-white rounded-xl border p-4 ${isPast(b) ? 'border-gray-200 opacity-60' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {b.photo ? <img src={b.photo} alt={b.full_name} className="w-full h-full object-cover" /> : <Users size={18} className="text-gray-400" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{b.full_name}</p>
                  <p className="text-xs text-gray-500">{b.position_title}</p>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 space-y-0.5">
                {b.phone && <p>📞 {b.phone}</p>}
                {b.email && <p>✉️ {b.email}</p>}
                <p>{fmtDate(b.term_start_date)} – {b.term_end_date ? fmtDate(b.term_end_date) : 'Present'}</p>
                {isPast(b) && <p className="text-amber-600 font-medium">Past term</p>}
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => openEdit(b)} className="text-gray-400 hover:text-[#14856E]"><Edit2 size={15} /></button>
                <button onClick={() => remove(b)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit' : 'Add'} {boardType === 'executive' ? 'Executive' : 'Advisor'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <ErrorBanner message={error} className="mb-3" />
            {!form.member_id && <PhotoPicker photo={form.photo} onChange={(v) => setForm(f => ({ ...f, photo: v }))} />}
            {boardType === 'executive' && (
              <div className="flex justify-center mb-3">
                <SignaturePicker signature={form.signature} onChange={(v) => setForm(f => ({ ...f, signature: v }))} />
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Select from Members {boardType === 'executive' ? <span className="text-red-500">*</span> : '(optional)'}
                </label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))}>
                  <option value="">{boardType === 'executive' ? '— Select a member —' : '— Enter name manually —'}</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}{m.phone ? ` — ${m.phone}` : ''}</option>)}
                </select>
                {boardType === 'executive' && (
                  <p className="text-xs text-gray-400 mt-1">Executive Board members must already be a General Member.</p>
                )}
              </div>
              {!form.member_id && boardType === 'advisor' && (
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Full name *" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              )}
              {customPosition ? (
                <div className="flex gap-2">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="New position title"
                    value={form.position_title} onChange={e => setForm(f => ({ ...f, position_title: e.target.value }))} autoFocus />
                  <button type="button" onClick={() => { setCustomPosition(false); setForm(f => ({ ...f, position_title: positionOptions[0] })); }}
                    className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap">Choose from list</button>
                </div>
              ) : (
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.position_title}
                  onChange={e => {
                    if (e.target.value === ADD_NEW_POSITION) { setCustomPosition(true); setForm(f => ({ ...f, position_title: '' })); }
                    else setForm(f => ({ ...f, position_title: e.target.value }));
                  }}>
                  {positionOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  <option value={ADD_NEW_POSITION}>+ Add new position…</option>
                </select>
              )}
              {!form.member_id && (
                <>
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500">Term start</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.term_start_date} onChange={e => setForm(f => ({ ...f, term_start_date: e.target.value }))} /></div>
                <div><label className="text-xs text-gray-500">Term end</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.term_end_date} onChange={e => setForm(f => ({ ...f, term_end_date: e.target.value }))} /></div>
              </div>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Bio / notes" value={form.bio_notes} onChange={e => setForm(f => ({ ...f, bio_notes: e.target.value }))} />
              {boardType === 'executive' && (
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500 mb-2">Portal login (optional) — lets this board member log into the approval portal and vote on board-review items themselves.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Portal username" value={form.portal_username} onChange={e => setForm(f => ({ ...f, portal_username: e.target.value }))} />
                    <input className="border rounded-lg px-3 py-2 text-sm" type="password" placeholder={editing ? 'New password (leave blank to keep)' : 'Portal password'} value={form.portal_password} onChange={e => setForm(f => ({ ...f, portal_password: e.target.value }))} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Meetings Tab ───────────────────────────────────────────────────────────────

interface MeetingFormState {
  meeting_type: MeetingType; meeting_date: string; meeting_time: string; venue: string;
  agendaItems: string[]; minutes_resolutions: string; next_meeting_date: string;
}
const EMPTY_MEETING_FORM: MeetingFormState = {
  meeting_type: 'regular', meeting_date: new Date().toISOString().slice(0, 10), meeting_time: '', venue: '',
  agendaItems: [''], minutes_resolutions: '', next_meeting_date: '',
};
const MINUTES_ROWS_PER_PAGE = 20;

function MeetingsTab() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<MeetingFormState>(EMPTY_MEETING_FORM);
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [votes, setVotes] = useState<Record<number, ApprovalVote[]>>({});
  const [voteSelection, setVoteSelection] = useState<Record<string, string>>({});
  const [busyRequestId, setBusyRequestId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      npoFetch<MeetingListItem[]>('/meetings'),
      npoFetch<BoardMember[]>('/board-members'),
      npoFetch<Member[]>('/members?status=active&limit=500'),
    ]).then(([m, b, mem]) => { setMeetings(m); setBoardMembers(b); setMembers(mem); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY_MEETING_FORM); setSelectedAttendees(new Set()); setShowForm(true); };

  const toggleAttendee = (key: string) => {
    setSelectedAttendees(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const attendeePayload = (): AttendeeInput[] => {
    const result: AttendeeInput[] = [];
    selectedAttendees.forEach(key => {
      const [type, idStr] = key.split(':');
      const id = Number(idStr);
      if (type === 'board') {
        const b = boardMembers.find(x => x.id === id);
        if (b) result.push({ attendee_type: 'board_member', board_member_id: b.id, attendee_name_snapshot: b.full_name, signature_snapshot: b.signature || null });
      } else {
        const m = members.find(x => x.id === id);
        if (m) result.push({ attendee_type: 'member', member_id: m.id, attendee_name_snapshot: m.full_name, signature_snapshot: m.signature || null });
      }
    });
    return result;
  };

  const minutesPages = useMemo(() => {
    const attendees = attendeePayload();
    const pages: { attendees: AttendeeInput[] }[] = [];
    for (let i = 0; i < Math.max(attendees.length, 1); i += MINUTES_ROWS_PER_PAGE) {
      pages.push({ attendees: attendees.slice(i, i + MINUTES_ROWS_PER_PAGE) });
    }
    return pages.length ? pages : [{ attendees: [] }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAttendees, boardMembers, members]);

  const save = async () => {
    if (!form.meeting_date) { setError('Meeting date is required'); return; }
    setSaving(true); setError('');
    try {
      await new Promise(r => setTimeout(r, 50));
      const pages = pageRefs.current.filter(Boolean) as HTMLDivElement[];
      const pdfBase64 = pages.length ? await generatePagedPdfBase64(pages) : null;
      const payload = {
        meeting_type: form.meeting_type, meeting_date: form.meeting_date, meeting_time: form.meeting_time || null,
        venue: form.venue || null, agenda: form.agendaItems.filter(a => a.trim()).join('\n'),
        minutes_resolutions: form.minutes_resolutions || null, next_meeting_date: form.next_meeting_date || null,
        pdf_base64: pdfBase64, attendees: attendeePayload(),
      };
      await npoFetch('/meetings', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const download = async (m: MeetingListItem) => {
    try { await downloadNpoPdf(`/meetings/${m.id}/pdf`, `npo-meeting-${m.meeting_type}-${m.meeting_date}.pdf`); }
    catch (e: any) { alert(e.message); }
  };

  const remove = async (m: MeetingListItem) => {
    if (!confirm('Delete this meeting record?')) return;
    try { await npoFetch(`/meetings/${m.id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const loadVotes = (requestId: number) => {
    npoFetch<ApprovalVote[]>(`/approvals/${requestId}/votes`)
      .then(list => setVotes(prev => ({ ...prev, [requestId]: list })))
      .catch(e => setError(e.message));
  };

  const toggleExpanded = (m: MeetingListItem) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(m.id)) { next.delete(m.id); }
      else { next.add(m.id); if (m.approval && !votes[m.approval.request_id]) loadVotes(m.approval.request_id); }
      return next;
    });
  };

  const castApprovalVote = async (requestId: number, voterType: 'board' | 'member', decision: 'approve' | 'reject') => {
    const key = `${requestId}:${voterType}`;
    const voterId = voteSelection[key];
    if (!voterId) return;
    setBusyRequestId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/votes`, { method: 'POST', body: JSON.stringify({ voter_type: voterType, voter_id: Number(voterId), decision }) });
      setVoteSelection(prev => ({ ...prev, [key]: '' }));
      loadVotes(requestId);
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyRequestId(null); }
  };

  const withdrawApprovalVote = async (requestId: number, voterType: 'board' | 'member', voterId: number) => {
    setBusyRequestId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/votes/${voterType}/${voterId}`, { method: 'DELETE' });
      loadVotes(requestId);
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyRequestId(null); }
  };

  const overrideApprovalStage = async (requestId: number, stage: ApprovalStage) => {
    setBusyRequestId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyRequestId(null); }
  };

  if (loading) return <LoadingState label="Loading meetings…" fullHeight />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><History size={16} /> Meeting History</h3>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} /> Add Meeting
        </button>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No meetings recorded yet" bordered />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Date</th><th className="px-4 py-2">Venue</th><th className="px-4 py-2">Stage</th><th className="px-4 py-2"></th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meetings.map(m => {
                const approval = m.approval;
                const requestId = approval?.request_id;
                const requestVotes = requestId ? (votes[requestId] || []) : [];
                const votedBoardIds = new Set(requestVotes.filter(v => v.voter_type === 'board').map(v => v.voter_id));
                const votedMemberIds = new Set(requestVotes.filter(v => v.voter_type === 'member').map(v => v.voter_id));
                const eligibleBoard = boardMembers.filter(b => b.board_type === 'executive' && !votedBoardIds.has(b.id));
                const eligibleMembers = members.filter(x => !votedMemberIds.has(x.id));
                const busy = requestId != null && busyRequestId === requestId;
                const stage = approval?.stage;
                return (
                  <Fragment key={m.id}>
                    <tr className="cursor-pointer hover:bg-gray-50" onClick={() => toggleExpanded(m)}>
                      <td className="px-4 py-2 font-medium text-gray-900 flex items-center gap-1.5">
                        <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded.has(m.id) ? 'rotate-90' : ''}`} />
                        {m.meeting_type === 'agm' ? 'Annual General Meeting' : 'Regular Board Meeting'}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{fmtDate(m.meeting_date)}</td>
                      <td className="px-4 py-2 text-gray-600">{m.venue || '—'}</td>
                      <td className="px-4 py-2">
                        {stage && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STAGE_COLOR[stage]}`}>
                            {stage === 'board_review' && `${STAGE_LABEL[stage]} · ${approval!.board_approve_count}/${approval!.board_required}`}
                            {stage === 'member_vote' && `${STAGE_LABEL[stage]} · ${approval!.member_approve_count}/${approval!.member_required}`}
                            {(stage === 'approved' || stage === 'rejected') && STAGE_LABEL[stage]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right" onClick={e => e.stopPropagation()}>
                        {m.has_pdf && <button onClick={() => download(m)} className="text-gray-400 hover:text-[#14856E] mr-2" title="Download PDF"><Download size={15} /></button>}
                        <button onClick={() => remove(m)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                    {expanded.has(m.id) && approval && requestId && (
                      <tr>
                        <td colSpan={5} className="px-4 pb-4 bg-gray-50">
                          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-3">
                            {stage === 'approved' && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-green-700 font-medium">
                                  ✓ Approved as permanent — board {approval.board_approve_count}/{approval.board_required}, members {approval.member_approve_count}/{approval.member_required}.
                                </p>
                                <button onClick={() => overrideApprovalStage(requestId, 'board_review')} disabled={busy}
                                  className="text-xs text-gray-500 hover:text-amber-700 underline flex-shrink-0 ml-3">Reopen</button>
                              </div>
                            )}
                            {stage === 'rejected' && (
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-red-700 font-medium">✗ Rejected.</p>
                                <button onClick={() => overrideApprovalStage(requestId, 'board_review')} disabled={busy}
                                  className="text-xs text-gray-500 hover:text-blue-700 underline flex-shrink-0 ml-3">Reopen</button>
                              </div>
                            )}
                            {stage === 'board_review' && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">
                                  Stage 1 — Executive Board review. Needs {approval.board_required} of {boardMembers.filter(b => b.board_type === 'executive').length} active executive members to approve (simple majority). {approval.board_approve_count} approved, {approval.board_reject_count} rejected so far.
                                </p>
                                <button onClick={() => overrideApprovalStage(requestId, 'member_vote')} disabled={busy}
                                  className="text-xs text-gray-500 hover:text-green-700 underline mb-2">Advance to member vote directly (admin override)</button>
                              </div>
                            )}
                            {stage === 'member_vote' && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">
                                  Stage 2 — General Member vote. Needs {approval.member_required} of {members.length} active members to approve (2/3 majority) to become permanent. {approval.member_approve_count} approved, {approval.member_reject_count} rejected so far.
                                </p>
                                <button onClick={() => overrideApprovalStage(requestId, 'approved')} disabled={busy}
                                  className="text-xs text-gray-500 hover:text-green-700 underline mb-2">Mark approved directly (admin override)</button>
                              </div>
                            )}

                            {requestVotes.length > 0 && (
                              <ul className="text-xs text-gray-600 space-y-1">
                                {requestVotes.map(v => (
                                  <li key={`${v.voter_type}-${v.voter_id}-${v.stage}`} className="flex items-center justify-between">
                                    <span>
                                      {v.voter_name} <span className="text-gray-400">({v.voter_type === 'board' ? 'board' : 'member'})</span> —{' '}
                                      <span className={v.decision === 'approve' ? 'text-green-700' : 'text-red-700'}>{v.decision}</span> — {fmtDate(v.voted_at)}
                                    </span>
                                    <button onClick={() => withdrawApprovalVote(requestId, v.voter_type, v.voter_id)} disabled={busy} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {stage === 'board_review' && eligibleBoard.length > 0 && (
                              <div className="flex gap-2">
                                <select className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                                  value={voteSelection[`${requestId}:board`] || ''}
                                  onChange={e => setVoteSelection(prev => ({ ...prev, [`${requestId}:board`]: e.target.value }))}>
                                  <option value="">Select executive board member…</option>
                                  {eligibleBoard.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                                </select>
                                <button onClick={() => castApprovalVote(requestId, 'board', 'approve')} disabled={busy || !voteSelection[`${requestId}:board`]}
                                  className="px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a] disabled:opacity-50">Approve</button>
                                <button onClick={() => castApprovalVote(requestId, 'board', 'reject')} disabled={busy || !voteSelection[`${requestId}:board`]}
                                  className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
                              </div>
                            )}
                            {stage === 'member_vote' && eligibleMembers.length > 0 && (
                              <div className="flex gap-2">
                                <select className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                                  value={voteSelection[`${requestId}:member`] || ''}
                                  onChange={e => setVoteSelection(prev => ({ ...prev, [`${requestId}:member`]: e.target.value }))}>
                                  <option value="">Select general member…</option>
                                  {eligibleMembers.map(x => <option key={x.id} value={x.id}>{x.full_name}</option>)}
                                </select>
                                <button onClick={() => castApprovalVote(requestId, 'member', 'approve')} disabled={busy || !voteSelection[`${requestId}:member`]}
                                  className="px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a] disabled:opacity-50">Approve</button>
                                <button onClick={() => castApprovalVote(requestId, 'member', 'reject')} disabled={busy || !voteSelection[`${requestId}:member`]}
                                  className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)} containerClassName="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Add Meeting</h3>
            <button onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <ErrorBanner message={error} className="mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg px-3 py-2 text-sm" value={form.meeting_type} onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value as MeetingType }))}>
              <option value="regular">Regular Board Meeting</option>
              <option value="agm">Annual General Meeting</option>
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Venue" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
            <div><label className="text-xs text-gray-500">Date *</label><input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.meeting_date} onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))} /></div>
            <div><label className="text-xs text-gray-500">Time</label><input type="time" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.meeting_time} onChange={e => setForm(f => ({ ...f, meeting_time: e.target.value }))} /></div>
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Agenda items</label>
            {form.agendaItems.map((item, i) => (
              <div key={i} className="flex gap-2 mt-1">
                <input className="flex-1 border rounded-lg px-3 py-2 text-sm" value={item}
                  onChange={e => setForm(f => ({ ...f, agendaItems: f.agendaItems.map((a, idx) => idx === i ? e.target.value : a) }))}
                  placeholder={`Agenda item ${i + 1}`} />
                {form.agendaItems.length > 1 && (
                  <button onClick={() => setForm(f => ({ ...f, agendaItems: f.agendaItems.filter((_, idx) => idx !== i) }))} className="text-gray-400 hover:text-red-600"><X size={16} /></button>
                )}
              </div>
            ))}
            <button onClick={() => setForm(f => ({ ...f, agendaItems: [...f.agendaItems, ''] }))} className="text-sm text-[#14856E] mt-2 hover:underline">+ Add agenda item</button>
          </div>

          <div className="mt-4">
            <label className="text-xs text-gray-500">Attendees</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-1">Boards</p>
                {boardMembers.map(b => (
                  <label key={b.id} className="flex items-center gap-2 text-sm py-0.5">
                    <input type="checkbox" checked={selectedAttendees.has(`board:${b.id}`)} onChange={() => toggleAttendee(`board:${b.id}`)} />
                    {b.full_name} <span className="text-xs text-gray-400">({b.board_type})</span>
                  </label>
                ))}
              </div>
              <div className="border rounded-lg p-2 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 mb-1">General Members</p>
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm py-0.5">
                    <input type="checkbox" checked={selectedAttendees.has(`member:${m.id}`)} onChange={() => toggleAttendee(`member:${m.id}`)} />
                    {m.full_name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <textarea className="w-full border rounded-lg px-3 py-2 text-sm mt-4" rows={4} placeholder="Minutes / resolutions"
            value={form.minutes_resolutions} onChange={e => setForm(f => ({ ...f, minutes_resolutions: e.target.value }))} />
          <div className="mt-3"><label className="text-xs text-gray-500">Next meeting date</label>
            <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.next_meeting_date} onChange={e => setForm(f => ({ ...f, next_meeting_date: e.target.value }))} />
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] disabled:opacity-60">
              {saving ? 'Saving…' : 'Save & Generate PDF'}
            </button>
          </div>
        </Modal>
      )}

      {/* Hidden off-screen letterhead capture tree for the minutes PDF */}
      {showForm && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          {minutesPages.map((page, pageIdx) => {
            const isFirst = pageIdx === 0;
            const isLast = pageIdx === minutesPages.length - 1;
            return (
              <div key={pageIdx} ref={el => { pageRefs.current[pageIdx] = el; }}
                style={{ position: 'relative', boxSizing: 'border-box', width: '210mm', minHeight: '297mm', padding: '15mm 12mm', fontFamily: 'Arial, sans-serif', color: '#111', background: '#ffffff' }}>
                {isFirst && (
                  <>
                    <Letterhead />
                    <h2 style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', margin: '12px 0 4px' }}>
                      {form.meeting_type === 'agm' ? 'ANNUAL GENERAL MEETING' : 'REGULAR BOARD MEETING'}
                    </h2>
                    <p style={{ textAlign: 'center', fontSize: '11px', color: '#4b5563', marginBottom: '16px' }}>
                      {fmtDate(form.meeting_date)}{form.meeting_time ? `, ${form.meeting_time}` : ''} {form.venue ? `— ${form.venue}` : ''}
                    </p>
                    {form.agendaItems.filter(a => a.trim()).length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Agenda</p>
                        <ol style={{ fontSize: '11px', paddingLeft: '18px' }}>
                          {form.agendaItems.filter(a => a.trim()).map((a, i) => <li key={i}>{a}</li>)}
                        </ol>
                      </div>
                    )}
                  </>
                )}
                <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Attendees{pageIdx > 0 ? ' (continued)' : ''}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', background: '#f3f4f6', fontSize: '10px', textAlign: 'left', width: '60%' }}>Name</th>
                      <th style={{ border: '1px solid #d1d5db', padding: '6px 8px', background: '#f3f4f6', fontSize: '10px', textAlign: 'left' }}>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.attendees.length === 0 ? (
                      <tr><td colSpan={2} style={{ border: '1px solid #e5e7eb', padding: '6px 8px', fontSize: '10px', color: '#9ca3af' }}>No attendees recorded</td></tr>
                    ) : page.attendees.map((a, i) => (
                      <tr key={i}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '6px 8px', fontSize: '10px' }}>{a.attendee_name_snapshot}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '6px 8px', height: '28px' }}>
                          {a.signature_snapshot && <img src={a.signature_snapshot} alt="" style={{ height: '22px' }} />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {isLast && (
                  <>
                    <p style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>Minutes / Resolutions</p>
                    <p style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>{form.minutes_resolutions || '—'}</p>
                    {form.next_meeting_date && (
                      <p style={{ fontSize: '11px', marginTop: '12px' }}><strong>Next meeting:</strong> {fmtDate(form.next_meeting_date)}</p>
                    )}
                  </>
                )}
                {minutesPages.length > 1 && (
                  <div style={{ position: 'absolute', bottom: '10mm', right: '12mm', fontSize: '9px', color: '#9ca3af' }}>Page {pageIdx + 1} of {minutesPages.length}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Constitution Tab ───────────────────────────────────────────────────────────
// Stored chapter-by-chapter as structured, readable/searchable text — not a
// single opaque PDF upload — so any member with NPO access can read each
// article directly in the app. Chapters are grouped by `part` (e.g. the
// source document's "Memorandum" / "Bylaws" divisions) and ordered by
// sort_order, matching how the source constitution itself is organized into
// ধারা (articles).

interface ChapterFormState { part: string; chapter_label: string; title: string; content: string; sort_order: string; }
const EMPTY_CHAPTER_FORM: ChapterFormState = { part: '', chapter_label: '', title: '', content: '', sort_order: '' };

const STAGE_LABEL: Record<ApprovalStage, string> = {
  board_review: 'Board Review', member_vote: 'Member Vote', approved: 'Approved', rejected: 'Rejected',
};
const STAGE_COLOR: Record<ApprovalStage, string> = {
  board_review: 'bg-blue-100 text-blue-700', member_vote: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
};

function ConstitutionTab() {
  const [chapters, setChapters] = useState<ConstitutionChapter[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ConstitutionChapter | null>(null);
  const [form, setForm] = useState<ChapterFormState>(EMPTY_CHAPTER_FORM);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [votes, setVotes] = useState<Record<number, ApprovalVote[]>>({});
  const [voteSelection, setVoteSelection] = useState<Record<number, string>>({});
  const [busyChapterId, setBusyChapterId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      npoFetch<ConstitutionChapter[]>('/constitution'),
      npoFetch<Member[]>('/members?status=active&limit=500'),
      npoFetch<BoardMember[]>('/board-members?type=executive'),
    ]).then(([c, m, b]) => { setChapters(c); setMembers(m); setBoardMembers(b); })
      .catch(e => setError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const loadVotes = (requestId: number) => {
    npoFetch<ApprovalVote[]>(`/approvals/${requestId}/votes`)
      .then(list => setVotes(prev => ({ ...prev, [requestId]: list })))
      .catch(e => setError(e.message));
  };

  const toggleExpanded = (c: ConstitutionChapter) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(c.id)) { next.delete(c.id); }
      else { next.add(c.id); if (c.approval && !votes[c.approval.request_id]) loadVotes(c.approval.request_id); }
      return next;
    });
  };

  const castVote = async (requestId: number, voterType: 'board' | 'member', decision: 'approve' | 'reject') => {
    const key = `${requestId}:${voterType}`;
    const voterId = voteSelection[key];
    if (!voterId) return;
    setBusyChapterId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/votes`, { method: 'POST', body: JSON.stringify({ voter_type: voterType, voter_id: Number(voterId), decision }) });
      setVoteSelection(prev => ({ ...prev, [key]: '' }));
      loadVotes(requestId);
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyChapterId(null); }
  };

  const withdrawVote = async (requestId: number, voterType: 'board' | 'member', voterId: number) => {
    setBusyChapterId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/votes/${voterType}/${voterId}`, { method: 'DELETE' });
      loadVotes(requestId);
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyChapterId(null); }
  };

  const overrideStage = async (requestId: number, stage: ApprovalStage) => {
    setBusyChapterId(requestId); setError('');
    try {
      await npoFetch(`/approvals/${requestId}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      load();
    } catch (e: any) { setError(e.message); } finally { setBusyChapterId(null); }
  };

  const openAdd = () => {
    setEditing(null);
    const nextOrder = chapters.length ? Math.max(...chapters.map(c => c.sort_order ?? 0)) + 1 : 1;
    setForm({ ...EMPTY_CHAPTER_FORM, sort_order: String(nextOrder) });
    setShowForm(true);
  };
  const openEdit = (c: ConstitutionChapter) => {
    setEditing(c);
    setForm({ part: c.part || '', chapter_label: c.chapter_label || '', title: c.title, content: c.content || '', sort_order: String(c.sort_order ?? 0) });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        part: form.part || null, chapter_label: form.chapter_label || null,
        title: form.title.trim(), content: form.content || null,
        sort_order: form.sort_order ? Number(form.sort_order) : 0,
      };
      if (editing) await npoFetch(`/constitution/${editing.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      else await npoFetch('/constitution', { method: 'POST', body: JSON.stringify(payload) });
      setShowForm(false);
      load();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (c: ConstitutionChapter) => {
    if (!confirm(`Remove chapter "${c.title}"?`)) return;
    try { await npoFetch(`/constitution/${c.id}`, { method: 'DELETE' }); load(); }
    catch (e: any) { alert(e.message); }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ConstitutionChapter[]>();
    chapters.forEach(c => {
      const key = c.part || 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [chapters]);

  if (loading) return <LoadingState label="Loading constitution…" fullHeight />;

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} />
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2"><BookOpen size={16} /> Constitution</h3>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} /> Add Chapter
        </button>
      </div>

      {chapters.length === 0 ? (
        <EmptyState icon={BookOpen} title="No constitution chapters yet" description="Add the organization's constitution one chapter/article at a time so members can read it here." bordered />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([part, items]) => (
            <div key={part}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{part}</h4>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {items.map(c => {
                  const approval = c.approval;
                  const requestId = approval?.request_id;
                  const requestVotes = requestId ? (votes[requestId] || []) : [];
                  const votedBoardIds = new Set(requestVotes.filter(v => v.voter_type === 'board').map(v => v.voter_id));
                  const votedMemberIds = new Set(requestVotes.filter(v => v.voter_type === 'member').map(v => v.voter_id));
                  const eligibleBoard = boardMembers.filter(b => !votedBoardIds.has(b.id));
                  const eligibleMembers = members.filter(m => !votedMemberIds.has(m.id));
                  const busy = requestId != null && busyChapterId === requestId;
                  const stage = approval?.stage;
                  return (
                    <div key={c.id}>
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => toggleExpanded(c)}>
                        <div className="flex items-center gap-2 min-w-0">
                          <ChevronRight size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${expanded.has(c.id) ? 'rotate-90' : ''}`} />
                          {c.chapter_label && <span className="text-xs font-mono text-gray-400 flex-shrink-0">{c.chapter_label}</span>}
                          <span className="text-sm font-medium text-gray-900 truncate">{c.title}</span>
                          {stage && (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STAGE_COLOR[stage]}`}>
                              {stage === 'board_review' && `${STAGE_LABEL[stage]} · ${approval!.board_approve_count}/${approval!.board_required}`}
                              {stage === 'member_vote' && `${STAGE_LABEL[stage]} · ${approval!.member_approve_count}/${approval!.member_required}`}
                              {(stage === 'approved' || stage === 'rejected') && STAGE_LABEL[stage]}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => openEdit(c)} className="text-gray-400 hover:text-[#14856E]"><Edit2 size={14} /></button>
                          <button onClick={() => remove(c)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      {expanded.has(c.id) && (
                        <div className="px-4 pb-4 pl-10">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content || '—'}</p>

                          {approval && requestId && (
                            <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3">
                              {stage === 'approved' && (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-green-700 font-medium">
                                    ✓ Approved as permanent — board {approval.board_approve_count}/{approval.board_required}, members {approval.member_approve_count}/{approval.member_required}.
                                  </p>
                                  <button onClick={() => overrideStage(requestId, 'board_review')} disabled={busy}
                                    className="text-xs text-gray-500 hover:text-amber-700 underline flex-shrink-0 ml-3">Reopen</button>
                                </div>
                              )}
                              {stage === 'rejected' && (
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-red-700 font-medium">✗ Rejected.</p>
                                  <button onClick={() => overrideStage(requestId, 'board_review')} disabled={busy}
                                    className="text-xs text-gray-500 hover:text-blue-700 underline flex-shrink-0 ml-3">Reopen</button>
                                </div>
                              )}

                              {stage === 'board_review' && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">
                                    Stage 1 — Executive Board review. Needs {approval.board_required} of {boardMembers.length} active executive members to approve (simple majority) before this advances to a general member vote. {approval.board_approve_count} approved, {approval.board_reject_count} rejected so far.
                                  </p>
                                  <button onClick={() => overrideStage(requestId, 'member_vote')} disabled={busy}
                                    className="text-xs text-gray-500 hover:text-green-700 underline mb-2">Advance to member vote directly (admin override)</button>
                                </div>
                              )}
                              {stage === 'member_vote' && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-2">
                                    Stage 2 — General Member vote. Needs {approval.member_required} of {members.length} active members to approve (2/3 majority, ধারা-২৩) to become permanent. {approval.member_approve_count} approved, {approval.member_reject_count} rejected so far.
                                  </p>
                                  <button onClick={() => overrideStage(requestId, 'approved')} disabled={busy}
                                    className="text-xs text-gray-500 hover:text-green-700 underline mb-2">Mark approved directly (admin override)</button>
                                </div>
                              )}

                              {requestVotes.length > 0 && (
                                <ul className="text-xs text-gray-600 space-y-1">
                                  {requestVotes.map(v => (
                                    <li key={`${v.voter_type}-${v.voter_id}-${v.stage}`} className="flex items-center justify-between">
                                      <span>
                                        {v.voter_name} <span className="text-gray-400">({v.voter_type === 'board' ? 'board' : 'member'})</span> —{' '}
                                        <span className={v.decision === 'approve' ? 'text-green-700' : 'text-red-700'}>{v.decision}</span> — {fmtDate(v.voted_at)}
                                      </span>
                                      <button onClick={() => withdrawVote(requestId, v.voter_type, v.voter_id)} disabled={busy} className="text-gray-400 hover:text-red-600"><X size={12} /></button>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {stage === 'board_review' && eligibleBoard.length > 0 && (
                                <div className="flex gap-2">
                                  <select className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                                    value={voteSelection[`${requestId}:board`] || ''}
                                    onChange={e => setVoteSelection(prev => ({ ...prev, [`${requestId}:board`]: e.target.value }))}>
                                    <option value="">Select executive board member…</option>
                                    {eligibleBoard.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
                                  </select>
                                  <button onClick={() => castVote(requestId, 'board', 'approve')} disabled={busy || !voteSelection[`${requestId}:board`]}
                                    className="px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a] disabled:opacity-50">Approve</button>
                                  <button onClick={() => castVote(requestId, 'board', 'reject')} disabled={busy || !voteSelection[`${requestId}:board`]}
                                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
                                </div>
                              )}
                              {stage === 'member_vote' && eligibleMembers.length > 0 && (
                                <div className="flex gap-2">
                                  <select className="flex-1 border rounded-lg px-2 py-1.5 text-xs"
                                    value={voteSelection[`${requestId}:member`] || ''}
                                    onChange={e => setVoteSelection(prev => ({ ...prev, [`${requestId}:member`]: e.target.value }))}>
                                    <option value="">Select general member…</option>
                                    {eligibleMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                                  </select>
                                  <button onClick={() => castVote(requestId, 'member', 'approve')} disabled={busy || !voteSelection[`${requestId}:member`]}
                                    className="px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a] disabled:opacity-50">Approve</button>
                                  <button onClick={() => castVote(requestId, 'member', 'reject')} disabled={busy || !voteSelection[`${requestId}:member`]}
                                    className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">Reject</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Chapter' : 'Add Chapter'}</h3>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <ErrorBanner message={error} className="mb-3" />
            <div className="space-y-3">
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Part / section (e.g. Memorandum, Bylaws)"
                value={form.part} onChange={e => setForm(f => ({ ...f, part: e.target.value }))} />
              <div className="grid grid-cols-3 gap-3">
                <input className="col-span-1 border rounded-lg px-3 py-2 text-sm" placeholder="Label (ধারা-৫)"
                  value={form.chapter_label} onChange={e => setForm(f => ({ ...f, chapter_label: e.target.value }))} />
                <input className="col-span-2 border rounded-lg px-3 py-2 text-sm" placeholder="Chapter title *"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <textarea className="w-full border rounded-lg px-3 py-2 text-sm" rows={10} placeholder="Chapter text"
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Sort order (display position)" type="number"
                value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main NPO component ─────────────────────────────────────────────────────────

export function NPO() {
  const [tab, setTab] = useState<Tab>('organogram');

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">NPO Governance</h1>
        <p className="text-sm text-gray-500 mt-1">Organogram, membership, boards, and meeting records</p>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} compact />

      {tab === 'organogram' && <OrganogramTab />}
      {tab === 'membership' && <MembershipTab />}
      {tab === 'executive-board' && <BoardList boardType="executive" />}
      {tab === 'advisor-board' && <BoardList boardType="advisor" />}
      {tab === 'meetings' && <MeetingsTab />}
      {tab === 'constitution' && <ConstitutionTab />}
    </div>
  );
}
