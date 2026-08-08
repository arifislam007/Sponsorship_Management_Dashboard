import { useEffect, useState } from 'react';
import { Search, Upload, Plus, User, X, Mail } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { AddStudentModal } from './AddStudentModal';
import { AddSponsorshipModal } from './AddSponsorshipModal';
import { ShareEmailModal, buildEmailHtml } from './ShareEmailModal';
import { api, CreateStudentPayload } from '../services/api';

interface Student {
  id: number;
  name: string;
  class: string;
  age: number;
  date_of_birth?: string;
  father_name?: string;
  mother_name?: string;
  family_income?: number;
  phone?: string;
  status: 'sponsored' | 'unsponsored';
  photo?: string;
  bio?: string;
  sponsors?: Array<{ donor_id: number; donor_name: string }>;
}

export function Students() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sponsored' | 'unsponsored'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [studentPhotoDataUrl, setStudentPhotoDataUrl] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const resolvePhotoForEmail = async (photo: string): Promise<string> => {
    if (!photo) return '';
    // Already a data URL — use directly, no fetch needed
    if (photo.startsWith('data:')) return photo;
    // External HTTPS URL — usable directly in email HTML
    if (photo.startsWith('http')) return photo;
    // Relative path served by our own server — fetch and convert to base64
    try {
      const res = await fetch(`${window.location.origin}${photo}`);
      if (!res.ok) return '';
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  };

  const openShareEmail = async (student: Student) => {
    setStudentPhotoDataUrl('');
    if (student.photo) {
      const resolved = await resolvePhotoForEmail(student.photo);
      setStudentPhotoDataUrl(resolved);
    }
    setShowEmailModal(true);
  };

  const loadStudents = async () => {
    try {
      const response = await api.getStudents(statusFilter);
      setStudents(
        response.map((student) => ({
          id: student.id,
          name: student.name,
          class: student.class,
          age: student.age,
          date_of_birth: student.date_of_birth,
          father_name: student.father_name,
          mother_name: student.mother_name,
          family_income: student.family_income,
          phone: student.phone,
          status: student.is_sponsored ? 'sponsored' : 'unsponsored',
          photo: student.photo_url,
          bio: student.bio,
          sponsors: (student as any).sponsors || [],
        }))
      );
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
    }
  };

  const handleSaveStudent = async (payload: CreateStudentPayload) => {
    if (editingStudent) {
      await api.updateStudent(editingStudent.id, payload);
    } else {
      await api.createStudent(payload);
    }
    await loadStudents();
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  useEffect(() => {
    loadStudents().catch(() => setStudents([]));
  }, [statusFilter]);

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toString().includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage student profiles and sponsorships</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setEditingStudent(null);
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors w-full sm:w-auto"
            >
              <Plus size={18} />
              Add Student
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto">
              <Upload size={18} />
              Bulk Upload Excel
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
          >
            <option value="all">All Students</option>
            <option value="sponsored">Sponsored</option>
            <option value="unsponsored">Unsponsored</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow group relative">
            <div className="bg-gradient-to-br from-[#14856E] to-[#0f6b5a] h-48 flex items-center justify-center relative">
              {student.photo ? (
                <ImageWithFallback
                  src={student.photo}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={64} className="text-white opacity-50" />
              )}

            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-900 mb-2">{student.name}</h3>
              <p className="text-sm text-gray-600 mb-3">
                Class {student.class} | Age {student.age}
              </p>

              <div className="mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    student.status === 'sponsored'
                      ? 'bg-[#0f6b5a] text-white shadow-sm'
                      : 'bg-amber-100 text-orange-800'
                  }`}
                >
                  {student.status === 'sponsored' ? 'Sponsored' : 'Unsponsored'}
                </span>
              </div>
              {student.sponsors && student.sponsors.length > 0 && (
                <div className="mb-4 flex gap-2 items-center">
                  {student.sponsors.slice(0, 1).map((s) => (
                    <span key={s.donor_id} className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-[#14856E] text-white">
                      {s.donor_name}
                    </span>
                  ))}
                  {student.sponsors.length > 1 && (
                    <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">+{student.sponsors.length - 1}</span>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedStudent(student);
                    setIsDetailsOpen(true);
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Details
                </button>
                {student.status === 'unsponsored' && (
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsSponsorshipModalOpen(true);
                    }}
                    className="flex-1 px-3 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors text-sm"
                  >
                    Sponsor
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingStudent(student);
                    setIsModalOpen(true);
                  }}
                  className="flex-1 px-3 py-2 border border-[#14856E] text-[#14856E] rounded-lg hover:bg-[#14856E] hover:text-white transition-colors text-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddStudentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        onSubmit={handleSaveStudent}
        initialData={editingStudent ? {
          id: editingStudent.id,
          name: editingStudent.name,
          class: editingStudent.class,
          age: editingStudent.age,
          date_of_birth: editingStudent.date_of_birth,
          father_name: editingStudent.father_name,
          mother_name: editingStudent.mother_name,
          family_income: editingStudent.family_income,
          phone: editingStudent.phone,
          bio: editingStudent.bio,
          photo_url: editingStudent.photo,
          is_sponsored: editingStudent.status === 'sponsored',
        } : null}
        mode={editingStudent ? 'edit' : 'create'}
      />

      <AddSponsorshipModal
        isOpen={isSponsorshipModalOpen}
        onClose={() => setIsSponsorshipModalOpen(false)}
        initialStudentId={selectedStudent?.id || null}
        onSubmit={async (payload) => {
          await api.createSponsorship(payload as {
            student_id: number;
            donor_id: number;
            start_date: string;
            amount: number;
            status?: string;
          });
          await loadStudents();
        }}
      />

      {isDetailsOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Student details</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedStudent.name}</h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="grid md:grid-cols-[180px,1fr] gap-5 p-5">
              <div className="h-48 rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                {selectedStudent.photo ? (
                  <ImageWithFallback src={selectedStudent.photo} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <User size={56} className="text-gray-400" />
                )}
              </div>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Class {selectedStudent.class} · Age {selectedStudent.age}</p>
                <p className="text-sm text-gray-700">{selectedStudent.bio || 'No story has been added for this student yet.'}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditingStudent(selectedStudent);
                      setIsDetailsOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors text-sm"
                  >
                    Edit
                  </button>
                  {selectedStudent.status === 'unsponsored' && (
                    <button
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsSponsorshipModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#14856E] text-white hover:bg-[#0f6b5a] transition-colors text-sm"
                    >
                      Sponsor
                    </button>
                  )}
                  <button
                    onClick={() => openShareEmail(selectedStudent)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <Mail size={14} />Share Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {filteredStudents.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">No students found matching your criteria.</p>
        </div>
      )}

      {showEmailModal && selectedStudent && (
        <ShareEmailModal
          defaultSubject={`Student Profile – ${selectedStudent.name}`}
          getHtml={(logoDataUrl) => {
            const url = `${window.location.origin}/student/${selectedStudent.id}`;
            const isSponsored = selectedStudent.status === 'sponsored';
            const statusColor = isSponsored ? '#16a34a' : '#d97706';
            const statusBg   = isSponsored ? '#f0fdf4'  : '#fffbeb';
            const statusText = isSponsored ? 'Sponsored' : 'Needs a Sponsor';

            const photoSrc = studentPhotoDataUrl || '';
            const photoBlock = photoSrc
              ? `<img src="${photoSrc}" alt="${selectedStudent.name}" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid #14856E;display:block;margin:0 auto 16px"/>`
              : `<div style="width:120px;height:120px;border-radius:50%;background:#e5e7eb;display:block;margin:0 auto 16px;line-height:120px;text-align:center;font-size:48px;font-weight:700;color:#9ca3af">${selectedStudent.name.charAt(0)}</div>`;

            const infoItems: [string, string][] = [
              ['📚 Class',         `Class ${selectedStudent.class}`],
              ['🎂 Age',           `${selectedStudent.age} years old`],
              ['💰 Family Income', selectedStudent.family_income ? `৳${selectedStudent.family_income.toLocaleString()}` : ''],
            ].filter(([, v]) => v);

            const infoRows = infoItems.map(([label, value]) => `
              <tr>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:42%;font-weight:500">${label}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:600">${value}</td>
              </tr>`).join('');

            const sponsorsBlock = selectedStudent.sponsors?.length
              ? `<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Current Sponsors</p>
                 <p style="margin:0;font-size:14px;color:#14856E;font-weight:600">${selectedStudent.sponsors.map(s => s.donor_name).join(', ')}</p>`
              : '';

            const bioBlock = selectedStudent.bio
              ? `<div style="background:#f8fafc;border-left:3px solid #14856E;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px">
                   <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#14856E;text-transform:uppercase;letter-spacing:0.8px">Student Story</p>
                   <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${selectedStudent.bio}</p>
                 </div>`
              : '';

            const body = `
              <!-- NOTE_PLACEHOLDER -->

              <!-- Profile Card -->
              <div style="text-align:center;margin-bottom:28px">
                ${photoBlock}
                <h2 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#111827;letter-spacing:-0.5px">${selectedStudent.name}</h2>
                <span style="display:inline-block;padding:4px 14px;border-radius:999px;font-size:12px;font-weight:700;background:${statusBg};color:${statusColor};border:1px solid ${statusColor}30">
                  ${isSponsored ? '✅' : '🔶'} ${statusText}
                </span>
              </div>

              <!-- Divider -->
              <div style="border-top:1px solid #e5e7eb;margin-bottom:24px"></div>

              <!-- Info Table -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.8px">Personal Details</p>
              <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:10px;overflow:hidden;margin-bottom:24px;border:1px solid #e5e7eb">
                <tbody>${infoRows}</tbody>
              </table>

              <!-- Bio -->
              ${bioBlock}

              <!-- Sponsors -->
              ${sponsorsBlock ? `<div style="background:#f0fdf4;border-radius:10px;padding:14px 18px;margin-bottom:24px">${sponsorsBlock}</div>` : ''}

              <!-- CTA -->
              <div style="text-align:center;margin-top:8px">
                <a href="${url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#14856E,#0d6b59);color:#ffffff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 4px 12px rgba(20,133,110,0.35)">
                  View Full Profile →
                </a>
                ${!isSponsored ? `<p style="margin:14px 0 0;font-size:13px;color:#6b7280">Help change a child's future — consider sponsoring ${selectedStudent.name} today.</p>` : ''}
              </div>
            `;

            return buildEmailHtml(
              `Student Profile – ${selectedStudent.name}`,
              'Student Sponsorship Profile',
              body,
              logoDataUrl,
            );
          }}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}
