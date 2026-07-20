import { useEffect, useMemo, useState } from 'react';
import { Plus, Download, Printer, Calendar, FileText, Book, ReceiptText } from 'lucide-react';
import { AddLedgerEntryPanel } from './AddLedgerEntryPanel';
import { StatementGenerator } from './StatementGenerator';
import { api, CreateLedgerEntryPayload, LedgerEntry, LedgerSummary } from '../services/api';
import { formatDate } from '../utils/dateFormat';

export function Accounting() {
  const [activeTab, setActiveTab] = useState<'ledger-book' | 'voucher'>('ledger-book');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [pageError, setPageError] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary>({
    opening_balance: 0,
    total_credit: 0,
    total_debit: 0,
    closing_balance: 0,
  });

  const loadLedgerData = async () => {
    try {
      const [entries, summary] = await Promise.all([api.getLedgerEntries(), api.getLedgerSummary()]);
      setLedgerEntries(entries);
      setLedgerSummary(summary);
    } catch (error) {
      console.error('Failed to load ledger data:', error);
    }
  };

  useEffect(() => {
    loadLedgerData().catch(() => null);
  }, []);

  const handleAddEntry = async (payload: CreateLedgerEntryPayload) => {
    await api.addLedgerEntry(payload);
    await loadLedgerData();
  };

  const handleStatementExport = async (month: number, year: number, format: 'csv' | 'pdf', donorId?: number) => {
    setPageError('');
    try {
      const blob = await api.exportDonorStatement({
        month,
        year,
        format,
        donor_id: donorId,
      });
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `donor-statement-${year}-${String(month).padStart(2, '0')}.${format}`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setPageError((err as Error).message || 'Failed to export statement. Please try again.');
    }
  };

  const filteredEntries = ledgerEntries.filter((entry) => {
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    const matchesType = typeFilter === 'all' || entry.type.toLowerCase() === typeFilter;
    return matchesCategory && matchesType;
  });

  const categories = useMemo(
    () => Array.from(new Set(ledgerEntries.map((entry) => entry.category))).sort(),
    [ledgerEntries],
  );

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Accounting & Financial Ledger</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Track all financial transactions</p>
      </div>

      {pageError && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      )}

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 md:gap-8">
          <button
            onClick={() => setActiveTab('ledger-book')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'ledger-book'
                ? 'border-[#14856E] text-[#14856E]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Book size={18} />
            <span>Ledger Book</span>
          </button>
          <button
            onClick={() => setActiveTab('voucher')}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'voucher'
                ? 'border-[#14856E] text-[#14856E]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <ReceiptText size={18} />
            <span>Voucher</span>
          </button>
        </div>
      </div>

      {activeTab === 'ledger-book' && (
        <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Opening Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">৳{Number(ledgerSummary.opening_balance).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Credit</p>
          <p className="text-2xl font-bold text-green-600 mt-1">৳{Number(ledgerSummary.total_credit).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Total Debit</p>
          <p className="text-2xl font-bold text-red-600 mt-1">৳{Number(ledgerSummary.total_debit).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-2 border-[#14856E]">
          <p className="text-sm text-gray-600">Closing Balance</p>
          <p className="text-2xl font-bold text-[#14856E] mt-1">৳{Number(ledgerSummary.closing_balance).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
        <div className="flex flex-col gap-3 mb-4">
          <button
            onClick={() => setIsPanelOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors w-full md:w-auto"
          >
            <Plus size={18} />
            Add Ledger Entry
          </button>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setIsStatementOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-1 sm:flex-none"
            >
              <FileText size={18} />
              <span className="hidden sm:inline">Generate Statement</span>
              <span className="sm:hidden">Statement</span>
            </button>
            <button
              onClick={() => {
                const now = new Date();
                handleStatementExport(now.getMonth() + 1, now.getFullYear(), 'csv').catch(() => null);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Download CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex-1 sm:flex-none"
            >
              <Printer size={18} />
              <span className="hidden sm:inline">Print</span>
              <span className="sm:hidden">Print</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Calendar size={20} className="text-gray-400" />
            <input
              type="date"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>
        </div>
      </div>

      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Particulars
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => {
                const isCredit = entry.type === 'Credit';

                return (
                  <tr
                    key={entry.id}
                    className={`hover:opacity-90 transition-opacity ${
                      isCredit ? 'bg-green-50/60' : 'bg-red-50/60'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(entry.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.voucher_ref}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{entry.particulars}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          isCredit
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {entry.type.toUpperCase()}
                      </span>
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${
                        isCredit ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      ৳{entry.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-gray-900">
                      ৳{Number(entry.closing_balance).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            className={`rounded-lg shadow p-4 ${entry.type === 'Credit' ? 'bg-green-50' : 'bg-red-50'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900">{entry.voucher_ref}</p>
                <p className="text-xs text-gray-500">{formatDate(entry.date)}</p>
              </div>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  entry.type === 'Credit'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {entry.type.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{entry.particulars}</p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{entry.category}</span>
              <span
                className={`font-semibold ${
                  entry.type === 'Credit' ? 'text-green-700' : 'text-red-700'
                }`}
              >
                ৳{entry.amount.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
        </>
      )}

      {activeTab === 'voucher' && (
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Voucher Management</h2>
            <p className="text-sm text-gray-600">View and manage all vouchers for accounting entries.</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-[#14856E]/5 border border-[#14856E]/20 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Vouchers</p>
                <p className="text-2xl font-bold text-[#14856E]">{ledgerEntries.length}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Unique Voucher References</p>
                <p className="text-2xl font-bold text-blue-600">{Array.from(new Set(ledgerEntries.map(e => e.voucher_ref))).length}</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Voucher Summary by Type</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Voucher Ref</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {ledgerEntries.slice(0, 20).map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">{entry.voucher_ref}</td>
                        <td className="px-4 py-2 text-gray-700">{formatDate(entry.date)}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              entry.type === 'Credit'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {entry.type.toUpperCase()}
                          </span>
                        </td>
                        <td className={`px-4 py-2 font-semibold ${entry.type === 'Credit' ? 'text-green-700' : 'text-red-700'}`}>
                          ৳{entry.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {ledgerEntries.length > 20 && (
                <p className="text-xs text-gray-500 mt-2">Showing 20 of {ledgerEntries.length} vouchers</p>
              )}
            </div>
          </div>
        </div>
      )}

      <AddLedgerEntryPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onSubmit={(payload) =>
          handleAddEntry(payload)
            .then(() => setIsPanelOpen(false))
            .catch(() => null)
        }
      />
      <StatementGenerator
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        onGenerate={handleStatementExport}
      />
    </div>
  );
}
