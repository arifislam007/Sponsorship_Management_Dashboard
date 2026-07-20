import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { CreateStudentPayload, StudentApi } from '../services/api';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStudentPayload) => Promise<void>;
  initialData?: StudentApi | null;
  mode?: 'create' | 'edit';
}

const defaultFormState = {
  name: '',
  class: '',
  age: '',
  dateOfBirth: '',
  fatherName: '',
  motherName: '',
  familyIncome: '',
  phone: '',
  photo: null as File | null,
  photoUrl: '',
  story: '',
  isSponsored: false,
};

function calculateAgeFromDOB(dateOfBirth: string): string {
  if (!dateOfBirth) return '';
  
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age.toString();
}

async function fileToDataUrl(file: File | null): Promise<string | undefined> {
  if (!file) {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export function AddStudentModal({ isOpen, onClose, onSubmit, initialData, mode = 'create' }: AddStudentModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [formData, setFormData] = useState(defaultFormState);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialData) {
      setFormData({
        ...defaultFormState,
        name: initialData.name,
        class: initialData.class,
        age: String(initialData.age),
        dateOfBirth: initialData.date_of_birth ? initialData.date_of_birth.slice(0, 10) : '',
        fatherName: initialData.father_name || '',
        motherName: initialData.mother_name || '',
        familyIncome: initialData.family_income ? String(initialData.family_income) : '',
        phone: initialData.phone || '',
        story: initialData.bio || '',
        photoUrl: initialData.photo_url || '',
        isSponsored: initialData.is_sponsored ?? false,
      });
      setStep(1);
      setSubmitError('');
      return;
    }

    setStep(1);
    setSubmitError('');
    setFormData(defaultFormState);
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.class || !formData.age) {
      setSubmitError('Please fill in Name, Class, and Age before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const photoUrl = (await fileToDataUrl(formData.photo)) || formData.photoUrl || undefined;

      await onSubmit({
        name: formData.name,
        class: formData.class,
        age: Number(formData.age),
        date_of_birth: formData.dateOfBirth || undefined,
        father_name: formData.fatherName || undefined,
        mother_name: formData.motherName || undefined,
        family_income: formData.familyIncome ? Number(formData.familyIncome) : undefined,
        phone: formData.phone || undefined,
        bio: formData.story,
        photo_url: photoUrl,
        is_sponsored: formData.isSponsored,
      });

      onClose();
      setStep(1);
      setFormData(defaultFormState);
    } catch (err) {
      setSubmitError((err as Error).message || 'Failed to save student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{mode === 'edit' ? 'Edit Student' : 'Add New Student'}</h2>
            <p className="text-sm text-gray-600 mt-1">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex items-center justify-center px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-[#14856E] text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#14856E]' : 'bg-gray-200'}`}></div>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-[#14856E] text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-[#14856E]' : 'bg-gray-200'}`}></div>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step >= 3 ? 'bg-[#14856E] text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              3
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student's full name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.class}
                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    placeholder="Class"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="Age"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => {
                    const dob = e.target.value;
                    const calculatedAge = calculateAgeFromDOB(dob);
                    setFormData({ 
                      ...formData, 
                      dateOfBirth: dob,
                      age: calculatedAge
                    });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Background</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Father's Name
                </label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  placeholder="Enter father's name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mother's Name
                </label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                  placeholder="Enter mother's name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Family Monthly Income (BDT)
                </label>
                <input
                  type="number"
                  value={formData.familyIncome}
                  onChange={(e) => setFormData({ ...formData, familyIncome: e.target.value })}
                  placeholder="Enter monthly income"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Photo & Story</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Photo
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#14856E] transition-colors cursor-pointer"
                >
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({ ...formData, photo: e.target.files?.[0] || null, photoUrl: '' })
                    }
                    className="hidden"
                  />
                </div>
                {formData.photo && (
                  <p className="text-sm text-green-600 mt-2">✓ {formData.photo.name}</p>
                )}
                {!formData.photo && formData.photoUrl && (
                  <p className="text-sm text-green-600 mt-2">Existing photo loaded</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About the Child
                </label>
                <textarea
                  value={formData.story}
                  onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                  placeholder="Share the child's story, dreams, and aspirations..."
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A compelling story helps donors connect with the child
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200">
          {submitError && (
            <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {submitError}
            </div>
          )}
          <div className="flex items-center justify-between p-6">
            <button
              onClick={handlePrevious}
              disabled={step === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                step === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={20} />
              Previous
            </button>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors"
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? (mode === 'edit' ? 'Saving...' : 'Adding...')
                    : (mode === 'edit' ? 'Save Changes' : 'Add Student')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
