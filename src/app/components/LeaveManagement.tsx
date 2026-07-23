import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { api, LeaveBalanceApi, LeaveRequestApi, LeaveType } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateFormat';

const DEFAULT_FORM = {
  leave_type: 'Casual' as LeaveType,
  start_date: '',
  end_date: '',
  reason: '',
  is_backdated: false,
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function LeaveManagement() {
  const { user, hasRole } = useAuth();
  const [balances, setBalances] = useState<LeaveBalanceApi[]>([]);
  const [currentBalance, setCurrentBalance] = useState<LeaveBalanceApi | null>(null);
  const [requests, setRequests] = useState<LeaveRequestApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusBusyId, setStatusBusyId] = useState<number | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const isAdmin = hasRole('admin');

  const visibleRequests = useMemo(() => {
    if (isAdmin || !user) {
      return requests;
    }

    return requests.filter((request) => request.user_id === user.id);
  }, [isAdmin, requests, user]);

  const pendingCount = useMemo(() => visibleRequests.filter((request) => request.status === 'Pending').length, [visibleRequests]);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getLeaveOverview();
      setBalances(data.balances || []);
      setCurrentBalance(data.current_user_balance || null);
      setRequests(data.requests || []);
    } catch (loadError) {
      console.error('Failed to load leave data:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load leave data.');
      setBalances([]);
      setCurrentBalance(null);
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await api.createLeaveRequest({
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        is_backdated: formData.is_backdated,
      });

      setSuccess('Leave request submitted successfully.');
      setFormData(DEFAULT_FORM);
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit leave request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: 'Approved' | 'Rejected') => {
    setStatusBusyId(id);
    setError('');
    setSuccess('');

    try {
      await api.updateLeaveRequestStatus(id, {
        status,
        remarks: status === 'Approved' ? 'Approved from dashboard' : 'Rejected from dashboard',
      });

      setSuccess(`Leave request ${status.toLowerCase()} successfully.`);
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Failed to update leave request.');
    } finally {
      setStatusBusyId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <div className="md:hidden mb-4">
          <img src="/logo.png" alt="Sombhabona" className="h-10 w-auto" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Track casual and special leave requests with monthly special leave accrual.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Pending requests" value={String(pendingCount)} description="Awaiting review" />
        <StatCard title="Casual balance" value={currentBalance ? currentBalance.casual_balance.toString() : '0'} description="Current logged-in user" />
        <StatCard title="Special balance" value={currentBalance ? currentBalance.special_balance.toString() : '0'} description="Accrues 1 day each month" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Request leave</h2>
            <p className="text-sm text-gray-600">Create a new leave request for casual or special leave.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-gray-700">
                Leave type
                <select
                  value={formData.leave_type}
                  onChange={(event) => setFormData({ ...formData, leave_type: event.target.value as LeaveType })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                >
                  <option value="Casual">Casual</option>
                  <option value="Special">Special</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-700">
                Start date
                <input
                  type="date"
                  value={formData.start_date}
                  min={formData.is_backdated ? undefined : getTodayInputValue()}
                  onChange={(event) => setFormData({ ...formData, start_date: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-gray-700">
                End date
                <input
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date || (formData.is_backdated ? undefined : getTodayInputValue())}
                  onChange={(event) => setFormData({ ...formData, end_date: event.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-gray-700 sm:col-span-1">
                Reason
                <input
                  type="text"
                  value={formData.reason}
                  onChange={(event) => setFormData({ ...formData, reason: event.target.value })}
                  placeholder="Short reason for leave"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_backdated}
                onChange={(event) => setFormData({ ...formData, is_backdated: event.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-[#14856E] focus:ring-[#14856E] cursor-pointer"
              />
              <span>This is a backdated leave request</span>
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                Submit request
              </button>
              <button
                type="button"
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Special leave policy</h2>
            <p className="text-sm text-gray-600">Special leave accrues automatically at 1 day per month for each user.</p>
          </div>
          <div className="space-y-4 px-6 py-5 text-sm text-gray-700">
            <div className="rounded-xl bg-[#14856E]/5 p-4">
              <p className="font-semibold text-gray-900">Current user balance</p>
              <p className="mt-1">Casual: {currentBalance?.casual_balance ?? 0} days</p>
              <p>Special: {currentBalance?.special_balance ?? 0} days</p>
              <p className="mt-2 text-xs text-gray-500">Special leave is updated at the start of each month.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">How it works</p>
              <ul className="space-y-2 text-gray-600">
                <li>• Casual leave is managed as the standard leave bucket.</li>
                <li>• Special leave is only earned monthly at 1 day per month.</li>
                <li>• Approved special leave requests deduct from special leave balance.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Leave requests</h2>
            <p className="text-sm text-gray-600">
              {isAdmin ? 'Review pending requests and approve or reject them.' : 'View your own leave requests and status updates.'}
            </p>
          </div>
          <p className="text-sm text-gray-500">Total: {visibleRequests.length}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 px-6 py-10 text-sm text-gray-600">
            <Loader2 size={18} className="animate-spin" />
            Loading leave records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Dates</th>
                  <th className="px-6 py-3">Days</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {visibleRequests.map((request) => (
                  <tr key={request.id} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{request.full_name}</p>
                      <p className="text-xs text-gray-500">@{request.username}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${request.leave_type === 'Special' ? 'bg-purple-100 text-purple-700' : 'bg-[#14856E]/10 text-[#14856E]'}`}>
                        {request.leave_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <p>{formatDate(request.start_date)}</p>
                      <p className="text-xs text-gray-500">to {formatDate(request.end_date)}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{request.days_requested}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${request.status === 'Approved' ? 'bg-green-100 text-green-700' : request.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <p className="max-w-xs whitespace-pre-wrap">{request.reason}</p>
                      {request.remarks && <p className="mt-1 text-xs text-gray-500">Remarks: {request.remarks}</p>}
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && request.status === 'Pending' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={statusBusyId === request.id}
                            onClick={() => handleStatusUpdate(request.id, 'Approved')}
                            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <CheckCircle2 size={14} />
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={statusBusyId === request.id}
                            onClick={() => handleStatusUpdate(request.id, 'Rejected')}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          <p>Reviewed by: {request.reviewed_by_name || 'N/A'}</p>
                          <p>{request.reviewed_at ? `Reviewed at ${formatDisplayDate(request.reviewed_at)}` : ''}</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      {isAdmin ? 'No leave requests found.' : 'No leave requests found for your account.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Leave balances</h2>
            <p className="text-sm text-gray-600">Per-user leave status, including special leave accrual.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-6 py-3">Employee</th>
                  <th className="px-6 py-3">Casual balance</th>
                  <th className="px-6 py-3">Special balance</th>
                  <th className="px-6 py-3">Special accrual month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {balances.map((balance) => (
                  <tr key={balance.user_id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{balance.full_name}</p>
                      <p className="text-xs text-gray-500">@{balance.username}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-700">{balance.casual_balance}</td>
                    <td className="px-6 py-4 text-gray-700">{balance.special_balance}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDisplayDate(balance.special_last_accrued_at) || 'Not allocated yet'}
                    </td>
                  </tr>
                ))}
                {balances.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No leave balances found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  );
}