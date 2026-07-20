export type SponsorshipFilter = 'all' | 'sponsored' | 'unsponsored';

export interface DashboardSummary {
  total_students: number;
  sponsored_students?: number;
  total_donors: number;
  monthly_revenue: number;
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

  updateSponsorship: (id: number, payload: { status: string; end_date?: string }) =>
    request<SponsorshipApi>(`/sponsorships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getDonorSponsoredStudents: (donorId: number) =>
    request<StudentApi[]>(`/donors/${donorId}/sponsored-students`),

  getLedgerEntries: () => request<LedgerEntry[]>('/ledger/entries'),

  getLedgerSummary: () => request<LedgerSummary>('/ledger/summary'),

  addLedgerEntry: (payload: CreateLedgerEntryPayload) =>
    request<LedgerEntry>('/ledger/entries', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

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
