import { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Trash2, Download, Save, Printer, History, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { api } from '../services/api';
import logo from '../../../logo.png';

interface DonationEntry {
  date: string;
  amount: string;
}

interface LetterData {
  donorName: string;
  donations: DonationEntry[];
  donationType: string;
  projectName: string;
  message: string;
}

const defaultLetterData: LetterData = {
  donorName: '',
  donations: [{ date: '', amount: '' }],
  donationType: 'Sponsor a Child',
  projectName: '',
  message: '',
};

const donationTypes = [
  'Sponsor a Child',
  'General Donation',
  'Education Support',
  'Healthcare Support',
  'Infrastructure Development',
  'Emergency Relief',
  'Monthly Contribution',
  'Annual Contribution',
];

export function AcknowledgmentLetter() {
  const form = useForm<LetterData>({
    defaultValues: defaultLetterData,
  });

  const [showHistory, setShowHistory] = useState(false);
  const [letterHistory, setLetterHistory] = useState<LetterData[]>([]);
  const [showDonorDropdown, setShowDonorDropdown] = useState(false);
  const [donors, setDonors] = useState<any[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);
  const printableLetterRef = useRef<HTMLDivElement>(null);

  const formData = form.watch();

  const todayDate = useMemo(() => format(new Date(), 'MMMM dd, yyyy'), []);

  useEffect(() => {
    const loadDonors = async () => {
      setIsLoadingDonors(true);
      try {
        const response = await api.getDonors(100, 0);
        const donorData = Array.isArray(response) ? response : response.data || [];
        setDonors(donorData);
      } catch (error) {
        console.error('Failed to load donors:', error);
        setDonors([]);
      } finally {
        setIsLoadingDonors(false);
      }
    };
    loadDonors();
  }, []);

  const totalAmount = useMemo(
    () =>
      formData.donations.reduce((sum, donation) => {
        return sum + (parseFloat(donation.amount) || 0);
      }, 0),
    [formData.donations]
  );

  const hasValidData = formData.donorName && formData.donations.some((d) => d.amount);

  const addDonation = () => {
    const donations = form.getValues('donations');
    form.setValue('donations', [...donations, { date: '', amount: '' }]);
  };

  const removeDonation = (index: number) => {
    const donations = form.getValues('donations');
    if (donations.length > 1) {
      form.setValue(
        'donations',
        donations.filter((_, i) => i !== index)
      );
    }
  };

  const handleSaveDraft = () => {
    setLetterHistory((prev) => [formData, ...prev.slice(0, 9)]);
    setShowHistory(true);
  };

  const handleSaveToDB = async () => {
    if (!printableLetterRef.current) {
      alert('Letter content not available to save.');
      return;
    }

    try {
      const content = printableLetterRef.current.innerHTML;

      // Try to resolve donor id from selected donor name
      const matchedDonor = donors.find((d) => d.name === formData.donorName);
      const donor_id = matchedDonor ? matchedDonor.id : null;

      const payload = {
        student_id: null,
        donor_id,
        template_name: formData.projectName || null,
        subject: 'Acknowledgment of Donation',
        content,
        is_public: false,
      };

      const res = await api.saveLetter(payload);
      // push to local history as well
      setLetterHistory((prev) => [formData, ...prev.slice(0, 9)]);
      alert('Letter saved successfully.');
      return res;
    } catch (error) {
      console.error('Failed to save letter:', error);
      alert('Failed to save letter.');
    }
  };

  const handleLoadDraft = (item: LetterData) => {
    form.reset(item);
    setShowHistory(false);
  };

  const handleGeneratePDF = () => {
    if (!printableLetterRef.current) return;

    const letterContent = printableLetterRef.current.innerHTML;
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acknowledgment Letter</title>
            <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; }
            .container { max-width: 900px; margin: 0 auto; padding: 0.5cm; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 14px; }
            th { background: #f3f4f6; text-align: left; }
            .text-right { text-align: right; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; padding: 0; }
              .container { padding: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="container">${letterContent}</div>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `acknowledgment-letter-${Date.now()}.html`;
    
    const popup = window.open(url, '_blank');
    if (popup) {
      popup.focus();
    }
  };

  const handlePrint = () => {
    if (!printableLetterRef.current) return;

    const letterContent = printableLetterRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acknowledgment Letter</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6; }
            .container { max-width: 900px; margin: 0 auto; padding: 0.5cm; }
            table { width: 100%; border-collapse: collapse; margin: 16px 0; }
            th, td { border: 1px solid #d1d5db; padding: 8px 10px; font-size: 14px; }
            th { background: #f3f4f6; text-align: left; }
            img { max-width: 100%; height: auto; }
            @media print {
              body { margin: 0; padding: 0; }
              .container { padding: 0.5cm; }
              * { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="container">${letterContent}</div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Acknowledgment Letter</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">
          Create professional donation acknowledgment letters
        </p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Generate & Manage Letters</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <History size={16} />
          History ({letterHistory.length})
        </button>
      </div>

      {showHistory && (
        <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Recent Drafts</h3>
          {letterHistory.length === 0 ? (
            <p className="text-sm text-gray-500">No saved drafts yet.</p>
          ) : (
            <div className="space-y-2">
              {letterHistory.map((item, index) => (
                <button
                  key={`${item.donorName}-${index}`}
                  onClick={() => handleLoadDraft(item)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-900">{item.donorName || 'Unnamed donor'}</span>
                    <span className="text-sm text-gray-500">
                      ৳{item.donations.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Donor Information</h2>

          <form className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Donor Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter donor's full name or select from list"
                    {...form.register('donorName', { required: 'Donor name is required' })}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDonorDropdown(!showDonorDropdown)}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Select from existing donors"
                  >
                    <ChevronDown size={16} className={`transition-transform ${showDonorDropdown ? 'rotate-180' : ''}`} />
                    <span className="hidden sm:inline text-sm">Donors</span>
                  </button>
                </div>

                {showDonorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto">
                    {isLoadingDonors ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">Loading donors...</div>
                    ) : donors.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">No donors found</div>
                    ) : (
                      donors
                        .filter((donor) =>
                          donor.name.toLowerCase().includes(formData.donorName.toLowerCase())
                        )
                        .map((donor) => (
                          <button
                            key={donor.id}
                            type="button"
                            onClick={() => {
                              form.setValue('donorName', donor.name);
                              setShowDonorDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-900">{donor.name}</span>
                              <span className="text-xs text-gray-500">৳{donor.total_contributed?.toLocaleString() || '0'}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{donor.email}</p>
                          </button>
                        ))
                    )}
                  </div>
                )}

                {form.formState.errors.donorName && (
                  <p className="mt-1 text-sm text-red-500">{form.formState.errors.donorName.message}</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Donation Details <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addDonation}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-[#14856E] text-white rounded-md hover:bg-[#0f6b5a] transition-colors"
                >
                  <Plus size={14} />
                  Add More
                </button>
              </div>

              <div className="space-y-2">
                {formData.donations.map((_, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                    <input
                      type="date"
                      {...form.register(`donations.${index}.date` as const)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Amount (Tk.)"
                      {...form.register(`donations.${index}.amount` as const)}
                      className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                    {formData.donations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDonation(index)}
                        className="px-3 py-2.5 border border-gray-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Donation Type <span className="text-red-500">*</span>
              </label>
              <select
                {...form.register('donationType')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              >
                {donationTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                placeholder="e.g., Child Education Initiative"
                {...form.register('projectName')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Message</label>
              <textarea
                rows={4}
                placeholder="Add any special notes or personalized message..."
                {...form.register('message')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleGeneratePDF}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors"
              >
                <Download size={16} />
                <span className="hidden sm:inline">View PDF</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Print</span>
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Save size={16} />
                <span className="hidden sm:inline">Save Draft</span>
              </button>
              <button
                type="button"
                onClick={handleSaveToDB}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Save size={16} />
                <span className="hidden sm:inline">Save to DB</span>
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Letter Preview</h2>
            <p className="text-sm text-gray-600">Real-time preview of acknowledgment letter</p>
          </div>

          <div className="p-6 max-h-[calc(100vh-220px)] overflow-auto" ref={printableLetterRef}>
            <div className="relative bg-white border border-gray-200 rounded-lg p-6 md:p-8" style={{paddingLeft: '0.5cm', paddingRight: '0.5cm'}}>
              <div className="relative">
                <div className="text-center border-b-2 border-[#14856E] pb-4 mb-6" style={{paddingBottom: '12.8px', marginBottom: '19.2px'}}>
                  <img src={logo} alt="Sombhabona logo" className="w-auto mx-auto" style={{height: '51.2px'}} />
                  <p className="text-xs text-gray-600 mt-2">
                    756 West Sewrapara, Mirpur, Dhaka | Phone: 01737243447 | Email: info@sombhabona.org
                  </p>
                </div>

                <div className="text-right text-sm text-gray-700 mb-6">
                  Date: <strong>{todayDate}</strong>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-700">To,</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{formData.donorName || '[Donor Name]'}</p>
                </div>

                <p className="text-center font-semibold text-gray-900 mb-6">Subject: Acknowledgment of Donation</p>

                <div className="space-y-4 text-sm leading-relaxed text-gray-800">
                  <p>Dear {formData.donorName || '[Donor Name]'},</p>

                  <p>
                    On behalf of <strong>Sombhabona</strong> and all those whose lives you touch, we extend our
                    heartfelt gratitude for your generous contribution. Your support plays a vital role in enabling us
                    to continue our mission of building hope and nurturing lives in our community.
                  </p>

                  {hasValidData && (
                    <>
                      <p>
                        We acknowledge with sincere appreciation your donation(s) towards{' '}
                        <strong>{formData.donationType}</strong>
                        {formData.projectName && ` for the project "${formData.projectName}"`}.
                      </p>

                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100 text-gray-700">
                            <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                            <th className="border border-gray-300 px-3 py-2 text-right">Amount (BDT)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.donations.map((donation, index) => {
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
                            <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                              ৳{Number(totalAmount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  )}

                  <p>This letter serves as an official receipt for your donation. Please retain it for your records.</p>

                  {formData.message && (
                    <div className="p-3 border-l-4 border-[#14856E] bg-[#14856E]/5 rounded-r-md">
                      <p className="italic">{formData.message}</p>
                    </div>
                  )}

                  <p>
                    Your compassion and generosity make a profound difference in the lives of those we serve. Together,
                    we are creating lasting positive change and building a brighter future for our community.
                  </p>

                  <p>Thank you once again for your unwavering support and trust in our mission.</p>

                  <p className="pt-4">Yours sincerely,</p>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-300 text-sm text-gray-700 text-center" style={{marginTop: '3.5rem', paddingTop: '1.5rem'}}>
                  <p className="font-semibold">Account and Admin</p>
                  <p>Sombhabona</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
