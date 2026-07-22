export type SponsorshipFilter = 'all' | 'sponsored' | 'unsponsored';

export interface DashboardSummary {
  total_students: number;
  sponsored_students?: number;
  total_donors: number;
  monthly_revenue: number;
}

export interface DashboardAnalytics {
  active_sponsorships: number;
  active_monthly_total: number;
  total_contributions_ever: number;
  new_this_month: number;
  new_last_month: number;
  growth_pct: number;
  top_donors: { name: string; total_contributed: number; active_count: number }[];
  recent_sponsorships: { id: number; student_name: string; donor_name: string; amount: number; start_date: string; status: string }[];
  monthly_new: { month: string; month_key: string; new_count: number; new_amount: number }[];
}

export interface DonationTrendPoint {
  month: string;
  month_key: string;
  amount: number;
}

export interface StudentApi {
  id: number;
  name: string;
  class: string;
  age: number;
  date_of_birth?: string;
  father_name?: string;
  mother_name?: string;
  family_income?: number;
  phone?: string;
  bio?: string;
  photo_url?: string;
  is_sponsored: boolean;
  sponsors?: Array<{ donor_id: number; donor_name: string }>;
}

export interface CreateStudentPayload {
  name: string;
  class: string;
  age: number;
  date_of_birth?: string;
  father_name?: string;
  mother_name?: string;
  family_income?: number;
  phone?: string;
  bio?: string;
  photo_url?: string;
  is_sponsored?: boolean;
}

export type UpdateStudentPayload = CreateStudentPayload;

export interface DonorApi {
  id: number;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  total_contributed: number;
  sponsored_students: number;
}

export interface SponsorshipApi {
  id: number;
  student_id: number;
  student_name: string;
  donor_id: number;
  donor_name: string;
  amount: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'ended';
  period?: string;
  payment_media?: string;
  reference_number?: string;
}

export interface LedgerEntry {
  id: number;
  date: string;
  voucher_ref: string;
  particulars: string;
  category: string;
  type: 'Credit' | 'Debit';
  amount: number;
  closing_balance: number;
}

export interface LedgerSummary {
  opening_balance: number;
  total_credit: number;
  total_debit: number;
  closing_balance: number;
}

export interface CreateLedgerEntryPayload {
  date: string;
  voucher_ref: string;
  particulars: string;
  category: string;
  type: 'Credit' | 'Debit';
  amount: number;
}

export interface DonorStatementPayload {
  donor_id?: number;
  month: number;
  year: number;
  format: 'csv' | 'pdf';
}

export type LeaveType = 'Casual' | 'Special';

export interface LeaveBalanceApi {
  user_id: number;
  username: string;
  full_name: string;
  casual_balance: number;
  special_balance: number;
  special_last_accrued_at?: string | null;
}

export interface LeaveRequestApi {
  id: number;
  user_id: number;
  username: string;
  full_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string;
  status: string;
  reviewed_by?: number | null;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  remarks?: string | null;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const { headers: initHeaders, ...requestInit } = init ?? {};

  const response = await fetch(`${API_BASE}${path}`, {
    ...requestInit,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(initHeaders ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboardSummary: () => request<DashboardSummary>('/dashboard/summary'),
  getDonationTrend: () => request<DonationTrendPoint[]>('/dashboard/donation-trend'),
  getDashboardAnalytics: () => request<DashboardAnalytics>('/dashboard/analytics'),

  getStudents: (filter: SponsorshipFilter) =>
    request<StudentApi[]>(`/students?sponsored=${filter}`),

  createStudent: (payload: CreateStudentPayload) =>
    request<StudentApi>('/students', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateStudent: (id: number, payload: UpdateStudentPayload) =>
    request<StudentApi>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getDonors: (limit?: number, offset?: number, search?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    return request<any>(`/donors?${params.toString()}`);
  },

  createDonor: (payload: { name: string; email: string; phone?: string; country?: string }) =>
    request<DonorApi>('/donors', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateDonor: (id: number, payload: { name: string; email: string; phone?: string; country?: string }) =>
    request<DonorApi>(`/donors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getSponsorships: (limit?: number, offset?: number, search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return request<any>(`/sponsorships?${params.toString()}`);
  },

  createSponsorship: (payload: { student_id: number; donor_id: number; start_date: string; amount: number; status?: string; period?: string; payment_media?: string }) =>
    request<SponsorshipApi>('/sponsorships', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSponsorship: (id: number, payload: { status: string; end_date?: string; amount?: number }) =>
    request<SponsorshipApi>(`/sponsorships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSponsorship: (id: number) =>
    request<{ message: string }>(`/sponsorships/${id}`, { method: 'DELETE' }),

  getDonorSponsoredStudents: (donorId: number) =>
    request<StudentApi[]>(`/donors/${donorId}/sponsored-students`),

  getLedgerEntries: () => request<LedgerEntry[]>('/ledger/entries'),

  getLedgerSummary: () => request<LedgerSummary>('/ledger/summary'),

  addLedgerEntry: (payload: CreateLedgerEntryPayload) =>
    request<LedgerEntry>('/ledger/entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getLeaveOverview: () =>
    request<{ current_user_balance: LeaveBalanceApi; balances: LeaveBalanceApi[]; requests: LeaveRequestApi[] }>('/leaves/overview'),

  createLeaveRequest: (payload: { leave_type: LeaveType; start_date: string; end_date: string; reason: string; is_backdated?: boolean }) =>
    request<{ request: LeaveRequestApi }>('/leaves/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateLeaveRequestStatus: (id: number, payload: { status: 'Approved' | 'Rejected'; remarks?: string }) =>
    request<{ request: LeaveRequestApi }>(`/leaves/requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getLetters: (filters?: { template_name?: string; donor_id?: number; student_id?: number }) => {
    const params = new URLSearchParams();
    if (filters?.template_name) params.append('template_name', filters.template_name);
    if (filters?.donor_id) params.append('donor_id', filters.donor_id.toString());
    if (filters?.student_id) params.append('student_id', filters.student_id.toString());
    return request<any>(`/letters?${params.toString()}`);
  },

  saveLetter: (payload: { student_id?: number | null; donor_id?: number | null; template_name?: string | null; subject?: string | null; content: string; is_public?: boolean; donor_name?: string; pdf_base64?: string }) =>
    request<any>('/letters', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  async downloadLetterPDF(id: number): Promise<Blob> {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const response = await fetch(`${API_BASE}/letters/${id}/pdf`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to download PDF');
    }
    return response.blob();
  },

  async exportDonorStatement(payload: DonorStatementPayload): Promise<Blob> {
    const response = await fetch(`${API_BASE}/exports/donor-statement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Statement export failed');
    }

    return response.blob();
  },
};
