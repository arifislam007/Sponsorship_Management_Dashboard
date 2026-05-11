import { X, FileText, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface StatementGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (month: number, year: number, format: 'csv' | 'pdf', donorId?: number) => Promise<void>;
}

export function StatementGenerator({ isOpen, onClose, onGenerate }: StatementGeneratorProps) {
  const [formData, setFormData] = useState({
    reportType: 'monthly',
    month: '05',
    year: '2026',
    donorType: 'all',
    specificDonor: '',
    format: 'pdf',
  });
  const [donors, setDonors] = useState<Array<{id: number, name: string}>>([]);

  useEffect(() => {
    if (isOpen) {
      // Fetch donors from API
      api.getDonors(500, 0).then((response) => {
        const donorData = Array.isArray(response) ? response : response.data || [];
        setDonors(donorData.map((d: any) => ({ id: d.id, name: d.name })));
      }).catch(() => setDonors([]));
    }
  }, [isOpen]);

  const handleGenerate = () => {
    onGenerate(
      Number(formData.month),
      Number(formData.year),
      formData.format as 'csv' | 'pdf',
      formData.donorType === 'single' && formData.specificDonor ? Number(formData.specificDonor) : undefined,
    ).catch(() => null);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-[#14856E] p-2 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Generate Statement</h2>
              <p className="text-sm text-gray-600 mt-1">Create professional financial reports</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-[#14856E] bg-opacity-5 rounded-lg border border-[#14856E] border-opacity-20">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="w-2 h-2 bg-[#14856E] rounded-full"></div>
              </div>
              <div>
                <p className="font-semibold text-[#14856E] mb-1">Sombhabona Foundation</p>
                <p className="text-sm text-gray-700">
                  বঞ্চিত শিশুও আগামীর সম্ভাবনা
                  <br />
                  Deprived Children Are Future Leader Too
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  All generated reports will include this branding header
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors hover:border-[#14856E] has-[:checked]:border-[#14856E] has-[:checked]:bg-[#14856E] has-[:checked]:bg-opacity-5">
                  <input
                    type="radio"
                    name="reportType"
                    value="monthly"
                    checked={formData.reportType === 'monthly'}
                    onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                    className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Monthly Report</span>
                </label>
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors hover:border-[#14856E] has-[:checked]:border-[#14856E] has-[:checked]:bg-[#14856E] has-[:checked]:bg-opacity-5">
                  <input
                    type="radio"
                    name="reportType"
                    value="yearly"
                    checked={formData.reportType === 'yearly'}
                    onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                    className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Yearly Report</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.reportType === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                  >
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Donor Filter
              </label>
              <select
                value={formData.donorType}
                onChange={(e) => setFormData({ ...formData, donorType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              >
                <option value="all">All Donors</option>
                <option value="single">Specific Donor</option>
              </select>
            </div>

            {formData.donorType === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Donor
                </label>
                {donors.length === 0 ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Loading donors...
                  </div>
                ) : (
                  <select
                    value={formData.specificDonor}
                    onChange={(e) => setFormData({ ...formData, specificDonor: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                  >
                    <option value="">Choose a donor...</option>
                    {donors.map((donor) => (
                      <option key={donor.id} value={donor.id}>
                        {donor.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Export Format <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors hover:border-[#14856E] has-[:checked]:border-[#14856E] has-[:checked]:bg-[#14856E] has-[:checked]:bg-opacity-5">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={formData.format === 'pdf'}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">PDF Document</span>
                </label>
                <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors hover:border-[#14856E] has-[:checked]:border-[#14856E] has-[:checked]:bg-[#14856E] has-[:checked]:bg-opacity-5">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={formData.format === 'csv'}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-4 h-4 text-[#14856E] border-gray-300 focus:ring-[#14856E]"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">CSV Spreadsheet</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-6 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors"
          >
            <Download size={18} />
            Generate {formData.format.toUpperCase()}
          </button>
        </div>
      </div>
        </div>
      )}
    </>
  );
}

