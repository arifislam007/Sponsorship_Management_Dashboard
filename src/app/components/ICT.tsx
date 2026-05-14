import { useEffect, useMemo, useState } from 'react';
import { Users, FileText, Plus, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { formatDate } from '../utils/dateFormat';
import logo from '../../../logo.png';

type ICTTab = 'student-profile' | 'admission-form';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

const DEFAULT_STUDENT_FORM = {
  student_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: 'Male',
  father_name: '',
  mother_name: '',
  guardian_contact: '',
  skills: '',
  certifications: '',
};

const DEFAULT_ADMISSION_FORM = {
  full_name: '',
  email: '',
  phone: '',
  father_name: '',
  mother_name: '',
  guardian_name: '',
  emergency_contact: '',
  occupational_status: '',
  date_of_birth: '',
  gender: 'Male',
  marital_status: 'Single',
  nid_number: '',
  brc_number: '',

  current_address: '',
  current_district: '',
  current_police_station: '',
  current_union: '',
  current_post_office: '',
  current_post_code: '',
  current_village: '',

  permanent_address: '',
  permanent_district: '',
  permanent_police_station: '',
  permanent_union: '',
  permanent_post_office: '',
  permanent_post_code: '',
  permanent_village: '',

  religion: '',
  tribe: '',
  education: '',
  pwd: false,
  disability_type: '',

  total_family_members: '',
  source_of_income: '',
  number_of_earning_members: '',
  total_monthly_family_income: '',
  applicant_monthly_income: '',
  school_going_children: '',
  family_healthcare_source: '',
  recent_medical_visits: '',
  monthly_expenses: '',
  house_rent: '',
  monthly_meals: '',
  financial_status: '',
  has_savings: false,
  has_bank_account: false,
  social_security: false,

  training_institute: '',
  admission_date: '',
  course: '',
  batch: '',
  preferred_shift: 'Morning',
  registration_id: '',
  referral_source: '',
  prior_technical_skills: false,
  prior_skills_details: '',
  certification_status: '',
  training_duration: '',
  profile_image: '',

  dropout_status: false,
  hours_attended: '',
  dropout_reason: '',
  competency: false,
  improvement_areas: '',
  remarks: '',
  trainee_signature: '',
  office_signature: '',
};

export function ICT() {
  const [activeTab, setActiveTab] = useState<ICTTab>('student-profile');
  const [students, setStudents] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAddingAdmission, setIsAddingAdmission] = useState(false);
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [isAdmissionFormOpen, setIsAdmissionFormOpen] = useState(false);
  const [isViewingAdmission, setIsViewingAdmission] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<any | null>(null);
  const [admissionEditId, setAdmissionEditId] = useState<number | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);
  const [isViewingStudentProfile, setIsViewingStudentProfile] = useState(false);
  const [isLoadingStudentProfile, setIsLoadingStudentProfile] = useState(false);
  const [studentEarnings, setStudentEarnings] = useState<any[]>([]);
  const [isSavingEarning, setIsSavingEarning] = useState(false);
  const [earningForm, setEarningForm] = useState({
    earning_source: '',
    amount: '',
    earning_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [studentForm, setStudentForm] = useState(DEFAULT_STUDENT_FORM);
  const [admissionForm, setAdmissionForm] = useState(DEFAULT_ADMISSION_FORM);

  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch ICT students and admissions from ICT backend
      const [studentsRes, admissionsRes] = await Promise.all([
        fetch('/api/ict/students'),
        fetch('/api/ict/admissions'),
      ]);

      if (!studentsRes.ok) throw new Error('Failed to load students');
      if (!admissionsRes.ok) throw new Error('Failed to load admissions');

      const studentsJson = await studentsRes.json();
      const admissionsJson = await admissionsRes.json();

      setStudents(studentsJson.students || []);
      setAdmissions(admissionsJson.admissions || []);
    } catch {
      setError('Failed to load ICT data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setIsStudentFormOpen(false);
    setIsAdmissionFormOpen(false);
  }, [activeTab]);

  const stats = useMemo(
    () => [
      {
        title: 'Total Student Profiles',
        value: students.length.toString(),
        icon: Users,
        color: 'bg-[#14856E]',
      },
      {
        title: 'Total Admissions',
        value: admissions.length.toString(),
        icon: FileText,
        color: 'bg-blue-500',
      },
    ],
    [students.length, admissions.length]
  );

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingStudent(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/ict/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to create student');
      }

      const json = await res.json();
      setSuccess('Student profile created successfully');
      setStudentForm(DEFAULT_STUDENT_FORM);
      setIsStudentFormOpen(false);
      await loadData();
    } catch {
      setError('Failed to create student profile');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleAddAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmission(true);
    setError('');
    setSuccess('');
    try {
      const method = admissionEditId ? 'PATCH' : 'POST';
      const url = admissionEditId ? `/api/ict/admissions/${admissionEditId}` : '/api/ict/admissions';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admissionForm),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save admission');
      }

      const json = await res.json();
      setSuccess(admissionEditId ? 'Admission updated successfully' : 'Admission application submitted successfully');
      setAdmissionForm(DEFAULT_ADMISSION_FORM);
      setAdmissionEditId(null);
      setIsAdmissionFormOpen(false);
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to submit admission form');
    } finally {
      setIsAddingAdmission(false);
    }
  };

  const handleViewAdmission = (admission: any) => {
    setSelectedAdmission(admission);
    setIsViewingAdmission(true);
  };

  const handleCloseView = () => {
    setSelectedAdmission(null);
    setIsViewingAdmission(false);
  };

  const handleEditAdmission = (admission: any) => {
    // populate form with admission data (map known keys)
    const form: any = { ...DEFAULT_ADMISSION_FORM };
    Object.keys(form).forEach((k) => {
      if (admission[k] !== undefined) form[k] = admission[k];
    });
    // also map some extended fields if present
    form.full_name = admission.full_name || admission.full_name;
    setAdmissionForm({ ...form, ...(admission || {}) });
    setAdmissionEditId(admission.id);
    setIsAdmissionFormOpen(true);
  };

  const handleDeleteAdmission = async (admissionId: number) => {
    if (!confirm('Delete this admission? This action cannot be undone.')) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/admissions/${admissionId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete admission');
      setSuccess('Admission deleted');
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete admission');
    }
  };

  const handleProcessAdmission = async (admissionId: number) => {
    if (!confirm('Process this admission into a student profile?')) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/admissions/${admissionId}/process`, { method: 'POST' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to process admission');
      }
      const json = await res.json();
      setSuccess('Admission processed into student profile');
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to process admission');
    }
  };

  const handleChangeAdmissionStatus = async (admissionId: number, newStatus: 'pending' | 'approved' | 'rejected') => {
    if (!confirm(`Change admission status to ${newStatus}?`)) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/admissions/${admissionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admission_status: newStatus, admission_notes: '' }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to change admission status');
      }
      setSuccess(`Admission status changed to ${newStatus}`);
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to change admission status');
    }
  };

  const handleAdmissionPhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setAdmissionForm({ ...admissionForm, profile_image: dataUrl });
    } catch (err) {
      setError((err as Error).message || 'Failed to load image');
    }
  };

  const openStudentProfile = async (student: any) => {
    setError('');
    setSelectedStudentProfile(student);
    setStudentEarnings([]);
    setIsViewingStudentProfile(true);
    setIsLoadingStudentProfile(true);

    try {
      const [studentRes, earningsRes] = await Promise.all([
        fetch(`/api/ict/students/${student.id}`),
        fetch(`/api/ict/students/${student.id}/earnings`),
      ]);

      if (!studentRes.ok) throw new Error('Failed to load student profile');
      if (!earningsRes.ok) throw new Error('Failed to load earning statements');

      const studentJson = await studentRes.json();
      const earningsJson = await earningsRes.json();
      setSelectedStudentProfile(studentJson.student || student);
      setStudentEarnings(earningsJson.earnings || []);
      setEarningForm({
        earning_source: '',
        amount: '',
        earning_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to load student profile');
    } finally {
      setIsLoadingStudentProfile(false);
    }
  };

  const handlePrintStudentProfile = () => {
    if (!selectedStudentProfile) return;

    const displayName = selectedStudentProfile.student_name || selectedStudentProfile.full_name || 'Student';
    
    // Only include specified fields in print
    const fieldsToShow = ['father_name', 'mother_name', 'education_level', 'course'];
    const admissionFields = Object.entries(selectedStudentProfile.admission_data || {})
      .filter(([key]) => fieldsToShow.includes(key))
      .map(([key, value]) => {
        const fieldLabels: Record<string, string> = {
          'father_name': 'Father',
          'mother_name': 'Mother',
          'education_level': 'Education',
          'course': 'Course',
        };
        const label = fieldLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
        const displayValue =
          typeof value === 'boolean'
            ? value
              ? 'Yes'
              : 'No'
            : value === null || value === undefined || value === ''
              ? 'N/A'
              : String(value);
        return `<tr><td>${label}</td><td>${displayValue}</td></tr>`;
      })
      .join('');

    const earningRows = studentEarnings
      .map(
        (earning) => `
          <tr>
            <td>${earning.earning_date || ''}</td>
            <td>${earning.earning_source || ''}</td>
            <td>৳${Number(earning.amount || 0).toLocaleString()}</td>
            <td>${earning.notes || ''}</td>
          </tr>
        `
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${displayName} - Profile</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 24px; color: #0f172a; background: #f8fafc; }
            .sheet { max-width: 1000px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; }
            .hero { padding: 24px; background: linear-gradient(135deg, #14856E 0%, #0f6b5a 100%); color: #fff; display: flex; gap: 20px; align-items: center; }
            .logo { width: 84px; height: 84px; background: rgba(255,255,255,0.12); border-radius: 18px; padding: 10px; object-fit: contain; }
            .photo { width: 120px; height: 120px; border-radius: 18px; object-fit: cover; border: 4px solid rgba(255,255,255,0.35); background: rgba(255,255,255,0.12); }
            .meta { display: grid; gap: 4px; }
            .meta h1 { margin: 0; font-size: 30px; }
            .meta p { margin: 0; opacity: 0.92; }
            .content { padding: 24px; }
            h2 { margin: 0 0 12px; font-size: 16px; color: #14856E; text-transform: uppercase; letter-spacing: 0.14em; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
            .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; background: #fff; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 14px; color: #0f172a; white-space: pre-wrap; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; font-size: 13px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
            .section { margin-bottom: 20px; }
            .full { grid-column: 1 / -1; }
            @media print { body { background: #fff; padding: 0; } .sheet { border: none; border-radius: 0; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="hero">
              <img src="${logo}" alt="Sombhabona logo" class="logo" />
              ${selectedStudentProfile.profile_image ? `<img src="${selectedStudentProfile.profile_image}" alt="${displayName}" class="photo" />` : '<div class="photo"></div>'}
              <div class="meta">
                <h1>${displayName}</h1>
                <p>${selectedStudentProfile.email || 'N/A'}</p>
                <p>${selectedStudentProfile.phone || ''}</p>
              </div>
            </div>
            <div class="content">
              <div class="section">
                <h2>Personal Information</h2>
                <table>
                  <tbody>${admissionFields}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Earning Statements</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Source</th>
                      <th>Amount</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${earningRows || '<tr><td colspan="4">No earning statements available.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const closeStudentProfile = () => {
    setIsViewingStudentProfile(false);
    setSelectedStudentProfile(null);
    setStudentEarnings([]);
  };

  const handleAddEarningStatement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudentProfile) return;

    setIsSavingEarning(true);
    setError('');
    try {
      const res = await fetch(`/api/ict/students/${selectedStudentProfile.id}/earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(earningForm),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save earning statement');
      }

      const json = await res.json();
      setStudentEarnings((current) => [json.earning, ...current]);
      setEarningForm({
        earning_source: '',
        amount: '',
        earning_date: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setSuccess('Earning statement added successfully');
    } catch (err) {
      setError((err as Error).message || 'Failed to save earning statement');
    } finally {
      setIsSavingEarning(false);
    }
  };

  const handlePrintAdmission = (admission: any) => {
    const sections = [
      { title: 'Basic Applicant Information', keys: ['full_name','father_name','mother_name','guardian_name','emergency_contact','occupational_status','date_of_birth','gender','marital_status','nid_number','brc_number'] },
      { title: 'Contact Details (Current)', keys: ['current_address','current_district','current_police_station','current_union','current_post_office','current_post_code','current_village'] },
      { title: 'Contact Details (Permanent)', keys: ['permanent_address','permanent_district','permanent_police_station','permanent_union','permanent_post_office','permanent_post_code','permanent_village'] },
      { title: 'Educational & Personal Profile', keys: ['religion','tribe','education','pwd','disability_type'] },
      { title: 'Socio-Economic Information', keys: ['total_family_members','source_of_income','number_of_earning_members','total_monthly_family_income','applicant_monthly_income','school_going_children','family_healthcare_source','recent_medical_visits','monthly_expenses','house_rent','monthly_meals','financial_status','has_savings','has_bank_account','social_security'] },
      { title: 'Admission & Training Info', keys: ['training_institute','admission_date','course','batch','preferred_shift','registration_id','referral_source','prior_technical_skills','prior_skills_details','certification_status','training_duration'] },
      { title: 'Official Use & Sign-off', keys: ['dropout_status','hours_attended','dropout_reason','competency','improvement_areas','remarks','trainee_signature','office_signature'] }
    ];

    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Admission - ${admission.full_name}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h1{color:#14856E}h2{border-bottom:1px solid #eee;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:12px}td{padding:6px;border:1px solid #f0f0f0;vertical-align:top}</style></head><body>`;
    html += `<h1>Admission Form - ${admission.full_name}</h1>`;
    sections.forEach((s) => {
      html += `<h2>${s.title}</h2><table>`;
      s.keys.forEach((k) => {
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        const value = admission[k] === null || admission[k] === undefined ? '' : String(admission[k]);
        html += `<tr><td style="width:35%;font-weight:600">${label}</td><td>${value}</td></tr>`;
      });
      html += `</table>`;
    });
    html += `</body></html>`;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      // Give browser a moment to render then print
      setTimeout(() => w.print(), 300);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">ICT Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage ICT student profiles and admission forms</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={18} className="flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {stats.map((stat) => (
          <div key={stat.title} className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4 md:gap-8">
          <button
            onClick={() => setActiveTab('student-profile')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'student-profile'
                ? 'border-[#14856E] text-[#14856E]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users size={18} />
            <span>Student Profiles</span>
          </button>
          <button
            onClick={() => setActiveTab('admission-form')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'admission-form'
                ? 'border-[#14856E] text-[#14856E]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText size={18} />
            <span>Admission Forms</span>
          </button>
        </div>
      </div>

      {activeTab === 'student-profile' && (
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Student Profiles</h2>
              <p className="text-sm text-gray-600">View and manage all ICT student profiles</p>
            </div>
            <button
              onClick={() => {
                setSuccess('');
                setError('');
                setIsStudentFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a]"
            >
              <Plus size={16} />
              Create Student Profile
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-gray-600">
              <Loader2 size={18} className="animate-spin" />
              Loading student profiles...
            </div>
          ) : students.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No student profiles found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{student.student_name}</td>
                      <td className="px-6 py-4 text-gray-700">{student.email}</td>
                      <td className="px-6 py-4 text-gray-700">{student.phone || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">{student.gender || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">
                        <button
                          onClick={() => openStudentProfile(student)}
                          className="rounded bg-[#14856E] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#0f6b5a]"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admission-form' && (
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Admission Applications
              </h2>
              <p className="text-sm text-gray-600">View all admission applications</p>
            </div>
            <button
              onClick={() => {
                setSuccess('');
                setError('');
                setIsAdmissionFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a]"
            >
              <Plus size={16} />
              Create Admission Form
            </button>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-gray-600">
              <Loader2 size={18} className="animate-spin" />
              Loading admission applications...
            </div>
          ) : admissions.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">No admission applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {admissions.map((admission) => (
                    <tr key={admission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{admission.full_name}</td>
                      <td className="px-6 py-4 text-gray-700">{admission.email}</td>
                      <td className="px-6 py-4 text-gray-700">{admission.course || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            admission.admission_status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : admission.admission_status === 'rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {admission.admission_status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="flex gap-2 flex-wrap items-center">
                          <button onClick={() => handleViewAdmission(admission)} className="rounded px-2 py-1 bg-gray-100 text-xs">View</button>
                          <button onClick={() => handleEditAdmission(admission)} className="rounded px-2 py-1 bg-blue-50 text-xs">Edit</button>
                          <select 
                            onChange={(e) => handleChangeAdmissionStatus(admission.id, e.target.value as any)} 
                            defaultValue={admission.admission_status || 'pending'} 
                            className="rounded px-2 py-1 border border-gray-300 text-xs"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button onClick={() => handleDeleteAdmission(admission.id)} className="rounded px-2 py-1 bg-red-50 text-xs">Delete</button>
                          <button onClick={() => handleProcessAdmission(admission.id)} className="rounded px-2 py-1 bg-green-50 text-xs">Process</button>
                          <button onClick={() => handlePrintAdmission(admission)} className="rounded px-2 py-1 bg-white border text-xs">Print</button>
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

      {isStudentFormOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsStudentFormOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Student Profile</h3>
                <p className="text-sm text-gray-600">Fill in student profile details</p>
              </div>
              <button
                onClick={() => setIsStudentFormOpen(false)}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close student form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Student Name *
                  <input
                    type="text"
                    value={studentForm.student_name}
                    onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Email *
                  <input
                    type="email"
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Phone
                  <input
                    type="tel"
                    value={studentForm.phone}
                    onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Date of Birth
                  <input
                    type="date"
                    value={studentForm.date_of_birth}
                    onChange={(e) => setStudentForm({ ...studentForm, date_of_birth: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Gender
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Father's Name
                  <input
                    type="text"
                    value={studentForm.father_name}
                    onChange={(e) => setStudentForm({ ...studentForm, father_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Mother's Name
                  <input
                    type="text"
                    value={studentForm.mother_name}
                    onChange={(e) => setStudentForm({ ...studentForm, mother_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Guardian Contact
                  <input
                    type="tel"
                    value={studentForm.guardian_contact}
                    onChange={(e) => setStudentForm({ ...studentForm, guardian_contact: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Skills
                  <textarea
                    value={studentForm.skills}
                    onChange={(e) => setStudentForm({ ...studentForm, skills: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    placeholder="List technical skills"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Certifications
                  <textarea
                    value={studentForm.certifications}
                    onChange={(e) => setStudentForm({ ...studentForm, certifications: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    placeholder="List certifications held"
                  />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingStudent ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Create Student Profile
                </button>
                <button
                  type="button"
                  onClick={() => setIsStudentFormOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {isAdmissionFormOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsAdmissionFormOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create Admission Form</h3>
                <p className="text-sm text-gray-600">Fill in admission application details</p>
              </div>
              <button
                onClick={() => setIsAdmissionFormOpen(false)}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close admission form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddAdmission} className="space-y-4 p-5">
              <h4 className="text-sm font-semibold">Section 1: Basic Applicant Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Applicant's Full Name *
                  <input type="text" value={admissionForm.full_name} onChange={(e) => setAdmissionForm({ ...admissionForm, full_name: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Email *
                  <input type="email" value={admissionForm.email} onChange={(e) => setAdmissionForm({ ...admissionForm, email: e.target.value })} required className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Father's Name
                  <input type="text" value={admissionForm.father_name} onChange={(e) => setAdmissionForm({ ...admissionForm, father_name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr,180px] items-start">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Photo upload or camera capture
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleAdmissionPhotoChange}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]"
                  />
                  <span className="block text-xs text-gray-500">Upload a photo or use the device camera when available.</span>
                </label>
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-3">
                  {admissionForm.profile_image ? (
                    <img src={admissionForm.profile_image} alt="Admission preview" className="h-36 w-full rounded-xl object-cover" />
                  ) : (
                    <div className="text-center text-xs text-gray-500">
                      <p className="font-medium text-gray-700">No photo selected</p>
                      <p>Preview appears here.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Mother's Name
                  <input type="text" value={admissionForm.mother_name} onChange={(e) => setAdmissionForm({ ...admissionForm, mother_name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Guardian's Name
                  <input type="text" value={admissionForm.guardian_name} onChange={(e) => setAdmissionForm({ ...admissionForm, guardian_name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Emergency Contact Number
                  <input type="tel" value={admissionForm.emergency_contact} onChange={(e) => setAdmissionForm({ ...admissionForm, emergency_contact: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Occupational Status
                  <select value={admissionForm.occupational_status} onChange={(e) => setAdmissionForm({ ...admissionForm, occupational_status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]">
                    <option value="Dropout Student">Dropout Student</option>
                    <option value="Business">Business</option>
                    <option value="Job">Job</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Housewife">Housewife</option>
                    <option value="Returning from abroad">Returning from abroad</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Date of Birth
                  <input type="date" value={admissionForm.date_of_birth} onChange={(e) => setAdmissionForm({ ...admissionForm, date_of_birth: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Gender
                  <select value={admissionForm.gender} onChange={(e) => setAdmissionForm({ ...admissionForm, gender: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Marital Status
                  <select value={admissionForm.marital_status} onChange={(e) => setAdmissionForm({ ...admissionForm, marital_status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]">
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widow">Widow</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Separated">Separated</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  National ID (NID)
                  <input type="text" value={admissionForm.nid_number} onChange={(e) => setAdmissionForm({ ...admissionForm, nid_number: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
              </div>

              <div>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Birth Registration Certificate (BRC) Number
                  <input type="text" value={admissionForm.brc_number} onChange={(e) => setAdmissionForm({ ...admissionForm, brc_number: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
              </div>

              <h4 className="text-sm font-semibold pt-4">Section 2: Contact Details</h4>
              <div className="grid gap-4">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Current Address
                  <textarea value={admissionForm.current_address} onChange={(e) => setAdmissionForm({ ...admissionForm, current_address: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E]" />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="District" value={admissionForm.current_district} onChange={(e) => setAdmissionForm({ ...admissionForm, current_district: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Police Station/Upazila" value={admissionForm.current_police_station} onChange={(e) => setAdmissionForm({ ...admissionForm, current_police_station: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Union/Ward" value={admissionForm.current_union} onChange={(e) => setAdmissionForm({ ...admissionForm, current_union: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Post Office & Post Code" value={admissionForm.current_post_office} onChange={(e) => setAdmissionForm({ ...admissionForm, current_post_office: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div>
                <input type="text" placeholder="Village/House/Holding No." value={admissionForm.current_village} onChange={(e) => setAdmissionForm({ ...admissionForm, current_village: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <div className="pt-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">Permanent Address</label>
                <textarea value={admissionForm.permanent_address} onChange={(e) => setAdmissionForm({ ...admissionForm, permanent_address: e.target.value })} rows={2} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="District" value={admissionForm.permanent_district} onChange={(e) => setAdmissionForm({ ...admissionForm, permanent_district: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Police Station/Upazila" value={admissionForm.permanent_police_station} onChange={(e) => setAdmissionForm({ ...admissionForm, permanent_police_station: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Union/Ward" value={admissionForm.permanent_union} onChange={(e) => setAdmissionForm({ ...admissionForm, permanent_union: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Post Office & Post Code" value={admissionForm.permanent_post_office} onChange={(e) => setAdmissionForm({ ...admissionForm, permanent_post_office: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <h4 className="text-sm font-semibold pt-4">Section 3: Educational & Personal Profile</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Religion" value={admissionForm.religion} onChange={(e) => setAdmissionForm({ ...admissionForm, religion: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Tribe/Community" value={admissionForm.tribe} onChange={(e) => setAdmissionForm({ ...admissionForm, tribe: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Educational Qualifications" value={admissionForm.education} onChange={(e) => setAdmissionForm({ ...admissionForm, education: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.pwd} onChange={(e) => setAdmissionForm({ ...admissionForm, pwd: e.target.checked })} /> Person with Disability (PWD)</label>
              </div>
              {admissionForm.pwd && (
                <div>
                  <select value={admissionForm.disability_type} onChange={(e) => setAdmissionForm({ ...admissionForm, disability_type: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5">
                    <option value="">Select disability type</option>
                    <option value="Visual">Visual</option>
                    <option value="Speech">Speech</option>
                    <option value="Mental">Mental</option>
                    <option value="Intellectual">Intellectual</option>
                    <option value="Physical">Physical</option>
                  </select>
                </div>
              )}

              <h4 className="text-sm font-semibold pt-4">Section 4: Socio-Economic Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" placeholder="Total Family Members" value={admissionForm.total_family_members} onChange={(e) => setAdmissionForm({ ...admissionForm, total_family_members: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Source of Household Income" value={admissionForm.source_of_income} onChange={(e) => setAdmissionForm({ ...admissionForm, source_of_income: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" placeholder="Number of Earning Members" value={admissionForm.number_of_earning_members} onChange={(e) => setAdmissionForm({ ...admissionForm, number_of_earning_members: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="number" placeholder="Total Monthly Family Income" value={admissionForm.total_monthly_family_income} onChange={(e) => setAdmissionForm({ ...admissionForm, total_monthly_family_income: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" placeholder="Applicant's Monthly Income" value={admissionForm.applicant_monthly_income} onChange={(e) => setAdmissionForm({ ...admissionForm, applicant_monthly_income: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="number" placeholder="Number of School-going Children" value={admissionForm.school_going_children} onChange={(e) => setAdmissionForm({ ...admissionForm, school_going_children: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Family Health Care Source" value={admissionForm.family_healthcare_source} onChange={(e) => setAdmissionForm({ ...admissionForm, family_healthcare_source: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="number" placeholder="Recent Medical Visits" value={admissionForm.recent_medical_visits} onChange={(e) => setAdmissionForm({ ...admissionForm, recent_medical_visits: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" placeholder="Monthly Expenses" value={admissionForm.monthly_expenses} onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_expenses: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="number" placeholder="House Rent" value={admissionForm.house_rent} onChange={(e) => setAdmissionForm({ ...admissionForm, house_rent: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="number" placeholder="Monthly Meals" value={admissionForm.monthly_meals} onChange={(e) => setAdmissionForm({ ...admissionForm, monthly_meals: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Financial Status" value={admissionForm.financial_status} onChange={(e) => setAdmissionForm({ ...admissionForm, financial_status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.has_savings} onChange={(e) => setAdmissionForm({ ...admissionForm, has_savings: e.target.checked })} /> Do you have savings?</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.has_bank_account} onChange={(e) => setAdmissionForm({ ...admissionForm, has_bank_account: e.target.checked })} /> Bank/Mobile Money account?</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.social_security} onChange={(e) => setAdmissionForm({ ...admissionForm, social_security: e.target.checked })} /> Social Security participation?</label>
              </div>

              <h4 className="text-sm font-semibold pt-4">Section 5: Admission & Training Info</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Training Institute Name" value={admissionForm.training_institute} onChange={(e) => setAdmissionForm({ ...admissionForm, training_institute: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="date" placeholder="Date of Admission" value={admissionForm.admission_date} onChange={(e) => setAdmissionForm({ ...admissionForm, admission_date: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Selected Trade/Course Name" value={admissionForm.course} onChange={(e) => setAdmissionForm({ ...admissionForm, course: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Batch Number" value={admissionForm.batch} onChange={(e) => setAdmissionForm({ ...admissionForm, batch: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select value={admissionForm.preferred_shift} onChange={(e) => setAdmissionForm({ ...admissionForm, preferred_shift: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5">
                  <option value="Morning">Morning</option>
                  <option value="Day">Day</option>
                </select>
                <input type="text" placeholder="Registration/Trainee ID Number" value={admissionForm.registration_id} onChange={(e) => setAdmissionForm({ ...admissionForm, registration_id: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4">
                <input type="text" placeholder="Referral Source" value={admissionForm.referral_source} onChange={(e) => setAdmissionForm({ ...admissionForm, referral_source: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.prior_technical_skills} onChange={(e) => setAdmissionForm({ ...admissionForm, prior_technical_skills: e.target.checked })} /> Prior Technical Skills</label>
                <input type="text" placeholder="If yes, specify trade" value={admissionForm.prior_skills_details} onChange={(e) => setAdmissionForm({ ...admissionForm, prior_skills_details: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Certification Status" value={admissionForm.certification_status} onChange={(e) => setAdmissionForm({ ...admissionForm, certification_status: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Training Duration" value={admissionForm.training_duration} onChange={(e) => setAdmissionForm({ ...admissionForm, training_duration: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <h4 className="text-sm font-semibold pt-4">Section 6: Official Use & Sign-off</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.dropout_status} onChange={(e) => setAdmissionForm({ ...admissionForm, dropout_status: e.target.checked })} /> Dropout Status</label>
                <input type="number" placeholder="Hours attended" value={admissionForm.hours_attended} onChange={(e) => setAdmissionForm({ ...admissionForm, hours_attended: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={!!admissionForm.competency} onChange={(e) => setAdmissionForm({ ...admissionForm, competency: e.target.checked })} /> Competency Achievement</label>
                <input type="text" placeholder="Improvement Areas" value={admissionForm.improvement_areas} onChange={(e) => setAdmissionForm({ ...admissionForm, improvement_areas: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div>
                <textarea placeholder="Remarks" value={admissionForm.remarks} onChange={(e) => setAdmissionForm({ ...admissionForm, remarks: e.target.value })} rows={3} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="text" placeholder="Trainee Signature" value={admissionForm.trainee_signature} onChange={(e) => setAdmissionForm({ ...admissionForm, trainee_signature: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
                <input type="text" placeholder="Office/Trainer Signature" value={admissionForm.office_signature} onChange={(e) => setAdmissionForm({ ...admissionForm, office_signature: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-2.5" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAddingAdmission}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingAdmission ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  {admissionEditId ? 'Update Admission' : 'Submit Admission Form'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdmissionFormOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </>
      )}

      {isViewingStudentProfile && selectedStudentProfile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeStudentProfile} />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-6xl overflow-y-auto bg-gradient-to-b from-[#f8fbfa] via-white to-[#eef8f5] shadow-2xl">
            <div className="sticky top-0 z-10 border-b border-white/70 bg-white/90 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-[#14856E]/10 p-2 shadow-sm ring-1 ring-[#14856E]/10">
                    <img src={logo} alt="Sombhabona" className="h-full w-full object-contain" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#14856E]">Student Profile</p>
                    <h3 className="text-base font-bold text-gray-900 sm:text-lg">
                      {selectedStudentProfile.student_name || selectedStudentProfile.full_name || 'Student'}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintStudentProfile}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#14856E] bg-white px-3 py-2 text-sm font-semibold text-[#14856E] transition-colors hover:bg-[#14856E]/5"
                  >
                    <FileText size={16} />
                    Print Profile
                  </button>
                  <button
                    onClick={closeStudentProfile}
                    className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                    aria-label="Close student profile"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {isLoadingStudentProfile ? (
              <div className="flex items-center gap-2 px-6 py-10 text-sm text-gray-600">
                <Loader2 size={18} className="animate-spin" />
                Loading student profile...
              </div>
            ) : (
              <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr,0.9fr]">
                <section className="space-y-6">
                  <div className="overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                    <div className="relative min-h-72 bg-gradient-to-br from-[#14856E] via-[#0f6b5a] to-[#094437] p-5 sm:p-6">
                      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.65) 1px, transparent 0)', backgroundSize: '18px 18px' }} />
                      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-center gap-4 sm:gap-5">
                          <div className="h-24 w-24 overflow-hidden rounded-3xl border-4 border-white/20 bg-white/10 shadow-xl sm:h-28 sm:w-28">
                            {selectedStudentProfile.profile_image ? (
                              <img
                                src={selectedStudentProfile.profile_image}
                                alt={selectedStudentProfile.student_name || 'Student'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-4xl font-black text-white/35">
                                {(selectedStudentProfile.student_name || selectedStudentProfile.full_name || 'S').charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 text-white">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/75">Student Record</p>
                            <h4 className="text-2xl font-black leading-tight sm:text-4xl">
                              {selectedStudentProfile.student_name || selectedStudentProfile.full_name || 'Student'}
                            </h4>
                            <div className="flex flex-wrap gap-2 pt-2 text-sm text-white/90">
                              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{selectedStudentProfile.gender || 'N/A'}</span>
                              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{selectedStudentProfile.date_of_birth || 'N/A'}</span>
                              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{selectedStudentProfile.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
                          <div className="rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm ring-1 ring-white/15">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Phone</p>
                            <p className="mt-1 font-semibold">{selectedStudentProfile.phone || 'N/A'}</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm ring-1 ring-white/15">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Admissions</p>
                            <p className="mt-1 font-semibold">{Object.keys(selectedStudentProfile.admission_data || {}).length} fields</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 bg-white p-5 sm:grid-cols-2">
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.email || 'N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.phone || 'N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gender</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.gender || 'N/A'}</p>
                      </div>
                      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date of Birth</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.date_of_birth || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Admission Snapshot</p>
                        <h4 className="text-lg font-bold text-gray-900">All transferred admission data</h4>
                      </div>
                      <span className="rounded-full bg-[#14856E]/10 px-3 py-1 text-xs font-semibold text-[#14856E]">
                        {Object.keys(selectedStudentProfile.admission_data || {}).length} fields
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {Object.entries(selectedStudentProfile.admission_data || {})
                        .filter(([key]) => !['id', 'student_id', 'created_at', 'updated_at', 'profile_image'].includes(key))
                        .map(([key, value]) => (
                          <div key={key} className={key === 'remarks' || key === 'admission_notes' ? 'sm:col-span-2' : ''}>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
                              {typeof value === 'boolean'
                                ? (value ? 'Yes' : 'No')
                                : value === null || value === undefined || value === ''
                                  ? 'N/A'
                                  : String(value)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Earning Statement</p>
                      <h4 className="text-lg font-bold text-gray-900">Add income source, amount, and date</h4>
                    </div>

                    <form onSubmit={handleAddEarningStatement} className="space-y-4">
                      <label className="block space-y-2 text-sm font-medium text-gray-700">
                        Earning Source
                        <input
                          type="text"
                          value={earningForm.earning_source}
                          onChange={(e) => setEarningForm({ ...earningForm, earning_source: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                          placeholder="Business, wage, farming, etc."
                          required
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block space-y-2 text-sm font-medium text-gray-700">
                          Amount
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={earningForm.amount}
                            onChange={(e) => setEarningForm({ ...earningForm, amount: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                            placeholder="0.00"
                            required
                          />
                        </label>
                        <label className="block space-y-2 text-sm font-medium text-gray-700">
                          Date
                          <input
                            type="date"
                            value={earningForm.earning_date}
                            onChange={(e) => setEarningForm({ ...earningForm, earning_date: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                            required
                          />
                        </label>
                      </div>
                      <label className="block space-y-2 text-sm font-medium text-gray-700">
                        Notes
                        <textarea
                          value={earningForm.notes}
                          onChange={(e) => setEarningForm({ ...earningForm, notes: e.target.value })}
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                          placeholder="Optional notes about the income source"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={isSavingEarning}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingEarning ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        Save Earning Statement
                      </button>
                    </form>
                  </div>

                  <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Earning History</p>
                      <h4 className="text-lg font-bold text-gray-900">Previous statements</h4>
                    </div>

                    {studentEarnings.length === 0 ? (
                      <p className="text-sm text-gray-500">No earning statements have been added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentEarnings.map((earning) => (
                          <div key={earning.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">{earning.earning_source}</p>
                                <p className="text-sm text-gray-600">{formatDate(earning.earning_date)}</p>
                              </div>
                              <p className="font-bold text-[#14856E]">৳{Number(earning.amount || 0).toLocaleString()}</p>
                            </div>
                            {earning.notes && <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{earning.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}
          </aside>
        </>
      )}

      {isViewingAdmission && selectedAdmission && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={handleCloseView} />
          <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Admission - {selectedAdmission.full_name}</h3>
                <p className="text-sm text-gray-600">Submitted: {new Date(selectedAdmission.created_at).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintAdmission(selectedAdmission)} className="rounded bg-white border px-3 py-1">Print</button>
                <button onClick={handleCloseView} className="rounded bg-gray-50 border px-3 py-1">Close</button>
              </div>
            </div>

            <div className="mt-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{JSON.stringify(selectedAdmission, null, 2)}</pre>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
