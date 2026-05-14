import { useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, X } from 'lucide-react';
import logo from '../../../logo.png';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const DEFAULT_FORM = {
  full_name: '',
  email: '',
  phone: '',
  father_name: '',
  mother_name: '',
  guardian_name: '',
  emergency_contact: '',
  date_of_birth: '',
  gender: 'Male',
  current_address: '',
  permanent_address: '',
  training_institute: '',
  training_institute_custom: '',
  course: '',
  course_custom: '',
  admission_date: '',
  referral_source: '',
  referral_source_custom: '',
  profile_image: '',
  remarks: '',
};

export function PublicICTAdmission() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setForm((current) => ({ ...current, profile_image: dataUrl }));
    } catch (err) {
      setError((err as Error).message || 'Failed to load image');
    }
  };

  const referralSourceOptions = [
    'Facebook',
    'Other Online',
    'Friends',
    'Student of Sombhbona',
    'Other',
    'Custom write option',
  ];

  const trainingInstituteOptions = [
    'Sombhabona Innovation Hub',
    'Sombhabona Learning And Innovation Hub',
    'Custom write option',
  ];

  const courseOptions = [
    '45 Days Income Challenge',
    'Digital Marketing For Freelancing',
    'Graphic Design For Freelancing',
    'IT Support',
    'Basic Computer Operation',
    'Spoken English',
    'Custom write option',
  ];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/ict/admissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to submit admission form');
      }

      setSuccess('Admission form submitted successfully');
      setForm(DEFAULT_FORM);
    } catch (err) {
      setError((err as Error).message || 'Failed to submit admission form');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5fbf9] via-white to-[#eef8f5] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#14856E]/10 px-4 py-2 text-sm font-semibold text-[#14856E]">
            <FileText size={16} />
            Sombhabona Learning And Innovation Hub
          </div>
          <h1 className="mt-4 text-3xl font-black text-gray-900 md:text-5xl">Admission Form</h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 md:text-base">
            Please fill up this from with correct information. We will use your information for further process.
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl">
          <div className="grid gap-0 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6 p-6 md:p-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Applicant Details</h2>
                <p className="text-sm text-gray-600">Fill up mandatory field (*)</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Full Name *
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Email *
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Date of Birth
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Gender
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Guardian Name
                  <input
                    type="text"
                    value={form.guardian_name}
                    onChange={(e) => setForm({ ...form, guardian_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Father's Name
                  <input
                    type="text"
                    value={form.father_name}
                    onChange={(e) => setForm({ ...form, father_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Mother's Name
                  <input
                    type="text"
                    value={form.mother_name}
                    onChange={(e) => setForm({ ...form, mother_name: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Emergency Contact
                  <input
                    type="tel"
                    value={form.emergency_contact}
                    onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Referral Source
                  <select
                    value={form.referral_source}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        referral_source: e.target.value,
                        referral_source_custom: e.target.value === 'Custom write option' ? form.referral_source_custom : '',
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="">Select referral source</option>
                    {referralSourceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {form.referral_source === 'Custom write option' && (
                    <input
                      type="text"
                      value={form.referral_source_custom}
                      onChange={(e) => setForm({ ...form, referral_source_custom: e.target.value })}
                      placeholder="Write referral source"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    />
                  )}
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                Current Address
                <textarea
                  value={form.current_address}
                  onChange={(e) => setForm({ ...form, current_address: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                Permanent Address
                <textarea
                  value={form.permanent_address}
                  onChange={(e) => setForm({ ...form, permanent_address: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Training Institute
                  <select
                    value={form.training_institute}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        training_institute: e.target.value,
                        training_institute_custom: e.target.value === 'Custom write option' ? form.training_institute_custom : '',
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="">Select training institute</option>
                    {trainingInstituteOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {form.training_institute === 'Custom write option' && (
                    <input
                      type="text"
                      value={form.training_institute_custom}
                      onChange={(e) => setForm({ ...form, training_institute_custom: e.target.value })}
                      placeholder="Write training institute"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    />
                  )}
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Course
                  <select
                    value={form.course}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        course: e.target.value,
                        course_custom: e.target.value === 'Custom write option' ? form.course_custom : '',
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="">Select course</option>
                    {courseOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {form.course === 'Custom write option' && (
                    <input
                      type="text"
                      value={form.course_custom}
                      onChange={(e) => setForm({ ...form, course_custom: e.target.value })}
                      placeholder="Write course"
                      className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    />
                  )}
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Admission Date
                  <input
                    type="date"
                    value={form.admission_date}
                    onChange={(e) => setForm({ ...form, admission_date: e.target.value })}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E]"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium text-gray-700">
                Remarks
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-[#14856E] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                Submit Admission
              </button>
            </div>

            <div className="border-t border-gray-100 bg-gradient-to-b from-[#f8fbfa] to-white p-6 lg:border-t-0 lg:border-l lg:p-8">
              <div className="rounded-[1.75rem] border border-dashed border-[#14856E]/20 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#14856E]">
                  <Upload size={16} />
                  Photo Preview
                </div>
                {form.profile_image ? (
                  <img
                    src={form.profile_image}
                    alt="Admission preview"
                    className="h-72 w-full rounded-[1.5rem] object-cover"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-500">
                    No photo selected yet.
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[1.75rem] bg-[#14856E] p-5 text-white shadow-lg shadow-[#14856E]/15">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 p-2 shadow-sm">
                    <img src={logo} alt="Sombhabona logo" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Address:</p>
                    <h3 className="mt-1 text-2xl font-black">756 West Sewrapara, Mirpur, Dhaka</h3>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-white/85">
                  <p><span className="font-semibold text-white">Phone:</span> 01835350647</p>
                  <p><span className="font-semibold text-white">Email:</span> info@sombhabona.com</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
