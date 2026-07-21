import { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Trash2, Download, Save, Printer, History, ChevronDown, FileText, Archive, DollarSign, Users, Eye, X, Upload, PenLine } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { api } from '../services/api';
import logo from '../../../logo.png';
import udaySignature from '../../../Uday_signature.jpg';

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

interface SavedLetterApi {
  id: number;
  donor_id?: number | null;
  template_name?: string | null;
  subject?: string | null;
  content: string;
  is_public?: boolean;
  created_at?: string;
}

interface SavedLetterRecord {
  id: number;
  donorName: string;
  projectName: string;
  amount: number;
  createdAt: string;
  content: string;
  formData: LetterData | null;
  has_pdf?: boolean;
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

const LETTER_META_PREFIX = '<!--ACKNOWLEDGMENT_META:';
const LETTER_META_SUFFIX = '-->';

const safeParseLetterData = (content: string): LetterData | null => {
  const metaStart = content.indexOf(LETTER_META_PREFIX);
  if (metaStart === -1) return null;

  const metaEnd = content.indexOf(LETTER_META_SUFFIX, metaStart);
  if (metaEnd === -1) return null;

  const encodedMeta = content.slice(metaStart + LETTER_META_PREFIX.length, metaEnd);

  try {
    const decoded = decodeURIComponent(atob(encodedMeta));
    const parsed = JSON.parse(decoded) as LetterData;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      donorName: parsed.donorName || '',
      donations: Array.isArray(parsed.donations) && parsed.donations.length > 0 ? parsed.donations : [{ date: '', amount: '' }],
      donationType: parsed.donationType || 'Sponsor a Child',
      projectName: parsed.projectName || '',
      message: parsed.message || '',
    };
  } catch {
    return null;
  }
};

const stripLetterMeta = (content: string) => {
  const metaStart = content.indexOf(LETTER_META_PREFIX);
  const metaEnd = content.indexOf(LETTER_META_SUFFIX, metaStart);

  if (metaStart === -1 || metaEnd === -1) return content;
  return content.slice(metaEnd + LETTER_META_SUFFIX.length).trimStart();
};

export function AcknowledgmentLetter() {
  const form = useForm<LetterData>({
    defaultValues: defaultLetterData,
  });

  const [activeTab, setActiveTab] = useState<'compose' | 'saved'>('compose');
  const [letterHistory, setLetterHistory] = useState<LetterData[]>([]);
  const [savedLetters, setSavedLetters] = useState<SavedLetterRecord[]>([]);
  const [showDonorDropdown, setShowDonorDropdown] = useState(false);
  const [donors, setDonors] = useState<any[]>([]);
  const [isLoadingDonors, setIsLoadingDonors] = useState(false);
  const [donorSponsorships, setDonorSponsorships] = useState<any[]>([]);
  const [isLoadingSponsorships, setIsLoadingSponsorships] = useState(false);
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingLetter, setViewingLetter] = useState<SavedLetterRecord | null>(null);
  const [showSignatureEditor, setShowSignatureEditor] = useState(false);
  const [signatureData, setSignatureData] = useState({
    name: 'Saad Ibn Maruf',
    title: 'Account and Admin',
    organization: 'Sombhabona',
    imageUrl: udaySignature as string,
  });
  const printableLetterRef = useRef<HTMLDivElement>(null);
  const viewModalRef = useRef<HTMLDivElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const formData = form.watch();

  const todayDate = useMemo(() => format(new Date(), 'MMMM dd, yyyy'), []);

  useEffect(() => {
    const loadSavedLetters = async () => {
      try {
        const response = await api.getLetters({ template_name: 'Acknowledgment of Donation' });
        const letters = Array.isArray(response) ? response : response.letters || response.data || [];

        const normalized = (letters as SavedLetterApi[])
          .filter((letter) => typeof letter?.content === 'string')
          .map((letter: any) => {
            const formData = safeParseLetterData(letter.content);
            const fallbackDonorName = formData?.donorName || 'Unnamed donor';
            const fallbackProjectName = formData?.projectName || letter.template_name || '';
            const amount = formData?.donations?.reduce((sum, donation) => sum + (Number(donation.amount) || 0), 0) || 0;

            return {
              id: letter.id,
              donorName: fallbackDonorName,
              projectName: fallbackProjectName,
              amount,
              createdAt: letter.created_at || new Date().toISOString(),
              content: stripLetterMeta(letter.content),
              formData,
              has_pdf: !!letter.has_pdf,
            } as SavedLetterRecord;
          })
          .sort((left, right) => Number(new Date(right.createdAt)) - Number(new Date(left.createdAt)));

        setSavedLetters(normalized);
      } catch (error) {
        console.error('Failed to load saved letters:', error);
        setSavedLetters([]);
      }
    };

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

    loadSavedLetters();
    loadDonors();
  }, []);

  const totalAmount = useMemo(
    () =>
      formData.donations.reduce((sum, donation) => {
        return sum + (parseFloat(donation.amount) || 0);
      }, 0),
    [formData.donations]
  );

  const savedLettersTotal = useMemo(
    () => savedLetters.reduce((sum, letter) => sum + letter.amount, 0),
    [savedLetters],
  );

  const uniqueSavedDonors = useMemo(
    () => new Set(savedLetters.map((letter) => letter.donorName).filter(Boolean)).size,
    [savedLetters],
  );

  const latestSavedAt = savedLetters[0]?.createdAt ? format(new Date(savedLetters[0].createdAt), 'MMM dd, yyyy') : 'No saved letters yet';

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

  const fetchAndFillSponsorships = async (donorId: number, donorName: string) => {
    setDonorSponsorships([]);
    setIsLoadingSponsorships(true);
    try {
      const res = await api.getSponsorships(100, 0, donorName, 'active');
      const all = Array.isArray(res) ? res : res.data || [];
      const sponsorships = all.filter((s: any) => s.donor_id === donorId);
      setDonorSponsorships(sponsorships);
      if (sponsorships.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const totalAmount = sponsorships.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
        form.setValue('donations', [{ date: today, amount: String(totalAmount) }]);
        form.setValue('donationType', 'Sponsor a Child');
        form.setValue('projectName', sponsorships.length === 1
          ? `Sponsorship for ${sponsorships[0].student_name}`
          : `Sponsorship for ${sponsorships.map((s: any) => s.student_name).join(', ')}`
        );
      }
    } catch {
      setDonorSponsorships([]);
    } finally {
      setIsLoadingSponsorships(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSignatureData((prev) => ({ ...prev, imageUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveDraft = () => {
    setLetterHistory((prev) => [formData, ...prev.slice(0, 9)]);
  };

  const buildSavedContent = () => {
    if (!printableLetterRef.current) return '';

    const content = printableLetterRef.current.innerHTML;
    const encodedMeta = btoa(encodeURIComponent(JSON.stringify(formData)));
    return `${LETTER_META_PREFIX}${encodedMeta}${LETTER_META_SUFFIX}${content}`;
  };

  const persistLetterToDb = async () => {
    if (!printableLetterRef.current) {
      alert('Letter content not available to save.');
      return;
    }

    try {
      setIsSavingToDb(true);
      setSaveMessage('');

      const content = buildSavedContent();

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
        donor_name: formData.donorName,
      };

      const res = await api.saveLetter(payload);
      // push to local history as well
      setLetterHistory((prev) => [formData, ...prev.slice(0, 9)]);
      setSavedLetters((prev) => [
        {
          id: res?.letter?.id || Date.now(),
          donorName: formData.donorName || 'Unnamed donor',
          projectName: formData.projectName || '',
          amount: totalAmount,
          createdAt: res?.letter?.created_at || new Date().toISOString(),
          content: stripLetterMeta(content),
          formData,
          has_pdf: !!res?.pdf_url,
        },
        ...prev,
      ]);
      setSaveMessage('Letter saved to database with PDF.');
      return res;
    } catch (error) {
      console.error('Failed to save letter:', error);
      alert('Failed to save letter.');
    } finally {
      setIsSavingToDb(false);
    }
  };

  const handleSaveToDB = async () => {
    await persistLetterToDb();
  };

  const handleLoadDraft = (item: LetterData) => {
    form.reset(item);
  };

  const handleLoadSavedLetter = (item: SavedLetterRecord) => {
    if (item.formData) {
      form.reset(item.formData);
      return;
    }
    alert('This saved letter can be viewed and printed, but the original form data was not stored for editing.');
  };

  const handleViewSavedLetter = (letter: SavedLetterRecord) => {
    setViewingLetter(letter);
    setViewModalOpen(true);
  };

  const handleDownloadPDF = async (letterId: number, donorName: string, createdAt: string) => {
    try {
      const blob = await api.downloadLetterPDF(letterId);
      const safeName = (donorName || 'donor').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const date = format(new Date(createdAt), 'yyyy-MM-dd');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acknowledgment_${safeName}_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handlePrintSavedLetter = () => {
    if (!viewingLetter || !viewModalRef.current) return;

    const letterContent = viewModalRef.current.innerHTML;
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

  const handlePrint = () => {
    if (!printableLetterRef.current) return;

    void persistLetterToDb();

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
      <div className="mb-6 md:mb-8">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.18em] text-[#14856E]">Accounting Module</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">Acknowledgment Letter</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Create, save, and reuse donor acknowledgment letters from one dashboard.
            </p>
          </div>

          <div className="flex self-start lg:self-auto rounded-xl border border-gray-200 bg-white p-1 gap-1">
            <button
              onClick={() => setActiveTab('compose')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'compose' ? 'bg-[#14856E] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <FileText size={15} />
              Compose
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'saved' ? 'bg-[#14856E] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <History size={15} />
              Saved PDFs
              {savedLetters.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === 'saved' ? 'bg-white/20 text-white' : 'bg-[#14856E]/10 text-[#14856E]'}`}>
                  {savedLetters.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6 md:mb-8">
        {[
          { title: 'Saved Letters', value: savedLetters.length.toString(), icon: FileText, color: 'bg-[#14856E]' },
          { title: 'Unique Donors', value: uniqueSavedDonors.toString(), icon: Users, color: 'bg-blue-500' },
          { title: 'Total Value', value: `৳${savedLettersTotal.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
          { title: 'Latest Save', value: latestSavedAt, icon: Archive, color: 'bg-rose-500' },
        ].map((stat) => (
          <div key={stat.title} className="rounded-xl bg-white border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-xl p-3`}>
                <stat.icon size={22} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {activeTab === 'saved' && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Saved PDFs</h3>
              <p className="text-sm text-gray-600">All acknowledgment letters saved to the database</p>
            </div>
            <span className="text-sm text-gray-500">{savedLetters.length} letter{savedLetters.length !== 1 ? 's' : ''}</span>
          </div>

          {savedLetters.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 text-sm">No saved letters yet. Compose and save one first.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Donor</th>
                    <th className="px-6 py-3">Project / Students</th>
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Date Saved</th>
                    <th className="px-6 py-3">PDF</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {savedLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{letter.donorName}</td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{letter.projectName || '—'}</td>
                      <td className="px-6 py-4 font-semibold text-[#14856E]">৳{letter.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{format(new Date(letter.createdAt), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        {letter.has_pdf ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                            <FileText size={11} /> PDF
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewSavedLetter(letter)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye size={12} /> View
                          </button>
                          {letter.has_pdf && (
                            <button
                              type="button"
                              onClick={() => handleDownloadPDF(letter.id, letter.donorName, letter.createdAt)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
                            >
                              <Download size={12} /> Download
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { handleLoadSavedLetter(letter); setActiveTab('compose'); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-[#14856E]/10 text-[#14856E] rounded-lg hover:bg-[#14856E]/20 transition-colors"
                          >
                            <FileText size={12} /> Load
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'compose' && <>
      {saveMessage && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {saveMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-5 md:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Donor Workspace</h2>
            <p className="text-sm text-gray-600 mt-1">Prepare the letter and persist it for future usage.</p>
          </div>

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
                  <button
                    type="button"
                    disabled={isLoadingSponsorships}
                    onClick={() => {
                      const name = formData.donorName.trim();
                      if (!name) return;
                      const matched = donors.find((d) => d.name.toLowerCase() === name.toLowerCase());
                      if (matched) {
                        fetchAndFillSponsorships(matched.id, matched.name);
                      } else {
                        alert('Donor not found in list. Please select from the dropdown.');
                      }
                    }}
                    className="px-4 py-2.5 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors flex items-center gap-2 disabled:opacity-60"
                    title="Fetch sponsored students & amounts"
                  >
                    <Users size={16} />
                    <span className="hidden sm:inline text-sm">{isLoadingSponsorships ? 'Fetching...' : 'Fetch'}</span>
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
                              fetchAndFillSponsorships(donor.id, donor.name);
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

                {isLoadingSponsorships && (
                  <p className="mt-2 text-xs text-gray-500">Loading sponsorships...</p>
                )}

                {!isLoadingSponsorships && donorSponsorships.length > 0 && (
                  <div className="mt-2 rounded-lg border border-[#14856E]/30 bg-[#14856E]/5 p-3">
                    <p className="text-xs font-semibold text-[#14856E] mb-2">Auto-filled from active sponsorships</p>
                    <div className="space-y-1.5">
                      {donorSponsorships.map((s: any) => (
                        <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg bg-white border border-gray-200 px-3 py-2">
                          <p className="text-sm font-medium text-gray-900">{s.student_name}</p>
                          <span className="text-xs font-semibold text-[#14856E]">৳{Number(s.amount).toLocaleString()}/mo</span>
                        </div>
                      ))}
                    </div>
                  </div>
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

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSignatureEditor(!showSignatureEditor)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <PenLine size={15} />
                  Signature
                </div>
                <ChevronDown size={15} className={`text-gray-500 transition-transform ${showSignatureEditor ? 'rotate-180' : ''}`} />
              </button>

              {showSignatureEditor && (
                <div className="p-4 space-y-3 border-t border-gray-200">
                  <div className="flex items-center gap-3">
                    {signatureData.imageUrl && (
                      <img src={signatureData.imageUrl} alt="Signature preview" className="h-14 w-auto object-contain border border-gray-200 rounded-lg bg-white p-1" />
                    )}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => signatureInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Upload size={14} />
                        Upload Signature
                      </button>
                      {signatureData.imageUrl !== (udaySignature as string) && (
                        <button
                          type="button"
                          onClick={() => setSignatureData((prev) => ({ ...prev, imageUrl: udaySignature as string }))}
                          className="text-xs text-gray-500 hover:text-red-600 transition-colors text-left"
                        >
                          Reset to default
                        </button>
                      )}
                    </div>
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSignatureUpload}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Signatory Name</label>
                    <input
                      type="text"
                      value={signatureData.name}
                      onChange={(e) => setSignatureData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title / Designation</label>
                    <input
                      type="text"
                      value={signatureData.title}
                      onChange={(e) => setSignatureData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Organization</label>
                    <input
                      type="text"
                      value={signatureData.organization}
                      onChange={(e) => setSignatureData((prev) => ({ ...prev, organization: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isSavingToDb}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
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
                disabled={isSavingToDb}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-50"
              >
                <Save size={16} />
                <span className="hidden sm:inline">{isSavingToDb ? 'Saving...' : 'Save to DB'}</span>
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Letter Preview</h2>
            <p className="text-sm text-gray-600">Real-time preview and database-ready letter content</p>
          </div>

          <div className="flex-1 min-h-0 overflow-auto p-4 md:p-6" ref={printableLetterRef}>
            <div className="relative bg-white border border-gray-200 rounded-lg p-4 md:p-8">
              <div className="relative">
                <div className="text-center border-b-2 border-[#14856E] pb-3 mb-5">
                  <img src={logo} alt="Sombhabona logo" className="h-10 md:h-12 w-auto mx-auto" />
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

                      <div className="overflow-x-auto">
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
                      </div>
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

                  <div className="mt-8 flex flex-col items-center text-center">
                    {signatureData.imageUrl && (
                      <img src={signatureData.imageUrl} alt={`${signatureData.name} signature`} className="h-16 w-auto object-contain mb-3" />
                    )}
                    <p className="font-semibold text-gray-900">({signatureData.name})</p>
                    <p className="text-sm text-gray-700">{signatureData.title}</p>
                    <p className="text-sm text-gray-700">{signatureData.organization}</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
      </>}

      {/* View Letter Modal */}
      {viewModalOpen && viewingLetter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Saved Letter - {viewingLetter.donorName}</h3>
                <p className="text-sm text-gray-600 mt-1">{viewingLetter.projectName || 'Acknowledgment Letter'} • {format(new Date(viewingLetter.createdAt), 'MMM dd, yyyy')}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  setViewingLetter(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              <div ref={viewModalRef} className="bg-white border border-gray-200 rounded-lg p-6 md:p-8" style={{paddingLeft: '0.5cm', paddingRight: '0.5cm'}}>
                <div dangerouslySetInnerHTML={{ __html: viewingLetter.content }} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
              {viewingLetter.has_pdf && (
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(viewingLetter.id, viewingLetter.donorName, viewingLetter.createdAt)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                >
                  <Download size={16} />
                  Download PDF
                </button>
              )}
              <button
                type="button"
                onClick={handlePrintSavedLetter}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Printer size={16} />
                Print
              </button>
              <button
                type="button"
                onClick={() => {
                  if (viewingLetter.formData) {
                    form.reset(viewingLetter.formData);
                    setViewModalOpen(false);
                    setViewingLetter(null);
                    setActiveTab('compose');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText size={16} />
                Edit
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewModalOpen(false);
                  setViewingLetter(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
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
