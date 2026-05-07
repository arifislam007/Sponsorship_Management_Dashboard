import { useEffect, useState } from 'react';
import { Search, Plus, Link2, User, Heart, X } from 'lucide-react';
import { api, SponsorshipApi } from '../services/api';
import { AddSponsorshipModal } from './AddSponsorshipModal';

export function Sponsorships() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sponsorships, setSponsorships] = useState<SponsorshipApi[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSponsorship, setSelectedSponsorship] = useState<SponsorshipApi | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState<SponsorshipApi | null>(null);

  const loadSponsorships = async () => {
    try {
      const response = await api.getSponsorships(50, 0, searchTerm || undefined, statusFilter === 'all' ? undefined : statusFilter);
      // Handle paginated response
      const sponsorshipData = Array.isArray(response) ? response : response.data || [];
      setSponsorships(sponsorshipData);
    } catch (error) {
      console.error('Failed to load sponsorships:', error);
      setSponsorships([]);
    }
  };

  const handleSaveSponsorship = async (payload: {
    student_id?: number;
    donor_id?: number;
    start_date?: string;
    amount?: number;
    status?: string;
    end_date?: string;
  }) => {
    if (editingSponsorship) {
      await api.updateSponsorship(editingSponsorship.id, {
        status: payload.status || 'Active',
        end_date: payload.end_date,
      });
    } else {
      await api.createSponsorship({
        student_id: Number(payload.student_id),
        donor_id: Number(payload.donor_id),
        start_date: payload.start_date || new Date().toISOString().split('T')[0],
        amount: Number(payload.amount || 0),
        status: payload.status,
      });
    }

    await loadSponsorships();
    setIsModalOpen(false);
    setEditingSponsorship(null);
  };

  useEffect(() => {
    loadSponsorships();
  }, [searchTerm, statusFilter]);

  const filteredSponsorships = sponsorships.filter((sponsorship) => {
    const matchesSearch =
      sponsorship.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sponsorship.donor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sponsorship.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalActive = sponsorships.filter((s) => s.status === 'active').length;
  const totalEnded = sponsorships.filter((s) => s.status === 'ended').length;
  const monthlyRevenue = sponsorships
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Sponsorships</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage student-donor sponsorship relationships</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Sponsorships</p>
              <p className="text-2xl font-bold text-[#14856E] mt-1">{totalActive}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Link2 className="text-[#14856E]" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ended Sponsorships</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{totalEnded}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-lg">
              <User className="text-amber-600" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">৳{monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Heart className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by student or donor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
          </select>
          <button 
            onClick={() => {
              setEditingSponsorship(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors">
            <Plus size={18} />
            New Sponsorship
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSponsorships.map((sponsorship) => (
                <tr key={sponsorship.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      <span className="font-medium text-gray-900">{sponsorship.student_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Heart size={16} className="text-gray-400" />
                      <span className="text-gray-700">{sponsorship.donor_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900">
                    ৳{Number(sponsorship.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {sponsorship.start_date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        sponsorship.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {sponsorship.status.charAt(0).toUpperCase() + sponsorship.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedSponsorship(sponsorship);
                        setIsDetailsOpen(true);
                      }}
                      className="text-[#14856E] hover:text-[#0f6b5a] font-medium mr-4"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        setEditingSponsorship(sponsorship);
                        setIsModalOpen(true);
                      }}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSponsorships.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">No sponsorships found matching your criteria.</p>
          </div>
        )}
      </div>

      <AddSponsorshipModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSponsorship(null);
        }}
        onSubmit={handleSaveSponsorship}
        mode={editingSponsorship ? 'edit' : 'create'}
        initialData={editingSponsorship}
      />

      {isDetailsOpen && selectedSponsorship && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Sponsorship details</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{selectedSponsorship.student_name}</h3>
              </div>
              <button onClick={() => setIsDetailsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              <p><span className="font-semibold">Donor:</span> {selectedSponsorship.donor_name}</p>
              <p><span className="font-semibold">Amount:</span> ৳{Number(selectedSponsorship.amount).toLocaleString()}</p>
              <p><span className="font-semibold">Start date:</span> {selectedSponsorship.start_date}</p>
              <p><span className="font-semibold">Status:</span> {selectedSponsorship.status.charAt(0).toUpperCase() + selectedSponsorship.status.slice(1)}</p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setEditingSponsorship(selectedSponsorship);
                    setIsDetailsOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
