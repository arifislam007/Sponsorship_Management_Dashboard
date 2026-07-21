import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api, StudentApi, DonorApi, SponsorshipApi } from '../services/api';

type SponsorshipFormPayload =
  | {
      student_id: number;
      donor_id: number;
      start_date: string;
      amount: number;
      status?: string;
      period?: string;
      payment_media?: string;
    }
  | {
      status: 'Active' | 'Ended';
      end_date?: string;
      amount?: number;
    };

interface AddSponsorshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: SponsorshipFormPayload) => Promise<void>;
  mode?: 'create' | 'edit';
  initialData?: SponsorshipApi | null;
  initialStudentId?: number | null;
}

const defaultFormState = {
  student_id: '',
  donor_id: '',
  start_date: new Date().toISOString().split('T')[0],
  amount: 0,
  status: 'Active' as 'Active' | 'Ended',
  end_date: '',
  period: 'continuous',
  payment_media: 'bank_transfer',
};

function calculateEndDate(startDate: string, period: string): string {
  if (period === 'continuous') return '';

  const monthsMap = { '3': 3, '6': 6, '9': 9, '12': 12 };
  const months = monthsMap[period as keyof typeof monthsMap];

  if (!months) return '';

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);

  return date.toISOString().split('T')[0];
}

export function AddSponsorshipModal({ isOpen, onClose, onSubmit, mode = 'create', initialData, initialStudentId }: AddSponsorshipModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [students, setStudents] = useState<StudentApi[]>([]);
  const [donors, setDonors] = useState<DonorApi[]>([]);
  const [formData, setFormData] = useState(defaultFormState);

  useEffect(() => {
    if (isOpen) {
      Promise.all([
        api.getStudents('unsponsored').catch(() => []),
        api.getDonors().catch(() => []),
      ]).then(([studentList, donorList]) => {
        setStudents(studentList);
        const donorData = Array.isArray(donorList) ? donorList : donorList.data || [];
        setDonors(donorData);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setSubmitError('');

    if (mode === 'edit' && initialData) {
      setFormData({
        student_id: String(initialData.student_id),
        donor_id: String(initialData.donor_id),
        start_date: initialData.start_date ? initialData.start_date.slice(0, 10) : '',
        amount: Number(initialData.amount),
        status: initialData.status === 'ended' ? 'Ended' : 'Active',
        end_date: initialData.end_date ? initialData.end_date.slice(0, 10) : '',
        period: initialData.period || 'continuous',
        payment_media: initialData.payment_media || 'bank_transfer',
      });
      return;
    }

    setFormData({
      ...defaultFormState,
      student_id: initialStudentId ? String(initialStudentId) : '',
    });
  }, [isOpen, mode, initialStudentId]);

  if (!isOpen) return null;

  const handlePeriodChange = (newPeriod: string) => {
    setFormData({
      ...formData,
      period: newPeriod,
      end_date: calculateEndDate(formData.start_date, newPeriod),
    });
  };

  const handleStartDateChange = (newDate: string) => {
    setFormData({
      ...formData,
      start_date: newDate,
      end_date: calculateEndDate(newDate, formData.period),
    });
  };

  const handleSubmit = async () => {
    setSubmitError('');

    if (mode === 'edit') {
      if (!formData.status) {
        setSubmitError('Status is required.');
        return;
      }
      setIsSubmitting(true);
      try {
        await onSubmit({
          status: formData.status,
          end_date: formData.end_date || undefined,
          amount: formData.amount > 0 ? formData.amount : undefined,
        });
        onClose();
        setFormData(defaultFormState);
      } catch (err) {
        setSubmitError((err as Error).message || 'Failed to update sponsorship. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!formData.student_id || !formData.donor_id || !formData.start_date || formData.amount <= 0) {
      setSubmitError('Student, Donor, Start Date and a valid Amount are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        student_id: Number(formData.student_id),
        donor_id: Number(formData.donor_id),
        start_date: formData.start_date,
        amount: formData.amount,
        status: 'Active',
        period: formData.period,
        payment_media: formData.payment_media,
      });
      onClose();
      setFormData(defaultFormState);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to create sponsorship. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {mode === 'edit' ? 'Edit Sponsorship' : 'New Sponsorship'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {mode === 'edit' ? 'Update the current sponsorship record' : 'Link a donor to a student'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === 'edit' ? (
            <>
              <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 space-y-1">
                <p><span className="font-semibold">Student:</span> {initialData?.student_name || '-'}</p>
                <p><span className="font-semibold">Donor:</span> {initialData?.donor_name || '-'}</p>
                <p><span className="font-semibold">Monthly amount:</span> ৳{Number(initialData?.amount || 0).toLocaleString()}</p>
                <p><span className="font-semibold">Start date:</span> {initialData?.start_date || '-'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Ended' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="Active">Active</option>
                  <option value="Ended">Ended</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Amount (BDT)</label>
                <input
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  min="1"
                  placeholder="Enter monthly amount"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} (Class {student.class})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Donor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.donor_id}
                  onChange={(e) => setFormData({ ...formData, donor_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="">Choose a donor...</option>
                  {donors.map((donor) => (
                    <option key={donor.id} value={donor.id}>
                      {donor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sponsorship Period <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="3">3 Months</option>
                  <option value="6">6 Months</option>
                  <option value="9">9 Months</option>
                  <option value="12">12 Months</option>
                  <option value="continuous">Continues (Open-ended)</option>
                </select>
              </div>

              {formData.end_date && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                  <p><span className="font-semibold">Estimated end date:</span> {new Date(formData.end_date).toLocaleDateString()}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Amount (BDT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.payment_media}
                  onChange={(e) => setFormData({ ...formData, payment_media: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="mobile_banking">Mobile Banking</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200">
          {submitError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 p-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Sponsorship'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
