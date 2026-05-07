import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DonorApi } from '../services/api';

interface AddDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; email: string; phone?: string; country?: string }) => Promise<void>;
  initialData?: DonorApi | null;
  mode?: 'create' | 'edit';
}

const defaultFormState = {
  name: '',
  email: '',
  phone: '',
  country: '',
};

export function AddDonorModal({ isOpen, onClose, onSubmit, initialData, mode = 'create' }: AddDonorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(defaultFormState);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        phone: initialData.phone || '',
        country: initialData.country || '',
      });
      return;
    }

    setFormData(defaultFormState);
  }, [initialData, isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
      });

      onClose();
      setFormData(defaultFormState);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Donor</h2>
            <p className="text-sm text-gray-600 mt-1">Register a new donor/supporter</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter donor's full name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+880 1712-345678"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              placeholder="Enter country name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
            {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Add Donor'}
          </button>
        </div>
      </div>
    </div>
  );
}
