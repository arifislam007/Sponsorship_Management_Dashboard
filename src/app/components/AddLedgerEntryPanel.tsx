import { X } from 'lucide-react';
import { useState } from 'react';
import { CreateLedgerEntryPayload } from '../services/api';

interface AddLedgerEntryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateLedgerEntryPayload) => Promise<void>;
}

const defaultLedgerForm = {
  date: '',
  voucher: '',
  particulars: '',
  category: 'Donation',
  type: 'Credit',
  amount: '',
};

export function AddLedgerEntryPanel({ isOpen, onClose, onSubmit }: AddLedgerEntryPanelProps) {
  const [formData, setFormData] = useState(defaultLedgerForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        date: formData.date,
        voucher_ref: formData.voucher,
        particulars: formData.particulars,
        category: formData.category,
        type: formData.type as 'Credit' | 'Debit',
        amount: Number(formData.amount),
      });
      setFormData(defaultLedgerForm);
      onClose();
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to add entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      ></div>
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Add Ledger Entry</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voucher/Reference <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.voucher}
              onChange={(e) => setFormData({ ...formData, voucher: e.target.value })}
              placeholder="e.g., RCV-001, PMT-001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Particulars <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.particulars}
              onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
              placeholder="Describe the transaction..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            >
              <option value="Donation">Donation</option>
              <option value="Salary">Salary</option>
              <option value="Expense">Expense</option>
              <option value="Bank">Bank</option>
              <option value="ISP">ISP</option>
              <option value="Utilities">Utilities</option>
              <option value="Rent">Rent</option>
              <option value="Supplies">School Supplies</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="Credit"
                  checked={formData.type === 'Credit'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                />
                <span className="text-sm text-gray-700">Credit (Income)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="type"
                  value="Debit"
                  checked={formData.type === 'Debit'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                />
                <span className="text-sm text-gray-700">Debit (Expense)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount (BDT) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="Enter amount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="pt-4 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Add Entry'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
