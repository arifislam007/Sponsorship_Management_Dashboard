import { useEffect, useState } from 'react';
import { Search, Upload, Plus, User, X, Star } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';
import { AddStudentModal } from './AddStudentModal';
import { AddSponsorshipModal } from './AddSponsorshipModal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Student {
  id: number;
  name: string;
  class: string;
  age: number;
  status: 'sponsored' | 'unsponsored';
  photo?: string;
  bio?: string;
  is_featured: boolean;
  sponsors?: Array<{ donor_id: number; donor_name: string }>;
}

export function Students() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sponsored' | 'unsponsored'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);

  const loadStudents = async () => {
    try {
      const response = await api.getStudents(statusFilter);
      setStudents(
        response.map((student) => ({
          id: student.id,
          name: student.name,
          class: student.class,
          age: student.age,
          status: student.is_sponsored ? 'sponsored' : 'unsponsored',
          photo: student.photo_url,
          bio: student.bio,
          is_featured: student.is_featured,
          sponsors: (student as any).sponsors || [],
        }))
      );
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudents([]);
    }
  };

  const handleSaveStudent = async (payload: {
    name: string;
    class: string;
    age: number;
    bio?: string;
    photo_url?: string;
    is_sponsored?: boolean;
    is_featured?: boolean;
  }) => {
    if (editingStudent) {
      await api.updateStudent(editingStudent.id, {
        ...payload,
        is_featured: editingStudent.is_featured,
      });
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

  const featuredCount = students.filter((student) => student.is_featured).length;

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
          <div className="rounded-lg border border-[#14856E]/20 bg-[#14856E]/5 px-4 py-2 text-sm font-semibold text-[#0f6b5a] w-full md:w-auto text-center">
            Featured students: {featuredCount}/4
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

              {student.is_featured && (
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#14856E] shadow-sm">
                  <Star size={12} className="fill-[#14856E] text-[#14856E]" />
                  Featured
                </span>
              )}

              {student.bio && (
                <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="text-center">
                    <p className="text-sm text-white mb-3">{student.bio}</p>
                    <button className="px-4 py-2 bg-white text-[#14856E] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                      Quick View
                    </button>
                  </div>
                </div>
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
                {isAdmin && (
                  <button
                    onClick={async () => {
                      try {
                        await api.toggleStudentFeatured(student.id, !student.is_featured);
                        await loadStudents();
                      } catch (error) {
                        console.error('Failed to toggle featured student:', error);
                      }
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                      student.is_featured
                        ? 'border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {student.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}
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
          bio: editingStudent.bio,
          photo_url: editingStudent.photo,
          is_sponsored: editingStudent.status === 'sponsored',
          is_featured: editingStudent.is_featured,
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
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingStudent(selectedStudent);
                      setIsDetailsOpen(false);
                      setIsModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors"
                  >
                    Edit
                  </button>
                  {selectedStudent.status === 'unsponsored' && (
                    <button
                      onClick={() => {
                        setIsDetailsOpen(false);
                        setIsSponsorshipModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#14856E] text-white hover:bg-[#0f6b5a] transition-colors"
                    >
                      Sponsor
                    </button>
                  )}
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
    </div>
  );
}
