import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Heart, Share2, Copy, Check, ArrowLeft, Mail } from 'lucide-react';
import { api, StudentApi } from '../services/api';
import { ImageWithFallback } from './ImageWithFallback';
import { AddDonorModal } from './AddDonorModal';

export function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState<StudentApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showDonorModal, setShowDonorModal] = useState(false);
  const [isSubmittingDonor, setIsSubmittingDonor] = useState(false);

  useEffect(() => {
    if (!id) {
      setError('Student ID not found');
      setLoading(false);
      return;
    }

    api
      .getStudents('all')
      .then((students) => {
        const foundStudent = students.find((s) => s.id === parseInt(id));
        if (foundStudent) {
          setStudent(foundStudent);
        } else {
          setError('Student not found');
        }
      })
      .catch((err) => {
        console.error('Failed to load student:', err);
        setError('Failed to load student profile');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/student/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareEmail = () => {
    const url = `${window.location.origin}/student/${id}`;
    const subject = `Support ${student?.name} - Student Sponsorship`;
    const body = `Check out ${student?.name}'s profile and consider sponsoring their education:\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDonorSubmit = async (payload: { name: string; email: string; phone?: string; country?: string }) => {
    setIsSubmittingDonor(true);
    try {
      await api.createDonor(payload);
      setShowDonorModal(false);
    } catch (err) {
      console.error('Failed to create donor:', err);
      throw err;
    } finally {
      setIsSubmittingDonor(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f5fbf9] via-white to-[#eef8f5] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#14856E] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading student profile...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f5fbf9] via-white to-[#eef8f5] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 mb-4">⚠️ {error || 'Student not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-6 py-3 text-white font-semibold hover:bg-[#0f6b5a] transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5fbf9] via-white to-[#eef8f5] pt-6">
      <div className="max-w-3xl mx-auto px-4 pb-16">
        {/* Header with back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-[#14856E] font-semibold hover:underline"
          >
            <ArrowLeft size={18} />
            Back to Students
          </button>
          <div className="relative">
            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#14856E] text-[#14856E] px-4 py-2 font-semibold hover:bg-[#14856E]/5 transition-colors"
            >
              <Share2 size={18} />
              Share
            </button>

            {showShareMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-100 overflow-hidden z-10">
                <button
                  onClick={handleCopyLink}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-green-600" />
                      <span className="text-green-600 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} className="text-gray-600" />
                      <span className="text-gray-900">Copy Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleShareEmail}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3"
                >
                  <Mail size={18} className="text-gray-600" />
                  <span className="text-gray-900">Share via Email</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="rounded-3xl bg-white shadow-xl border border-gray-100 overflow-hidden">
          {/* Photo Section */}
          <div className="h-96 bg-gradient-to-br from-[#14856E] to-[#0f6b5a] relative overflow-hidden">
            {student.photo_url ? (
              <ImageWithFallback src={student.photo_url} alt={student.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-white/30">
                <div className="text-center">
                  <div className="text-8xl font-bold mb-4">{student.name.charAt(0)}</div>
                  <p className="text-lg">Student Profile Photo</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="p-8">
            {/* Name and Status */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-black text-gray-900">{student.name}</h1>
                <div className="mt-3 flex items-center gap-4">
                  <span className="text-lg text-gray-600">
                    Class {student.class} · Age {student.age}
                  </span>
                  <span
                    className={`rounded-full px-4 py-1 text-sm font-semibold ${
                      student.is_sponsored ? 'bg-[#14856E]/10 text-[#14856E]' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {student.is_sponsored ? (
                      <span className="flex items-center gap-2">
                        <Heart size={16} fill="currentColor" />
                        Sponsored
                      </span>
                    ) : (
                      'Awaiting Sponsorship'
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
                {student.bio || 'No additional information provided for this student.'}
              </p>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-200">
              {student.email && (
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Email</p>
                  <p className="text-gray-900 mt-1">{student.email}</p>
                </div>
              )}
              {student.phone && (
                <div>
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Phone</p>
                  <p className="text-gray-900 mt-1">{student.phone}</p>
                </div>
              )}
              {student.address && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600 font-semibold uppercase tracking-wide">Address</p>
                  <p className="text-gray-900 mt-1">{student.address}</p>
                </div>
              )}
            </div>

            {/* CTA Section */}
            {!student.is_sponsored && (
              <div className="mt-8 p-6 bg-gradient-to-r from-[#14856E]/5 to-[#0f6b5a]/5 rounded-2xl border border-[#14856E]/10">
                <p className="text-gray-900 font-semibold mb-2">
                  {student.name} is waiting for a sponsor!
                </p>
                <p className="text-gray-600 mb-4">
                  Help provide education and support to this student. Become their sponsor today.
                </p>
                <button
                  onClick={() => setShowDonorModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-6 py-2 text-white font-semibold hover:bg-[#0f6b5a] transition-colors"
                >
                  Sponsor Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Add Donor Modal */}
        {showDonorModal && (
          <AddDonorModal 
            isOpen={showDonorModal} 
            onClose={() => setShowDonorModal(false)} 
            onSubmit={handleDonorSubmit}
          />
        )}
      </div>
    </div>
  );
}
