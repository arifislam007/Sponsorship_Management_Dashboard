import { useEffect, useState } from 'react';
import { Search, Plus, Mail, Phone, MapPin, X, Users } from 'lucide-react';
import { api, DonorApi, StudentApi } from '../services/api';
import { AddDonorModal } from './AddDonorModal';

export function Donors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [donors, setDonors] = useState<DonorApi[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<DonorApi | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingDonor, setEditingDonor] = useState<DonorApi | null>(null);
  const [sponsoredStudents, setSponsoredStudents] = useState<StudentApi[]>([]);
  const [isSponsoredStudentsOpen, setIsSponsoredStudentsOpen] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const loadDonors = async () => {
    try {
      const response = await api.getDonors(50, 0, searchTerm || undefined);
      // Handle paginated response
      const donorData = Array.isArray(response) ? response : response.data || [];
      setDonors(donorData);
    } catch (error) {
      console.error('Failed to load donors:', error);
      setDonors([]);
    }
  };

  const loadSponsoredStudents = async (donorId: number) => {
    setIsLoadingStudents(true);
    try {
      const students = await api.getDonorSponsoredStudents(donorId);
      setSponsoredStudents(Array.isArray(students) ? students : []);
    } catch (error) {
      console.error('Failed to load sponsored students:', error);
      setSponsoredStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handleSaveDonor = async (payload: { name: string; email: string; phone?: string; country?: string }) => {
    if (editingDonor) {
      await api.updateDonor(editingDonor.id, payload);
    } else {
      await api.createDonor(payload);
    }

    await loadDonors();
    setIsModalOpen(false);
    setEditingDonor(null);
  };

  useEffect(() => {
    loadDonors();
  }, [searchTerm]);

  const filteredDonors = donors.filter((donor) =>
    donor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (donor.country || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDonors = donors.length;
  const totalStudentsSponsored = donors.reduce((sum, donor) => sum + donor.sponsored_students, 0);
  const totalContributions = donors.reduce((sum, donor) => sum + donor.total_contributed, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Donors</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage donor profiles and contributions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Donors</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalDonors}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Students Sponsored</p>
          <p className="text-2xl font-bold text-[#14856E] mt-1">{totalStudentsSponsored}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Contributions</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">৳{totalContributions.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => {
              setEditingDonor(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors">
            <Plus size={18} />
            Add Donor
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sponsored Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Contributed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDonors.map((donor) => (
                <tr key={donor.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{donor.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Mail size={14} />
                        {donor.email}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Phone size={14} />
                        {donor.phone || '-'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-700">
                      <MapPin size={14} />
                      {donor.country || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-[#14856E] text-white">
                      {donor.sponsored_students}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                    ৳{Number(donor.total_contributed).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedDonor(donor);
                        setIsDetailsOpen(true);
                      }}
                      className="text-[#14856E] hover:text-[#0f6b5a] font-medium"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDonors.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No donors found matching your criteria.</p>
          </div>
        )}
      </div>

      <AddDonorModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDonor(null);
        }}
        onSubmit={handleSaveDonor}
        initialData={editingDonor}
        mode={editingDonor ? 'edit' : 'create'}
      />

      {isDetailsOpen && selectedDonor && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Donor details</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedDonor.name}</h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              <p><span className="font-semibold">Email:</span> {selectedDonor.email}</p>
              <p><span className="font-semibold">Phone:</span> {selectedDonor.phone || '-'}</p>
              <p><span className="font-semibold">Country:</span> {selectedDonor.country || '-'}</p>
              <p><span className="font-semibold">Students sponsored:</span> {selectedDonor.sponsored_students}</p>
              <p><span className="font-semibold">Total contributed:</span> ৳{Number(selectedDonor.total_contributed).toLocaleString()}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditingDonor(selectedDonor);
                    setIsDetailsOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    loadSponsoredStudents(selectedDonor.id);
                    setIsSponsoredStudentsOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#14856E] text-white hover:bg-[#0f6b5a] transition-colors flex items-center gap-2"
                >
                  <Users size={16} />
                  Sponsored Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isSponsoredStudentsOpen && selectedDonor && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Sponsored Students</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedDonor.name}</h3>
              </div>
              <button onClick={() => setIsSponsoredStudentsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : sponsoredStudents.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-gray-500">No students sponsored by this donor.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sponsoredStudents.map((student) => (
                    <div key={student.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <p className="text-sm text-gray-600">Class {student.class} • Age {student.age}</p>
                          {student.bio && <p className="text-sm text-gray-700 mt-1">{student.bio.substring(0, 100)}{student.bio.length > 100 ? '...' : ''}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200 p-5">
              <button
                onClick={() => setIsSponsoredStudentsOpen(false)}
                className="w-full px-4 py-2 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
