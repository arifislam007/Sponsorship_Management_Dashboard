import { useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Download, History, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { api } from '../../services/api';
import logo from '../../../../logo.png';

interface DonationEntry {
  date: string;
  amount: string;
}

interface LetterData {
  donorId: string;
  donorName: string;
  donations: DonationEntry[];
  donationType: string;
  projectName: string;
  message: string;
}

const donationTypeOptions = [
  'Sponsor a Child',
  'General Donation',
  'Education Support',
  'Healthcare Support',
  'Infrastructure Development',
  'Emergency Relief',
  'Monthly Contribution',
  'Annual Contribution',
];

const defaultLetterData: LetterData = {
  donorId: '',
  donorName: '',
  donations: [{ date: '', amount: '' }],
  donationType: 'Sponsor a Child',
  projectName: '',
  message: '',
};

export function AccountingAcknowledgmentLetter() {
  const [letterData, setLetterData] = useState<LetterData>(defaultLetterData);
  const [historyItems, setHistoryItems] = useState<LetterData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [donors, setDonors] = useState<Array<{ id: number; name: string }>>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(true);

  const printableLetterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;

    api
      .getDonors(500, 0)
      .then((response) => {
        if (!isMounted) return;
        const donorData = Array.isArray(response) ? response : response.data || [];
        setDonors(donorData.map((donor: any) => ({ id: donor.id, name: donor.name })));
      })
      .catch(() => {
        if (!isMounted) return;
        setDonors([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingDonors(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const todayDate = useMemo(() => format(new Date(), 'MMMM dd, yyyy'), []);

  const totalAmount = useMemo(
    () =>
      letterData.donations.reduce((sum, donation) => {
        const parsed = Number(donation.amount || 0);
        return sum + (Number.isFinite(parsed) ? parsed : 0);
      }, 0),
    [letterData.donations],
  );

  const hasValidAmounts = letterData.donations.some((donation) => Number(donation.amount) > 0);

  const updateDonation = (index: number, key: keyof DonationEntry, value: string) => {
    setLetterData((prev) => ({
      ...prev,
      donations: prev.donations.map((donation, donationIndex) =>
        donationIndex === index ? { ...donation, [key]: value } : donation,
      ),
    }));
  };

  const addDonation = () => {
    setLetterData((prev) => ({
      ...prev,
      donations: [...prev.donations, { date: '', amount: '' }],
    }));
  };

  const removeDonation = (index: number) => {
    setLetterData((prev) => ({
      ...prev,
      donations:
        prev.donations.length <= 1
          ? prev.donations
          : prev.donations.filter((_, donationIndex) => donationIndex !== index),
    }));
  };

  const saveDraft = () => {
    setHistoryItems((prev) => [letterData, ...prev.slice(0, 9)]);
    setShowHistory(true);
  };

  const generatePdfViaPrint = () => {
    if (!printableLetterRef.current) return;

    const popup = window.open('', '_blank', 'width=960,height=720');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>Acknowledgment Letter</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #111827; margin: 24px; }
            .printable-root { max-width: 900px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 14px; }
            th { background: #f3f4f6; text-align: left; }
            .text-right { text-align: right; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; padding-top: 18px; border-top: 1px solid #d1d5db; }
            .muted { color: #6b7280; font-size: 12px; }
            .footer-box { margin-top: 20px; padding-top: 12px; border-top: 1px solid #d1d5db; font-size: 12px; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>
          <div class="printable-root">${printableLetterRef.current.innerHTML}</div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-[#14856E]">Accounting Module</p>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Acknowledgment Letter</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Create and print donor acknowledgment letters with live preview</p>
        </div>

        <Link
          to="/dashboard/accounting"
          className="inline-flex items-center gap-2 self-start md:self-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft size={18} />
          Back To Ledger
        </Link>
      </div>

      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">Letter Workspace</p>
          <p className="text-xs text-gray-600 mt-1">Uses the shared Sombhabona branding and accounting workflow</p>
        </div>
        <button
          onClick={() => setShowHistory((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <History size={16} />
          History ({historyItems.length})
        </button>
      </div>

      {showHistory && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Drafts</h2>
          {historyItems.length === 0 ? (
            <p className="text-sm text-gray-500">No saved drafts yet.</p>
          ) : (
            <div className="space-y-2">
              {historyItems.map((item, index) => (
                <button
                  key={`${item.donorName}-${index}`}
                  onClick={() => setLetterData(item)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-900">{item.donorName || 'Unnamed donor'}</span>
                    <span className="text-sm text-gray-500">৳{item.donations.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid xl:grid-cols-2 gap-6 items-start">
        <section className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Donor Information</h2>
          <p className="text-sm text-gray-600 mb-5">Provide donation details to generate the letter</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Donor</label>
              {isLoadingDonors ? (
                <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">Loading donors...</div>
              ) : (
                <select
                  value={letterData.donorId}
                  onChange={(event) => {
                    const selectedId = event.target.value;
                    const selectedDonor = donors.find((donor) => String(donor.id) === selectedId);
                    setLetterData((prev) => ({
                      ...prev,
                      donorId: selectedId,
                      donorName: selectedDonor?.name || prev.donorName,
                    }));
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                >
                  <option value="">Choose donor (optional)</option>
                  {donors.map((donor) => (
                    <option key={donor.id} value={donor.id}>
                      {donor.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donor Name</label>
              <input
                value={letterData.donorName}
                onChange={(event) =>
                  setLetterData((prev) => ({
                    ...prev,
                    donorName: event.target.value,
                  }))
                }
                placeholder="Enter donor full name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Donation Details</label>
                <button
                  onClick={addDonation}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-[#14856E] text-white rounded-md hover:bg-[#0f6b5a] transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              <div className="space-y-2">
                {letterData.donations.map((donation, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="date"
                      value={donation.date}
                      onChange={(event) => updateDonation(index, 'date', event.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={donation.amount}
                      onChange={(event) => updateDonation(index, 'amount', event.target.value)}
                      placeholder="Amount (BDT)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                    <button
                      onClick={() => removeDonation(index)}
                      disabled={letterData.donations.length <= 1}
                      className="px-2 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donation Type</label>
              <select
                value={letterData.donationType}
                onChange={(event) => setLetterData((prev) => ({ ...prev, donationType: event.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              >
                {donationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                value={letterData.projectName}
                onChange={(event) => setLetterData((prev) => ({ ...prev, projectName: event.target.value }))}
                placeholder="e.g., Child Education Initiative"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message</label>
              <textarea
                value={letterData.message}
                onChange={(event) => setLetterData((prev) => ({ ...prev, message: event.target.value }))}
                rows={4}
                placeholder="Add custom notes or appreciation message"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent resize-none"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-2 pt-3 border-t border-gray-200">
              <button
                onClick={generatePdfViaPrint}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors"
              >
                <Download size={16} />
                Generate PDF
              </button>
              <button
                onClick={saveDraft}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Save size={16} />
                Save Draft
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Letter Preview</h2>
            <p className="text-sm text-gray-600">Real-time preview with official organization branding</p>
          </div>

          <div className="p-4 md:p-6 max-h-[calc(100vh-220px)] overflow-auto" ref={printableLetterRef}>
            <div className="relative bg-white border border-gray-200 rounded-lg p-5 md:p-8">
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                <img src={logo} alt="" className="w-72 h-auto" />
              </div>

              <div className="relative">
                <div className="text-center border-b-2 border-[#14856E] pb-4 mb-6">
                  <img src={logo} alt="Sombhabona logo" className="h-16 w-auto mx-auto" />
                  <p className="text-xs text-gray-600 mt-2">756 West Sewrapara, Mirpur, Dhaka | Phone: 01737243447 | Email: info@sombhabona.org</p>
                </div>

                <div className="text-right text-sm text-gray-700 mb-6">Date: <strong>{todayDate}</strong></div>

                <div className="mb-6">
                  <p className="text-sm text-gray-700">To,</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{letterData.donorName || '[Donor Name]'}</p>
                </div>

                <p className="text-center font-semibold text-gray-900 mb-6">Subject: Acknowledgment of Donation</p>

                <div className="space-y-4 text-sm leading-relaxed text-gray-800">
                  <p>Dear {letterData.donorName || '[Donor Name]'},</p>

                  <p>
                    On behalf of <strong>Sombhabona</strong>, we extend our heartfelt gratitude for your generous
                    contribution. Your support helps us continue our mission and strengthen opportunities for children
                    and families in our community.
                  </p>

                  {hasValidAmounts && (
                    <>
                      <p>
                        We acknowledge with appreciation your donation(s) towards <strong>{letterData.donationType}</strong>
                        {letterData.projectName && ` for the project "${letterData.projectName}"`}.
                      </p>

                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700">
                            <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">Amount (BDT)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {letterData.donations.map((donation, index) => {
                            if (!Number(donation.amount)) return null;
                            return (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-3 py-2">
                                  {donation.date ? format(new Date(donation.date), 'MMMM dd, yyyy') : '-'}
                                </td>
                                <td className="border border-gray-300 px-3 py-2 text-right">
                                  ৳{Number(donation.amount).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-[#14856E]/10">
                            <td className="border border-gray-300 px-3 py-2 font-semibold">Total Amount</td>
                            <td className="border border-gray-300 px-3 py-2 text-right font-semibold">৳{totalAmount.toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}

                  <p>This letter serves as an official receipt for your donation. Please retain it for your records.</p>

                  {letterData.message && (
                    <div className="p-3 border-l-4 border-[#14856E] bg-[#14856E]/5 rounded-r-md">
                      <p className="italic">{letterData.message}</p>
                    </div>
                  )}

                  <p>
                    Thank you once again for your continued trust and generosity. Together we are building a brighter
                    future.
                  </p>

                  <p className="pt-2">With warm regards,</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mt-10 pt-4 border-t border-gray-300 text-sm text-gray-700 signature-grid">
                  <div>
                    <div className="h-14" />
                    <p className="inline-block border-t border-gray-500 pt-2 font-semibold">Authorized Signatory</p>
                    <p className="text-xs text-gray-500">Director, Sombhabona</p>
                  </div>
                  <div>
                    <div className="h-14" />
                    <p className="inline-block border-t border-gray-500 pt-2 font-semibold">Secretary</p>
                    <p className="text-xs text-gray-500">Sombhabona NGO</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-600 space-y-1 footer-box">
                  <p><strong>Bank Details:</strong> Sonali Bank, Mirpur Industrial Area Branch, Dhaka</p>
                  <p>Account Name: Sombhabona | Account No: 4443801010947 | Routing No: 200263047</p>
                  <p><strong>Mobile Banking:</strong> Bkash: 01883742038 | Nagad: 01883742038 | Rocket: 018837420387</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
