import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen, Plus, X, Check, TrendingUp, TrendingDown, DollarSign, Clock,
  FileText, BarChart2, RefreshCw, Printer, Ban, Send, Eye, CheckCircle,
  Wallet, Pencil, Trash2, Loader2, AlertCircle, PlayCircle
} from 'lucide-react';
import {
  api,
  AccAccount, AccProject, AccVoucher, AccVoucherLine,
  AccVoucherType, AccVoucherStatus, AccLedgerEntry,
  AccTrialBalanceLine, AccIncomeExpenseReport, AccDashboard, AccAccountType,
  AccDonation, AccExpense, AccMonthlySummary, AccCategoryMapping, AccPaymentMethodMapping, AccEmployee
} from '../services/api';

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'monthly-accounts' | 'accounts' | 'vouchers' | 'ledger' | 'reports';
type ReportType = 'trial-balance' | 'income-expense' | 'cash-book';

// ── Helpers ──────────────────────────────────────────────────────────────────

const VOUCHER_LABELS: Record<AccVoucherType, string> = {
  PV: 'Payment Voucher',
  RV: 'Receipt Voucher',
  JV: 'Journal Voucher',
  CV: 'Contra Voucher',
};

const STATUS_COLORS: Record<AccVoucherStatus, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Submitted: 'bg-blue-100 text-blue-700',
  Approved: 'bg-amber-100 text-amber-700',
  Posted: 'bg-green-100 text-green-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const TYPE_COLORS: Record<AccVoucherType, string> = {
  PV: 'bg-red-100 text-red-700',
  RV: 'bg-green-100 text-green-700',
  JV: 'bg-purple-100 text-purple-700',
  CV: 'bg-blue-100 text-blue-700',
};

function fmt(n: number | undefined | null) {
  if (n === undefined || n === null) return '৳0';
  return `৳${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const [data, setData] = useState<AccDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.accGetDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
  if (!data) return null;

  const cards = [
    { label: 'Total Income', value: fmt(data.total_income), icon: TrendingUp, color: 'bg-green-50 text-green-600', border: 'border-green-200' },
    { label: 'Total Expense', value: fmt(data.total_expense), icon: TrendingDown, color: 'bg-red-50 text-red-600', border: 'border-red-200' },
    { label: 'Net Surplus', value: fmt(data.net_surplus), icon: DollarSign, color: data.net_surplus >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600', border: data.net_surplus >= 0 ? 'border-blue-200' : 'border-orange-200' },
    { label: 'Cash & Bank Balance', value: fmt(data.cash_balance), icon: BarChart2, color: 'bg-teal-50 text-teal-600', border: 'border-teal-200' },
  ];

  const counts = data.voucher_counts;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border ${c.border} bg-white p-5`}>
            <div className={`w-10 h-10 rounded-lg ${c.color} flex items-center justify-center mb-3`}>
              <c.icon size={20} />
            </div>
            <p className="text-xs text-gray-500 font-medium">{c.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Voucher Pipeline</h3>
          <div className="space-y-3">
            {[
              { label: 'Draft', count: counts.draft, color: 'bg-gray-300' },
              { label: 'Submitted', count: counts.submitted, color: 'bg-blue-400' },
              { label: 'Approved', count: counts.approved, color: 'bg-amber-400' },
              { label: 'Posted', count: counts.posted, color: 'bg-green-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="w-20 text-sm text-gray-600">{s.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${s.color} h-2 rounded-full transition-all`}
                    style={{ width: counts.total ? `${(s.count / counts.total) * 100}%` : '0%' }}
                  />
                </div>
                <span className="w-6 text-sm font-semibold text-gray-700 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Vouchers</h3>
          {data.recent_vouchers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No vouchers yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_vouchers.map((v) => (
                <div key={v.voucher_no} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TYPE_COLORS[v.voucher_type]}`}>{v.voucher_type}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{v.voucher_no}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[140px]">{v.narration}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{fmt(v.total_amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Chart of Accounts Tab ─────────────────────────────────────────────────────

function AccountsTab() {
  const [accounts, setAccounts] = useState<AccAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<AccAccountType | 'all'>('all');
  const [form, setForm] = useState({ code: '', name: '', account_type: 'Asset' as AccAccountType, parent_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.accGetAccounts().then(setAccounts).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setError('');
    if (!form.code || !form.name) { setError('Code and name are required.'); return; }
    setSaving(true);
    try {
      await api.accCreateAccount({
        code: form.code,
        name: form.name,
        account_type: form.account_type,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      });
      setShowModal(false);
      setForm({ code: '', name: '', account_type: 'Asset', parent_id: '' });
      load();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const typeGroups: AccAccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
  const typeColors: Record<AccAccountType, string> = {
    Asset: 'bg-blue-100 text-blue-700',
    Liability: 'bg-red-100 text-red-700',
    Equity: 'bg-purple-100 text-purple-700',
    Income: 'bg-green-100 text-green-700',
    Expense: 'bg-orange-100 text-orange-700',
  };

  const filtered = filter === 'all' ? accounts : accounts.filter((a) => a.account_type === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(['all', ...typeGroups] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-[#14856E] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] text-sm font-medium"
        >
          <Plus size={16} />Add Account
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading accounts…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Account Name</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-700">{a.code}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {a.parent_id && <span className="text-gray-400 mr-2">↳</span>}
                      {a.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[a.account_type]}`}>{a.account_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(a.balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-10 text-gray-400">No accounts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">New Account</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {error && <p className="text-sm text-red-600 mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Account Code</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" placeholder="e.g. 1110" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Account Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Type</label>
                <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value as AccAccountType })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                  {typeGroups.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Parent Account (optional)</label>
                <select value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                  <option value="">— None —</option>
                  {accounts.filter((a) => a.account_type === form.account_type).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Voucher Modal ─────────────────────────────────────────────────────────────

interface VoucherModalProps {
  accounts: AccAccount[];
  projects: AccProject[];
  onClose: () => void;
  onSaved: () => void;
  editing?: AccVoucher | null;
}

const EMPTY_LINE: AccVoucherLine = { account_id: 0, debit: 0, credit: 0, narration: '' };

function VoucherModal({ accounts, projects, onClose, onSaved, editing }: VoucherModalProps) {
  const [form, setForm] = useState({
    voucher_type: (editing?.voucher_type ?? 'RV') as AccVoucherType,
    date: editing?.date?.slice(0, 10) ?? today(),
    narration: editing?.narration ?? '',
    project_id: editing?.project_id ? String(editing.project_id) : '',
  });
  const [lines, setLines] = useState<AccVoucherLine[]>(
    editing?.lines?.length ? editing.lines : [{ ...EMPTY_LINE }, { ...EMPTY_LINE }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateLine = (i: number, field: keyof AccVoucherLine, value: string | number) => {
    setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  };

  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + Number(l.credit || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005;

  const save = async () => {
    setError('');
    if (!form.narration.trim()) { setError('Narration is required.'); return; }
    if (!balanced) { setError(`Debits (${totalDebit.toFixed(2)}) must equal credits (${totalCredit.toFixed(2)}).`); return; }
    const validLines = lines.filter((l) => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) { setError('At least 2 valid lines are required.'); return; }

    setSaving(true);
    try {
      const payload = {
        voucher_type: form.voucher_type,
        date: form.date,
        narration: form.narration,
        project_id: form.project_id ? Number(form.project_id) : null,
        lines: validLines.map((l) => ({ account_id: Number(l.account_id), debit: Number(l.debit || 0), credit: Number(l.credit || 0), narration: l.narration })),
      };
      if (editing) {
        await api.accUpdateVoucher(editing.id, payload);
      } else {
        await api.accCreateVoucher(payload);
      }
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'New'} Voucher</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Type</label>
              <select value={form.voucher_type} onChange={(e) => setForm({ ...form, voucher_type: e.target.value as AccVoucherType })} disabled={!!editing}
                className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                {(['PV', 'RV', 'JV', 'CV'] as AccVoucherType[]).map((t) => (
                  <option key={t} value={t}>{t} — {VOUCHER_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-600">Project</label>
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="mt-1 w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">— No Project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600">Narration</label>
            <input value={form.narration} onChange={(e) => setForm({ ...form, narration: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
              placeholder="Brief description of this voucher" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Voucher Lines</label>
              <button onClick={() => setLines([...lines, { ...EMPTY_LINE }])} className="text-xs text-[#14856E] hover:underline flex items-center gap-1">
                <Plus size={12} /> Add Line
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left pb-2 pr-2">Account</th>
                    <th className="text-right pb-2 px-2 w-28">Debit</th>
                    <th className="text-right pb-2 px-2 w-28">Credit</th>
                    <th className="text-left pb-2 pl-2">Narration</th>
                    <th className="w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-1.5 pr-2">
                        <select
                          value={line.account_id || ''}
                          onChange={(e) => updateLine(i, 'account_id', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#14856E]"
                        >
                          <option value="">Select account</option>
                          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.debit || ''}
                          onChange={(e) => updateLine(i, 'debit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#14856E]"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number" min="0" step="0.01"
                          value={line.credit || ''}
                          onChange={(e) => updateLine(i, 'credit', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#14856E]"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-1.5 pl-2">
                        <input
                          value={line.narration || ''}
                          onChange={(e) => updateLine(i, 'narration', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#14856E]"
                          placeholder="optional"
                        />
                      </td>
                      <td className="py-1.5 pl-1">
                        {lines.length > 2 && (
                          <button onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-300 font-semibold text-sm">
                  <tr>
                    <td className="pt-2 text-gray-600">Totals</td>
                    <td className={`pt-2 px-2 text-right ${balanced ? 'text-green-700' : 'text-red-600'}`}>{totalDebit.toFixed(2)}</td>
                    <td className={`pt-2 px-2 text-right ${balanced ? 'text-green-700' : 'text-red-600'}`}>{totalCredit.toFixed(2)}</td>
                    <td className="pt-2 pl-2">
                      {balanced && totalDebit > 0
                        ? <span className="text-green-600 flex items-center gap-1 text-xs"><Check size={12} />Balanced</span>
                        : totalDebit > 0 ? <span className="text-red-500 text-xs">Diff: {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                        : null}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving || !balanced} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Voucher'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Voucher Detail Modal ──────────────────────────────────────────────────────

function VoucherDetailModal({ id, onClose, onRefresh }: { id: number; onClose: () => void; onRefresh: () => void }) {
  const [voucher, setVoucher] = useState<AccVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState('');

  const load = () => {
    setLoading(true);
    api.accGetVoucher(id).then(setVoucher).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const action = async (fn: () => Promise<any>, label: string) => {
    setActing(label);
    try { await fn(); load(); onRefresh(); }
    catch (e: any) { alert(e.message); }
    finally { setActing(''); }
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 text-gray-500">Loading…</div>
    </div>
  );
  if (!voucher) return null;

  const totalDebit = (voucher.lines ?? []).reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = (voucher.lines ?? []).reduce((s, l) => s + Number(l.credit), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        <div className="flex items-start justify-between p-5 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${TYPE_COLORS[voucher.voucher_type]}`}>{voucher.voucher_type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[voucher.status]}`}>{voucher.status}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900">{voucher.voucher_no}</h3>
            <p className="text-sm text-gray-500">{voucher.narration}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Date</span><p className="font-medium">{voucher.date?.slice(0, 10)}</p></div>
            <div><span className="text-gray-500">Project</span><p className="font-medium">{voucher.project_name || '—'}</p></div>
            <div><span className="text-gray-500">Created By</span><p className="font-medium">{voucher.created_by_name || '—'}</p></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="text-left pb-2">Account</th>
                  <th className="text-right pb-2 w-24">Debit</th>
                  <th className="text-right pb-2 w-24">Credit</th>
                  <th className="text-left pb-2 pl-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {(voucher.lines ?? []).map((l, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{l.account_code} — {l.account_name}</td>
                    <td className="py-2 text-right">{Number(l.debit) > 0 ? fmt(l.debit) : ''}</td>
                    <td className="py-2 text-right">{Number(l.credit) > 0 ? fmt(l.credit) : ''}</td>
                    <td className="py-2 pl-2 text-gray-500">{l.narration}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 font-semibold">
                <tr>
                  <td className="pt-2 text-gray-600">Total</td>
                  <td className="pt-2 text-right">{fmt(totalDebit)}</td>
                  <td className="pt-2 text-right">{fmt(totalCredit)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex gap-2 p-5 border-t border-gray-200 flex-wrap">
          {voucher.status === 'Draft' && (
            <button onClick={() => action(() => api.accSubmitVoucher(id), 'submit')} disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              <Send size={14} />{acting === 'submit' ? 'Submitting…' : 'Submit'}
            </button>
          )}
          {voucher.status === 'Submitted' && (
            <button onClick={() => action(() => api.accApproveVoucher(id), 'approve')} disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50">
              <Check size={14} />{acting === 'approve' ? 'Approving…' : 'Approve'}
            </button>
          )}
          {voucher.status === 'Approved' && (
            <button onClick={() => action(() => api.accPostVoucher(id), 'post')} disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
              <CheckCircle size={14} />{acting === 'post' ? 'Posting…' : 'Post to Ledger'}
            </button>
          )}
          {!['Cancelled', 'Posted'].includes(voucher.status) && (
            <button onClick={() => {
              const reason = prompt('Cancellation reason (optional):');
              if (reason !== null) action(() => api.accCancelVoucher(id, reason), 'cancel');
            }} disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              <Ban size={14} />{acting === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
          {voucher.status === 'Posted' && (
            <button onClick={() => {
              if (confirm('Cancel this posted voucher? This will reverse the ledger entries.')) {
                const reason = prompt('Cancellation reason:') ?? '';
                action(() => api.accCancelVoucher(id, reason), 'cancel');
              }
            }} disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
              <Ban size={14} />{acting === 'cancel' ? 'Reversing…' : 'Reverse Entry'}
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            <Printer size={14} />Print
          </button>
          <button onClick={onClose} className="ml-auto px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Vouchers Tab ──────────────────────────────────────────────────────────────

function VouchersTab() {
  const [vouchers, setVouchers] = useState<AccVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccAccount[]>([]);
  const [projects, setProjects] = useState<AccProject[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE = 20;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.accGetVouchers({ type: typeFilter || undefined, status: statusFilter || undefined, from: dateFrom || undefined, to: dateTo || undefined, limit: PAGE, offset }),
      api.accGetAccounts(),
      api.accGetProjects(),
    ]).then(([vr, ac, pr]) => {
      setVouchers(vr.data);
      setTotal(vr.total);
      setAccounts(ac);
      setProjects(pr);
    }).catch(console.error).finally(() => setLoading(false));
  }, [typeFilter, statusFilter, dateFrom, dateTo, offset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex gap-2 flex-wrap flex-1">
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            <option value="">All Types</option>
            {(['PV', 'RV', 'JV', 'CV'] as AccVoucherType[]).map((t) => <option key={t} value={t}>{t} — {VOUCHER_LABELS[t]}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            <option value="">All Status</option>
            {(['Draft', 'Submitted', 'Approved', 'Posted', 'Cancelled'] as AccVoucherStatus[]).map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setOffset(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setOffset(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a]">
          <Plus size={16} />New Voucher
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading vouchers…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Voucher No</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Narration</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{v.voucher_no}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[v.voucher_type]}`}>{v.voucher_type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-[180px] truncate">{v.narration}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt(v.total_amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[v.status]}`}>{v.status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setDetailId(v.id)} className="text-[#14856E] hover:text-[#0f6b5a]">
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {vouchers.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No vouchers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {total > PAGE && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
              <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                <button onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= total} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <VoucherModal accounts={accounts} projects={projects} onClose={() => setShowModal(false)} onSaved={load} />
      )}
      {detailId !== null && (
        <VoucherDetailModal id={detailId} onClose={() => setDetailId(null)} onRefresh={load} />
      )}
    </div>
  );
}

// ── Ledger Tab ────────────────────────────────────────────────────────────────

function LedgerTab() {
  const [accounts, setAccounts] = useState<AccAccount[]>([]);
  const [entries, setEntries] = useState<AccLedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);
  const PAGE = 50;

  useEffect(() => {
    api.accGetAccounts().then(setAccounts).catch(console.error);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.accGetLedger({
      account_id: accountId ? Number(accountId) : undefined,
      from: from || undefined,
      to: to || undefined,
      limit: PAGE,
      offset,
    }).then((r) => { setEntries(r.data); setTotal(r.total); })
      .catch(console.error).finally(() => setLoading(false));
  }, [accountId, from, to, offset]);

  useEffect(() => { load(); }, [load]);

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-gray-600">Account</label>
          <select value={accountId} onChange={(e) => { setAccountId(e.target.value); setOffset(0); }}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            <option value="">All Accounts</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">From</label>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setOffset(0); }}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">To</label>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setOffset(0); }}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          <RefreshCw size={14} />Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading ledger…</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{e.date?.slice(0, 10)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[e.voucher_type]}`}>{e.voucher_type}</span>
                        <span className="font-mono text-xs">{e.voucher_no}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.account_code} — {e.account_name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{e.narration}</td>
                    <td className="px-4 py-3 text-right text-red-700">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                    <td className="px-4 py-3 text-right text-green-700">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(e.running_balance)}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No ledger entries</td></tr>
                )}
              </tbody>
              {entries.length > 0 && (
                <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-gray-600">Totals ({entries.length} entries)</td>
                    <td className="px-4 py-3 text-right text-red-700">{fmt(totalDebit)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt(totalCredit)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {total > PAGE && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
              <span>{offset + 1}–{Math.min(offset + PAGE, total)} of {total}</span>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - PAGE))} disabled={offset === 0} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
                <button onClick={() => setOffset(offset + PAGE)} disabled={offset + PAGE >= total} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab() {
  const [reportType, setReportType] = useState<ReportType>('income-expense');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [asOf, setAsOf] = useState('');
  const [loading, setLoading] = useState(false);

  const [trialBalance, setTrialBalance] = useState<AccTrialBalanceLine[]>([]);
  const [incomeExpense, setIncomeExpense] = useState<AccIncomeExpenseReport | null>(null);
  const [cashBook, setCashBook] = useState<AccLedgerEntry[]>([]);

  const run = async () => {
    setLoading(true);
    try {
      if (reportType === 'trial-balance') {
        setTrialBalance(await api.accGetTrialBalance(asOf || undefined));
      } else if (reportType === 'income-expense') {
        setIncomeExpense(await api.accGetIncomeExpense(from || undefined, to || undefined));
      } else {
        setCashBook(await api.accGetCashBook({ from: from || undefined, to: to || undefined }));
      }
    } catch (e: any) { alert(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { run(); }, [reportType]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600">Report</label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}
            className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            <option value="income-expense">Income & Expense</option>
            <option value="trial-balance">Trial Balance</option>
            <option value="cash-book">Cash Book</option>
          </select>
        </div>
        {reportType === 'trial-balance' ? (
          <div>
            <label className="text-xs font-medium text-gray-600">As Of Date</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
              className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600">From</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">To</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 block px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </>
        )}
        <button onClick={run} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <BarChart2 size={14} />}
          {loading ? 'Running…' : 'Run Report'}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
          <Printer size={14} />Print
        </button>
      </div>

      {reportType === 'income-expense' && incomeExpense && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-200">
              <h4 className="font-semibold text-green-800 flex items-center gap-2"><TrendingUp size={16} />Income</h4>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {incomeExpense.income.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{r.name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-green-700">{fmt(r.amount)}</td>
                  </tr>
                ))}
                {incomeExpense.income.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-gray-400">No income</td></tr>}
              </tbody>
              <tfoot className="border-t-2 border-green-300 bg-green-50 font-bold">
                <tr><td className="px-4 py-2.5 text-green-800">Total Income</td><td className="px-4 py-2.5 text-right text-green-800">{fmt(incomeExpense.total_income)}</td></tr>
              </tfoot>
            </table></div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200">
              <h4 className="font-semibold text-red-800 flex items-center gap-2"><TrendingDown size={16} />Expenses</h4>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {incomeExpense.expense.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-700">{r.name}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-700">{fmt(Math.abs(r.amount))}</td>
                  </tr>
                ))}
                {incomeExpense.expense.length === 0 && <tr><td colSpan={2} className="text-center py-6 text-gray-400">No expenses</td></tr>}
              </tbody>
              <tfoot className="border-t-2 border-red-300 bg-red-50 font-bold">
                <tr><td className="px-4 py-2.5 text-red-800">Total Expenses</td><td className="px-4 py-2.5 text-right text-red-800">{fmt(incomeExpense.total_expense)}</td></tr>
              </tfoot>
            </table></div>
          </div>
          <div className={`lg:col-span-2 rounded-xl border p-4 ${incomeExpense.net >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800">Net Surplus / (Deficit)</span>
              <span className={`text-xl font-bold ${incomeExpense.net >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(incomeExpense.net)}</span>
            </div>
          </div>
        </div>
      )}

      {reportType === 'trial-balance' && trialBalance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-right">Debit</th>
                  <th className="px-4 py-3 text-right">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trialBalance.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{r.code}</td>
                    <td className="px-4 py-2.5 text-gray-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{r.account_type}</td>
                    <td className="px-4 py-2.5 text-right">{r.total_debit > 0 ? fmt(r.total_debit) : ''}</td>
                    <td className="px-4 py-2.5 text-right">{r.total_credit > 0 ? fmt(r.total_credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-gray-700">Totals</td>
                  <td className="px-4 py-3 text-right">{fmt(trialBalance.reduce((s, r) => s + r.total_debit, 0))}</td>
                  <td className="px-4 py-3 text-right">{fmt(trialBalance.reduce((s, r) => s + r.total_credit, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {reportType === 'cash-book' && cashBook.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Voucher</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Receipt (Dr)</th>
                  <th className="px-4 py-3 text-right">Payment (Cr)</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cashBook.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600">{e.date?.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{e.voucher_no}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.account_name}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[150px] truncate">{e.narration}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{e.debit > 0 ? fmt(e.debit) : ''}</td>
                    <td className="px-4 py-2.5 text-right text-red-700">{e.credit > 0 ? fmt(e.credit) : ''}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{fmt(e.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        (reportType === 'trial-balance' && trialBalance.length === 0) ||
        (reportType === 'income-expense' && !incomeExpense) ||
        (reportType === 'cash-book' && cashBook.length === 0)
      ) && (
        <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400">
          No data for selected period. Adjust filters and click "Run Report".
        </div>
      )}
    </div>
  );
}

// ── Monthly Accounts Tab ─────────────────────────────────────────────────────

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const DEFAULT_DONATION_FORM = { date: today(), donor_name: '', donation_purpose: '', category: '', payment_method: 'Cash', amount: '' };
const DEFAULT_EXPENSE_FORM = { date: today(), particulars: '', project_id: '', category: '', consumer_name: '', payment_method: 'Cash', amount: '' };

const MANUAL_CATEGORY_VALUE = '__manual__';
const MANUAL_PAYMENT_METHOD_VALUE = '__manual__';
const MANUAL_CONSUMER_VALUE = '__manual__';
const PAYMENT_METHOD_OPTIONS = ['Cash', 'bKash', 'Nagad', 'Bank'];

function PaymentMethodField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isManual, setIsManual] = useState(() => !!value && !PAYMENT_METHOD_OPTIONS.includes(value));

  if (isManual) {
    return (
      <div className="mt-1 flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter payment method" autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        <button type="button" onClick={() => { setIsManual(false); onChange(''); }}
          className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
          Pick from list
        </button>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === MANUAL_PAYMENT_METHOD_VALUE) { setIsManual(true); onChange(''); return; }
        onChange(e.target.value);
      }}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
    >
      <option value="">Select payment method</option>
      {PAYMENT_METHOD_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
      <option value={MANUAL_PAYMENT_METHOD_VALUE}>Other (enter manually)</option>
    </select>
  );
}

function ConsumerField({ value, onChange, employees }: { value: string; onChange: (v: string) => void; employees: AccEmployee[] }) {
  const matchedEmployee = employees.find((e) => e.full_name === value);
  const [isManual, setIsManual] = useState(() => !!value && !matchedEmployee);

  if (isManual) {
    return (
      <div className="mt-1 flex gap-2">
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Enter a name" autoFocus
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
        {employees.length > 0 && (
          <button type="button" onClick={() => { setIsManual(false); onChange(''); }}
            className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            Pick from list
          </button>
        )}
      </div>
    );
  }

  return (
    <select
      value={matchedEmployee ? matchedEmployee.id : ''}
      onChange={(e) => {
        if (e.target.value === MANUAL_CONSUMER_VALUE) { setIsManual(true); onChange(''); return; }
        const employee = employees.find((emp) => String(emp.id) === e.target.value);
        onChange(employee ? employee.full_name : '');
      }}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
    >
      <option value="">Unassigned</option>
      {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>)}
      <option value={MANUAL_CONSUMER_VALUE}>Other (enter manually)</option>
    </select>
  );
}

function CategoryField({
  value, onChange, categories, placeholder, accounts, accountType, accountId, onAccountChange,
}: {
  value: string;
  categories: string[];
  onChange: (v: string) => void;
  placeholder: string;
  accounts: AccAccount[];
  accountType: 'Income' | 'Expense';
  accountId: string;
  onAccountChange: (id: string) => void;
}) {
  const [isManual, setIsManual] = useState(() => !!value && !categories.includes(value));
  const accountOptions = accounts.filter((a) => a.account_type === accountType && a.is_active);

  if (isManual) {
    return (
      <div className="mt-1 space-y-2">
        <div className="flex gap-2">
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          {categories.length > 0 && (
            <button type="button" onClick={() => { setIsManual(false); onChange(''); onAccountChange(''); }}
              className="shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              Pick from list
            </button>
          )}
        </div>
        <div>
          <label className="text-xs text-gray-500">Map to an Account <span className="text-gray-400">(optional now, required before processing)</span></label>
          <select value={accountId} onChange={(e) => onAccountChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            <option value="">— Skip, map later —</option>
            {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => {
        if (e.target.value === MANUAL_CATEGORY_VALUE) { setIsManual(true); onChange(''); return; }
        onChange(e.target.value);
      }}
      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]"
    >
      <option value="">Select a category</option>
      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value={MANUAL_CATEGORY_VALUE}>+ Add new category</option>
    </select>
  );
}

function DonationFormModal({ editing, categories, accounts, onClose, onSaved }: { editing: AccDonation | null; categories: string[]; accounts: AccAccount[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(
    editing
      ? { date: editing.date.slice(0, 10), donor_name: editing.donor_name, donation_purpose: editing.donation_purpose || '', category: editing.category, payment_method: editing.payment_method, amount: String(editing.amount) }
      : DEFAULT_DONATION_FORM
  );
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError('');
    if (!form.date || !form.donor_name || !form.category || !form.payment_method || !form.amount) {
      setError('Date, donor name, category, payment method, and amount are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await api.accUpdateDonation(editing.id, payload);
      else await api.accCreateDonation(payload);
      if (accountId) {
        await api.accCreateCategoryMapping({ entry_type: 'donation', category: form.category, account_id: Number(accountId) });
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
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'Add'} Donation</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Amount</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Donor Name</label>
            <input value={form.donor_name} onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Donation Purpose</label>
            <input value={form.donation_purpose} onChange={(e) => setForm({ ...form, donation_purpose: e.target.value })}
              placeholder="e.g. Sombhabona iHub"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Category</label>
              <CategoryField value={form.category} onChange={(v) => setForm({ ...form, category: v })} categories={categories} placeholder="e.g. Form Fee"
                accounts={accounts} accountType="Income" accountId={accountId} onAccountChange={setAccountId} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Payment Method</label>
              <PaymentMethodField value={form.payment_method} onChange={(v) => setForm({ ...form, payment_method: v })} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Donation'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExpenseFormModal({ editing, projects, categories, accounts, employees, onClose, onSaved }: { editing: AccExpense | null; projects: AccProject[]; categories: string[]; accounts: AccAccount[]; employees: AccEmployee[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(
    editing
      ? { date: editing.date.slice(0, 10), particulars: editing.particulars, project_id: editing.project_id ? String(editing.project_id) : '', category: editing.category, consumer_name: editing.consumer_name || '', payment_method: editing.payment_method, amount: String(editing.amount) }
      : DEFAULT_EXPENSE_FORM
  );
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setError('');
    if (!form.date || !form.particulars || !form.category || !form.payment_method || !form.amount) {
      setError('Date, particulars, category, payment method, and amount are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, project_id: form.project_id ? Number(form.project_id) : null, amount: Number(form.amount) };
      if (editing) await api.accUpdateExpense(editing.id, payload);
      else await api.accCreateExpense(payload);
      if (accountId) {
        await api.accCreateCategoryMapping({ entry_type: 'expense', category: form.category, account_id: Number(accountId) });
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
          <h3 className="text-lg font-bold text-gray-900">{editing ? 'Edit' : 'Add'} Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Amount</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Particulars</label>
            <input value={form.particulars} onChange={(e) => setForm({ ...form, particulars: e.target.value })}
              placeholder="e.g. Mobile Recharge"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Project</label>
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
                <option value="">— No Project —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Category</label>
              <CategoryField value={form.category} onChange={(v) => setForm({ ...form, category: v })} categories={categories} placeholder="e.g. Stationary"
                accounts={accounts} accountType="Expense" accountId={accountId} onAccountChange={setAccountId} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Consumer Name</label>
              <ConsumerField value={form.consumer_name} onChange={(v) => setForm({ ...form, consumer_name: v })} employees={employees} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Payment Method</label>
              <PaymentMethodField value={form.payment_method} onChange={(v) => setForm({ ...form, payment_method: v })} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MappingModal({
  entryType, category, paymentMethod, accounts, onClose, onSaved,
}: {
  entryType?: 'donation' | 'expense';
  category?: string;
  paymentMethod?: string;
  accounts: AccAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isPaymentMethod = !!paymentMethod;
  const relevantType: AccAccountType = isPaymentMethod ? 'Asset' : entryType === 'donation' ? 'Income' : 'Expense';
  const options = accounts.filter((a) => a.account_type === relevantType && a.is_active);
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!accountId) { setError('Select an account.'); return; }
    setSaving(true);
    setError('');
    try {
      if (isPaymentMethod) {
        await api.accCreatePaymentMethodMapping({ payment_method: paymentMethod!, account_id: Number(accountId) });
      } else {
        await api.accCreateCategoryMapping({ entry_type: entryType!, category: category!, account_id: Number(accountId) });
      }
      onSaved();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Map to an Account</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-600">
            {isPaymentMethod
              ? <>Payment method <strong>"{paymentMethod}"</strong> needs a GL account before it can be processed.</>
              : <><strong className="capitalize">{entryType}</strong> category <strong>"{category}"</strong> needs a GL account before it can be processed.</>}
          </p>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div>
            <label className="text-xs font-medium text-gray-600">
              {isPaymentMethod ? 'Asset Account' : entryType === 'donation' ? 'Income Account' : 'Expense Account'}
            </label>
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
              <option value="">Select account</option>
              {options.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-gray-400">Need a new account? Create it first from the "Chart of Accounts" tab, then map it here.</p>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2 bg-[#14856E] text-white rounded-lg text-sm font-medium hover:bg-[#0f6b5a] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Mapping'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MonthlyAccountsTab() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [donations, setDonations] = useState<AccDonation[]>([]);
  const [expenses, setExpenses] = useState<AccExpense[]>([]);
  const [summary, setSummary] = useState<AccMonthlySummary | null>(null);
  const [projects, setProjects] = useState<AccProject[]>([]);
  const [accounts, setAccounts] = useState<AccAccount[]>([]);
  const [donationCategories, setDonationCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [employees, setEmployees] = useState<AccEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ processed: number; failed: Array<{ type: string; id: number; reason: string }> } | null>(null);

  const [donationModal, setDonationModal] = useState<{ open: boolean; editing: AccDonation | null }>({ open: false, editing: null });
  const [expenseModal, setExpenseModal] = useState<{ open: boolean; editing: AccExpense | null }>({ open: false, editing: null });
  const [mappingModal, setMappingModal] = useState<{ entryType?: 'donation' | 'expense'; category?: string; paymentMethod?: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.accGetDonations(month, year),
      api.accGetExpenses(month, year),
      api.accGetMonthlySummary(month, year),
      api.accGetProjects(),
      api.accGetAccounts(),
      api.accGetCategoryMappings('donation'),
      api.accGetCategoryMappings('expense'),
      api.accGetEmployees(),
    ])
      .then(([d, e, s, p, a, dCat, eCat, emp]) => {
        setDonations(d); setExpenses(e); setSummary(s); setProjects(p); setAccounts(a); setEmployees(emp);
        setDonationCategories(Array.from(new Set([...dCat.map((c) => c.category), ...d.map((x) => x.category)])).sort());
        setExpenseCategories(Array.from(new Set([...eCat.map((c) => c.category), ...e.map((x) => x.category)])).sort());
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const processOne = async (type: 'donation' | 'expense', id: number) => {
    try {
      if (type === 'donation') await api.accProcessDonation(id);
      else await api.accProcessExpense(id);
      load();
    } catch (e: any) {
      if (e.message?.includes('Category')) {
        const row = type === 'donation' ? donations.find((d) => d.id === id) : expenses.find((x) => x.id === id);
        if (row) setMappingModal({ entryType: type, category: row.category });
      } else if (e.message?.includes('Payment method')) {
        const row = type === 'donation' ? donations.find((d) => d.id === id) : expenses.find((x) => x.id === id);
        if (row) setMappingModal({ paymentMethod: row.payment_method });
      } else {
        alert(e.message);
      }
    }
  };

  const processAll = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const result = await api.accProcessMonthlyAccounts(month, year);
      setProcessResult(result);
      load();
    } catch (e: any) { alert(e.message); }
    finally { setProcessing(false); }
  };

  const deleteDonation = async (id: number) => {
    if (!confirm('Delete this donation entry?')) return;
    try { await api.accDeleteDonation(id); load(); } catch (e: any) { alert(e.message); }
  };
  const deleteExpense = async (id: number) => {
    if (!confirm('Delete this expense entry?')) return;
    try { await api.accDeleteExpense(id); load(); } catch (e: any) { alert(e.message); }
  };

  const printMonthlyAccounts = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    const receiveRows = donations.map((d) => `
      <tr>
        <td>${new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
        <td>${d.donor_name}</td>
        <td>${d.donation_purpose || ''}</td>
        <td>${d.category}</td>
        <td>${d.payment_method}</td>
        <td class="num">${Number(d.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    const paymentRows = expenses.map((e) => `
      <tr>
        <td>${new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
        <td>${e.particulars}</td>
        <td>${e.project_name || ''}</td>
        <td>${e.category}</td>
        <td>${e.consumer_name || ''}</td>
        <td class="num">${Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>`).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Monthly Accounts - ${MONTH_NAMES[month - 1]} ${year}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 16px; color: #0f172a; font-size: 12px; }
            h1 { text-align: center; font-size: 20px; margin: 0 0 12px; }
            .summary { display: flex; margin-bottom: 12px; border: 1px solid #93c5a3; }
            .summary .cell { flex: 1; padding: 10px; text-align: center; border-right: 1px solid #93c5a3; }
            .summary .cell:last-child { border-right: none; }
            .summary .earn, .summary .cost { background: #fde68a; }
            .summary .balance { background: #6ee7b7; }
            .summary .lbl { font-size: 11px; font-weight: 700; }
            .summary .val { font-size: 16px; font-weight: 700; margin-top: 2px; }
            .cols { display: flex; gap: 8px; }
            .col { flex: 1; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #67e8f9; padding: 6px; text-align: left; font-size: 11px; border: 1px solid #cbd5e1; }
            .col.payment th { background: #fde68a; }
            td { padding: 5px 6px; border: 1px solid #e2e8f0; font-size: 11px; }
            td.num { text-align: right; }
            .section-head { text-align: center; font-weight: 700; padding: 6px; }
            .col.receive .section-head { background: #6ee7b7; }
            .col.payment .section-head { background: #fde68a; }
            @media print { body { padding: 4px; } }
          </style>
        </head>
        <body>
          <h1>Monthly accounts of Sombhabona Foundation — ${MONTH_NAMES[month - 1]} ${year}</h1>
          <div class="summary">
            <div class="cell balance"><div class="lbl">Remaining Balance</div><div class="val">${summary ? summary.remaining_balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</div></div>
            <div class="cell earn"><div class="lbl">Earn</div><div class="val">${summary ? summary.earn.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</div></div>
            <div class="cell cost"><div class="lbl">Total Cost</div><div class="val">${summary ? summary.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</div></div>
          </div>
          <div class="cols">
            <div class="col receive">
              <div class="section-head">Receive</div>
              <table>
                <thead><tr><th>Date</th><th>Donor Name</th><th>Donation Purpose</th><th>Category</th><th>Payment Method</th><th>Donation Amount</th></tr></thead>
                <tbody>${receiveRows || '<tr><td colspan="6" style="text-align:center">No entries</td></tr>'}</tbody>
              </table>
            </div>
            <div class="col payment">
              <div class="section-head">Payment</div>
              <table>
                <thead><tr><th>Date</th><th>Particulers</th><th>Project Name</th><th>Category</th><th>Consumer Name</th><th>Amount</th></tr></thead>
                <tbody>${paymentRows || '<tr><td colspan="6" style="text-align:center">No entries</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  const draftCount = donations.filter((d) => d.status === 'draft').length + expenses.filter((e) => e.status === 'draft').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#14856E]">
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {draftCount > 0 && (
            <button onClick={processAll} disabled={processing}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {processing ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
              Process {draftCount} Draft{draftCount === 1 ? '' : 's'} to Ledger
            </button>
          )}
          <button onClick={printMonthlyAccounts}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {processResult && processResult.failed.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <p className="font-semibold flex items-center gap-2"><AlertCircle size={16} /> Processed {processResult.processed}, {processResult.failed.length} need mapping first:</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            {processResult.failed.map((f) => <li key={`${f.type}-${f.id}`}>{f.reason} ({f.type} #{f.id})</li>)}
          </ul>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Remaining Balance</p>
            <p className={`text-2xl font-bold mt-1 ${summary.remaining_balance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmt(summary.remaining_balance)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Earn</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{fmt(summary.earn)}</p>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Total Cost</p>
            <p className="text-2xl font-bold mt-1 text-amber-700">{fmt(summary.total_cost)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-emerald-50 border-b border-emerald-200">
              <h3 className="font-semibold text-emerald-800">Receive</h3>
              <button onClick={() => setDonationModal({ open: true, editing: null })}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a]">
                <Plus size={13} /> Add Income
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Donor</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {donations.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No donations for this month.</td></tr>
                  ) : donations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(d.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{d.donor_name}</div>
                        <div className="text-xs text-gray-500">{d.donation_purpose}</div>
                      </td>
                      <td className="px-3 py-2">{d.category}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(d.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {d.status === 'posted' ? 'Posted' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {d.status === 'draft' && (
                            <>
                              <button onClick={() => processOne('donation', d.id)} title="Process to ledger" className="p-1.5 rounded bg-blue-50 text-blue-600"><PlayCircle size={14} /></button>
                              <button onClick={() => setDonationModal({ open: true, editing: d })} title="Edit" className="p-1.5 rounded bg-gray-50 text-gray-600"><Pencil size={14} /></button>
                              <button onClick={() => deleteDonation(d.id)} title="Delete" className="p-1.5 rounded bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-amber-50 border-b border-amber-200">
              <h3 className="font-semibold text-amber-800">Payment</h3>
              <button onClick={() => setExpenseModal({ open: true, editing: null })}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#14856E] text-white rounded-lg text-xs font-medium hover:bg-[#0f6b5a]">
                <Plus size={13} /> Add Expense
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Particulars</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No expenses for this month.</td></tr>
                  ) : expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{e.particulars}</div>
                        <div className="text-xs text-gray-500">{e.project_name}{e.consumer_name ? ` · ${e.consumer_name}` : ''}</div>
                      </td>
                      <td className="px-3 py-2">{e.category}</td>
                      <td className="px-3 py-2 text-right font-medium">{fmt(e.amount)}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {e.status === 'posted' ? 'Posted' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {e.status === 'draft' && (
                            <>
                              <button onClick={() => processOne('expense', e.id)} title="Process to ledger" className="p-1.5 rounded bg-blue-50 text-blue-600"><PlayCircle size={14} /></button>
                              <button onClick={() => setExpenseModal({ open: true, editing: e })} title="Edit" className="p-1.5 rounded bg-gray-50 text-gray-600"><Pencil size={14} /></button>
                              <button onClick={() => deleteExpense(e.id)} title="Delete" className="p-1.5 rounded bg-red-50 text-red-600"><Trash2 size={14} /></button>
                            </>
                          )}
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

      {donationModal.open && (
        <DonationFormModal editing={donationModal.editing} categories={donationCategories} accounts={accounts} onClose={() => setDonationModal({ open: false, editing: null })} onSaved={load} />
      )}
      {expenseModal.open && (
        <ExpenseFormModal editing={expenseModal.editing} projects={projects} categories={expenseCategories} accounts={accounts} employees={employees} onClose={() => setExpenseModal({ open: false, editing: null })} onSaved={load} />
      )}
      {mappingModal && (
        <MappingModal
          entryType={mappingModal.entryType}
          category={mappingModal.category}
          paymentMethod={mappingModal.paymentMethod}
          accounts={accounts}
          onClose={() => setMappingModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'monthly-accounts', label: 'Monthly Accounts', icon: Wallet },
  { id: 'accounts', label: 'Chart of Accounts', icon: BookOpen },
  { id: 'vouchers', label: 'Vouchers', icon: FileText },
  { id: 'ledger', label: 'General Ledger', icon: Clock },
  { id: 'reports', label: 'Reports', icon: TrendingUp },
];

export function Accounting() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div className="p-4 md:p-8 min-h-full">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <img src="/logo.png" alt="Sombhabona" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounting & Finance</h1>
        <p className="text-sm text-gray-600 mt-1">Double-entry bookkeeping, vouchers, and financial reports</p>
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

      {tab === 'overview' && <OverviewTab />}
      {tab === 'monthly-accounts' && <MonthlyAccountsTab />}
      {tab === 'accounts' && <AccountsTab />}
      {tab === 'vouchers' && <VouchersTab />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'reports' && <ReportsTab />}
    </div>
  );
}
