import { useEffect, useMemo, useState } from 'react';
import { Users, FileText, Plus, AlertCircle, CheckCircle2, Loader2, X, Pencil, Package, Printer, Trash2, Power } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate } from '../utils/dateFormat';
import { useAuth } from '../contexts/AuthContext';
import logo from '../../../logo.png';

type ICTTab = 'student-profile' | 'admission-form' | 'inventory';

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

function ictHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem('authToken');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

const DEFAULT_STUDENT_FORM = {
  student_name: '',
  phone: '',
  course: '',
};

const DEFAULT_INVENTORY_FORM = {
  category_id: '',
  cpu: '',
  ram: '',
  ssd: '',
  hdd: '',
  device_serial_no: '',
  quantity: '1',
  unit: '',
  location: '',
  notes: '',
  purchase_date: '',
  vendor_name: '',
  warranty_period: '',
};

const DEFAULT_CATEGORY_FORM = { name: '', prefix: '' };

const CHART_CATEGORY_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

const SPEC_CATEGORIES = ['Laptop', 'Desktop'];
const CPU_OPTIONS = ['Core i3', 'Core i5', 'Core i7', 'Core i9', 'Ryzen 3', 'Ryzen 5', 'Ryzen 7', 'Other'];
const RAM_OPTIONS = ['4GB', '8GB', '16GB', '32GB', '64GB'];
const SSD_OPTIONS = ['None', '128GB', '256GB', '512GB', '1TB'];
const HDD_OPTIONS = ['None', '500GB', '1TB', '2TB'];

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
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin');
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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ student_name: '', phone: '', course: '' });
  const [earningForm, setEarningForm] = useState({
    earning_source: '',
    amount: '',
    earning_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [studentForm, setStudentForm] = useState(DEFAULT_STUDENT_FORM);
  const [admissionForm, setAdmissionForm] = useState(DEFAULT_ADMISSION_FORM);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventoryCategories, setInventoryCategories] = useState<any[]>([]);
  const [isInventoryFormOpen, setIsInventoryFormOpen] = useState(false);
  const [isAddingInventoryItem, setIsAddingInventoryItem] = useState(false);
  const [inventoryForm, setInventoryForm] = useState(DEFAULT_INVENTORY_FORM);
  const [lastAddedInventoryItem, setLastAddedInventoryItem] = useState<any | null>(null);
  const [inventoryEditId, setInventoryEditId] = useState<number | null>(null);
  const [inventoryEditSerial, setInventoryEditSerial] = useState('');
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState('all');
  const [inventoryLocationFilter, setInventoryLocationFilter] = useState('all');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState(DEFAULT_CATEGORY_FORM);

  const selectedInventoryCategory = inventoryCategories.find(
    (c) => String(c.id) === String(inventoryForm.category_id)
  );
  const showSpecFields = SPEC_CATEGORIES.includes(selectedInventoryCategory?.name);

  const loadData = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Fetch ICT students, admissions, inventory and inventory categories from ICT backend
      const [studentsRes, admissionsRes, inventoryRes, categoriesRes] = await Promise.all([
        fetch('/api/ict/students', { headers: ictHeaders() }),
        fetch('/api/ict/admissions', { headers: ictHeaders() }),
        fetch('/api/ict/inventory', { headers: ictHeaders() }),
        fetch('/api/ict/inventory/categories', { headers: ictHeaders() }),
      ]);

      if (!studentsRes.ok) throw new Error('Failed to load students');
      if (!admissionsRes.ok) throw new Error('Failed to load admissions');
      if (!inventoryRes.ok) throw new Error('Failed to load inventory');
      if (!categoriesRes.ok) throw new Error('Failed to load inventory categories');

      const studentsJson = await studentsRes.json();
      const admissionsJson = await admissionsRes.json();
      const inventoryJson = await inventoryRes.json();
      const categoriesJson = await categoriesRes.json();

      setStudents(studentsJson.students || []);
      setAdmissions(admissionsJson.admissions || []);
      setInventoryItems(inventoryJson.items || []);
      setInventoryCategories(categoriesJson.categories || []);
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
    setIsInventoryFormOpen(false);
    setIsAddingCategory(false);
    setInventoryEditId(null);
    setSelectedInventoryIds([]);
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
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
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
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
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
    const form: any = { ...DEFAULT_ADMISSION_FORM };
    Object.keys(form).forEach((k) => {
      if (admission[k] !== null && admission[k] !== undefined) form[k] = admission[k];
    });
    setAdmissionForm(form);
    setAdmissionEditId(admission.id);
    setIsAdmissionFormOpen(true);
  };

  const handleDeleteAdmission = async (admissionId: number) => {
    if (!confirm('Delete this admission? This action cannot be undone.')) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/admissions/${admissionId}`, { method: 'DELETE', headers: ictHeaders() });
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
      const res = await fetch(`/api/ict/admissions/${admissionId}/process`, { method: 'POST', headers: ictHeaders() });
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
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
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
        fetch(`/api/ict/students/${student.id}`, { headers: ictHeaders() }),
        fetch(`/api/ict/students/${student.id}/earnings`, { headers: ictHeaders() }),
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
            .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin-bottom: 4px; }
            .value { font-size: 14px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; font-size: 13px; vertical-align: top; }
            th { background: #f8fafc; text-align: left; }
            .section { margin-bottom: 20px; }
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
                <p>${selectedStudentProfile.phone || 'N/A'}</p>
                <p>${selectedStudentProfile.course || 'N/A'}</p>
              </div>
            </div>
            <div class="content">
              <div class="info-grid">
                <div class="card">
                  <div class="label">Phone No</div>
                  <div class="value">${selectedStudentProfile.phone || 'N/A'}</div>
                </div>
                <div class="card">
                  <div class="label">Course</div>
                  <div class="value">${selectedStudentProfile.course || 'N/A'}</div>
                </div>
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
    setIsEditingProfile(false);
  };

  const openEditProfile = () => {
    if (!selectedStudentProfile) return;
    setEditProfileForm({
      student_name: selectedStudentProfile.student_name || '',
      phone: selectedStudentProfile.phone || '',
      course: selectedStudentProfile.course || '',
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentProfile) return;
    setIsSavingProfile(true);
    setError('');
    try {
      const res = await fetch(`/api/ict/students/${selectedStudentProfile.id}`, {
        method: 'PATCH',
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(editProfileForm),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const json = await res.json();
      setSelectedStudentProfile(json.student);
      setStudents((prev) =>
        prev.map((s) => (s.id === json.student.id ? { ...s, ...json.student } : s))
      );
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError((err as Error).message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddEarningStatement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStudentProfile) return;

    setIsSavingEarning(true);
    setError('');
    try {
      const res = await fetch(`/api/ict/students/${selectedStudentProfile.id}/earnings`, {
        method: 'POST',
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
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

  const handleAddInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingInventoryItem(true);
    setError('');
    setSuccess('');

    try {
      const isEditing = inventoryEditId !== null;
      const url = isEditing ? `/api/ict/inventory/${inventoryEditId}` : '/api/ict/inventory';
      const body = isEditing
        ? {
            cpu: inventoryForm.cpu,
            ram: inventoryForm.ram,
            ssd: inventoryForm.ssd,
            hdd: inventoryForm.hdd,
            device_serial_no: inventoryForm.device_serial_no,
            quantity: inventoryForm.quantity,
            unit: inventoryForm.unit,
            location: inventoryForm.location,
            notes: inventoryForm.notes,
            purchase_date: inventoryForm.purchase_date,
            vendor_name: inventoryForm.vendor_name,
            warranty_period: inventoryForm.warranty_period,
          }
        : { ...inventoryForm, category_id: Number(inventoryForm.category_id) };

      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to ${isEditing ? 'update' : 'add'} inventory item`);
      }

      const json = await res.json();
      setSuccess(isEditing ? 'Inventory item updated successfully' : 'Inventory item added successfully');
      if (!isEditing) setLastAddedInventoryItem(json.item);
      closeInventoryForm();
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to save inventory item');
    } finally {
      setIsAddingInventoryItem(false);
    }
  };

  const closeInventoryForm = () => {
    setIsInventoryFormOpen(false);
    setIsAddingCategory(false);
    setInventoryEditId(null);
    setInventoryEditSerial('');
    setInventoryForm(DEFAULT_INVENTORY_FORM);
  };

  const handleEditInventoryItem = (item: any) => {
    setError('');
    setSuccess('');
    setInventoryEditId(item.id);
    setInventoryEditSerial(item.serial_no || '');
    setInventoryForm({
      category_id: String(item.category_id || ''),
      cpu: item.cpu || '',
      ram: item.ram || '',
      ssd: item.ssd || '',
      hdd: item.hdd || '',
      device_serial_no: item.device_serial_no || '',
      quantity: item.quantity !== undefined && item.quantity !== null ? String(item.quantity) : '1',
      unit: item.unit || '',
      location: item.location || '',
      notes: item.notes || '',
      purchase_date: item.purchase_date ? new Date(item.purchase_date).toISOString().slice(0, 10) : '',
      vendor_name: item.vendor_name || '',
      warranty_period: item.warranty_period || '',
    });
    setIsAddingCategory(false);
    setIsInventoryFormOpen(true);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCategory(true);
    setError('');
    try {
      const res = await fetch('/api/ict/inventory/categories', {
        method: 'POST',
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(categoryForm),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add category');
      }

      const json = await res.json();
      setInventoryCategories((prev) => [...prev, json.category].sort((a, b) => a.name.localeCompare(b.name)));
      setInventoryForm((prev) => ({ ...prev, category_id: String(json.category.id) }));
      setCategoryForm(DEFAULT_CATEGORY_FORM);
      setIsAddingCategory(false);
    } catch (err) {
      setError((err as Error).message || 'Failed to add category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleToggleInventoryStatus = async (item: any) => {
    const nextActive = !item.is_active;
    if (!confirm(`${nextActive ? 'Enable' : 'Disable'} inventory item ${item.serial_no}?`)) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/inventory/${item.id}/status`, {
        method: 'PATCH',
        headers: ictHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ is_active: nextActive }),
      });
      if (!res.ok) throw new Error('Failed to update inventory item status');
      setSuccess(nextActive ? 'Inventory item enabled' : 'Inventory item disabled');
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to update inventory item status');
    }
  };

  const handleDeleteInventoryItem = async (itemId: number) => {
    if (!confirm('Delete this inventory item? This action cannot be undone.')) return;
    try {
      setError('');
      const res = await fetch(`/api/ict/inventory/${itemId}`, { method: 'DELETE', headers: ictHeaders() });
      if (!res.ok) throw new Error('Failed to delete inventory item');
      setSuccess('Inventory item deleted');
      if (lastAddedInventoryItem?.id === itemId) setLastAddedInventoryItem(null);
      await loadData();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete inventory item');
    }
  };

  const buildInventorySlipHtml = (item: any) => {
    const specLine = SPEC_CATEGORIES.includes(item.category_name)
      ? [item.cpu, item.ram, item.ssd, item.hdd].filter(Boolean).join(' / ')
      : '';

    return `
      <div class="slip">
        <div class="hero">
          <img src="${logo}" alt="Sombhabona logo" class="logo" />
          <div>
            <h1>${item.serial_no || ''}</h1>
            <p>${item.category_name || 'N/A'}</p>
          </div>
        </div>
        <div class="content">
          ${specLine ? `<div class="row"><span class="label">Specs</span><span class="value">${specLine}</span></div>` : ''}
          <div class="row"><span class="label">Device S/N</span><span class="value">${item.device_serial_no || 'N/A'}</span></div>
          <div class="row"><span class="label">Lab</span><span class="value">${item.location || 'N/A'}</span></div>
          <div class="row"><span class="label">Purchased</span><span class="value">${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</span></div>
          <div class="row"><span class="label">Vendor</span><span class="value">${item.vendor_name || 'N/A'}</span></div>
          <div class="row"><span class="label">Warranty</span><span class="value">${item.warranty_period || 'N/A'}</span></div>
        </div>
      </div>
    `;
  };

  const printInventorySlips = (items: any[]) => {
    if (items.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const slipsHtml = items.map((item) => buildInventorySlipHtml(item)).join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Inventory Slip${items.length > 1 ? 's' : ''}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 16px; color: #0f172a; background: #f8fafc; }
            .slips { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
            .slip { width: 240px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
            .hero { padding: 10px 12px; background: linear-gradient(135deg, #14856E 0%, #0f6b5a 100%); color: #fff; display: flex; gap: 8px; align-items: center; }
            .logo { width: 28px; height: 28px; background: rgba(255,255,255,0.12); border-radius: 6px; padding: 4px; object-fit: contain; flex-shrink: 0; }
            .hero h1 { margin: 0; font-size: 13px; }
            .hero p { margin: 1px 0 0; font-size: 10px; opacity: 0.9; }
            .content { padding: 8px 12px; }
            .row { display: flex; justify-content: space-between; gap: 6px; border-bottom: 1px dashed #e2e8f0; padding: 5px 0; font-size: 10.5px; }
            .row:last-child { border-bottom: none; }
            .label { color: #64748b; flex-shrink: 0; }
            .value { font-weight: 600; color: #0f172a; text-align: right; }
            @media print { body { background: #fff; padding: 4px; } .slip { border: 1px solid #cbd5e1; } }
          </style>
        </head>
        <body>
          <div class="slips">${slipsHtml}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
  };

  const handlePrintInventorySlip = (item: any) => printInventorySlips([item]);

  const handlePrintSelectedInventorySlips = () => {
    const items = inventoryItems.filter((item) => selectedInventoryIds.includes(item.id));
    printInventorySlips(items);
  };

  const toggleInventorySelection = (itemId: number) => {
    setSelectedInventoryIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAllInventory = () => {
    setSelectedInventoryIds((prev) =>
      prev.length === filteredInventoryItems.length ? [] : filteredInventoryItems.map((item) => item.id)
    );
  };

  const inventorySummary = useMemo(() => {
    const total = inventoryItems.length;
    const active = inventoryItems.filter((i) => i.is_active).length;
    const disabled = total - active;

    const countBy = (getKey: (item: any) => string) => {
      const map = new Map<string, number>();
      inventoryItems.forEach((item) => {
        const key = getKey(item) || 'N/A';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    };

    return {
      total,
      active,
      disabled,
      byCategory: countBy((item) => item.category_name),
      byLocation: countBy((item) => item.location),
    };
  }, [inventoryItems]);

  const categoryChartData = useMemo(() => {
    const entries = inventorySummary.byCategory;
    const maxSlots = 7;
    if (entries.length <= maxSlots) {
      return entries.map(([name, value]) => ({ name, value }));
    }
    const top = entries.slice(0, maxSlots).map(([name, value]) => ({ name, value }));
    const otherTotal = entries.slice(maxSlots).reduce((sum, [, value]) => sum + value, 0);
    return [...top, { name: 'Other', value: otherTotal }];
  }, [inventorySummary.byCategory]);

  const locationChartData = useMemo(
    () => inventorySummary.byLocation.map(([name, value]) => ({ name, value })),
    [inventorySummary.byLocation]
  );

  const inventoryLocationOptions = useMemo(
    () => inventorySummary.byLocation.map(([name]) => name),
    [inventorySummary.byLocation]
  );

  const filteredInventoryItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      if (inventoryCategoryFilter !== 'all' && String(item.category_id) !== inventoryCategoryFilter) return false;
      if (inventoryLocationFilter !== 'all' && (item.location || 'N/A') !== inventoryLocationFilter) return false;
      return true;
    });
  }, [inventoryItems, inventoryCategoryFilter, inventoryLocationFilter]);


  const handlePrintInventoryFullReport = () => {
    if (inventoryItems.length === 0) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;

    const categoryRows = inventorySummary.byCategory
      .map(([name, count]) => `<div class="row"><span class="label">${name}</span><span class="value">${count}</span></div>`)
      .join('');
    const locationRows = inventorySummary.byLocation
      .map(([name, count]) => `<div class="row"><span class="label">${name}</span><span class="value">${count}</span></div>`)
      .join('');

    const itemRows = inventoryItems
      .map((item) => {
        const specLine = SPEC_CATEGORIES.includes(item.category_name)
          ? [item.cpu, item.ram, item.ssd, item.hdd].filter(Boolean).join(' / ') || '-'
          : '-';
        return `
          <tr>
            <td>${item.serial_no || ''}</td>
            <td>${item.category_name || 'N/A'}</td>
            <td>${specLine}</td>
            <td>${item.device_serial_no || 'N/A'}</td>
            <td>${item.quantity ?? 0} ${item.unit || ''}</td>
            <td>${item.location || 'N/A'}</td>
            <td>${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : 'N/A'}</td>
            <td>${item.vendor_name || 'N/A'}</td>
            <td>${item.warranty_period || 'N/A'}</td>
            <td>${item.is_active ? 'Active' : 'Disabled'}</td>
          </tr>
        `;
      })
      .join('');

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ICT Inventory Full Report</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
            .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #14856E; padding-bottom: 12px; margin-bottom: 16px; }
            .logo { width: 48px; height: 48px; object-fit: contain; }
            h1 { margin: 0; font-size: 20px; color: #14856E; }
            .meta { margin: 2px 0 0; font-size: 12px; color: #64748b; }
            .stats { display: flex; gap: 16px; margin-bottom: 20px; }
            .stat { flex: 1; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; text-align: center; }
            .stat .num { font-size: 20px; font-weight: 700; color: #14856E; }
            .stat .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; }
            .breakdown { display: flex; gap: 20px; margin-bottom: 20px; }
            .breakdown > div { flex: 1; }
            h2 { font-size: 12px; color: #14856E; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px; }
            .row { display: flex; justify-content: space-between; border-bottom: 1px dashed #e2e8f0; padding: 4px 0; font-size: 12px; }
            .label { color: #334155; }
            .value { font-weight: 600; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; color: #475569; }
            @media print { body { padding: 8px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logo}" alt="Sombhabona logo" class="logo" />
            <div>
              <h1>ICT Inventory Full Report</h1>
              <p class="meta">Sombhabona Foundation &middot; Generated ${new Date().toLocaleString()}</p>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><div class="num">${inventorySummary.total}</div><div class="lbl">Total Items</div></div>
            <div class="stat"><div class="num">${inventorySummary.active}</div><div class="lbl">Active</div></div>
            <div class="stat"><div class="num">${inventorySummary.disabled}</div><div class="lbl">Disabled</div></div>
          </div>
          <div class="breakdown">
            <div>
              <h2>By Category</h2>
              ${categoryRows || '<p>No data.</p>'}
            </div>
            <div>
              <h2>By Lab</h2>
              ${locationRows || '<p>No data.</p>'}
            </div>
          </div>
          <h2>All Items</h2>
          <table>
            <thead>
              <tr>
                <th>Serial No</th>
                <th>Category</th>
                <th>Specs</th>
                <th>Device S/N</th>
                <th>Qty</th>
                <th>Lab</th>
                <th>Purchased</th>
                <th>Vendor</th>
                <th>Warranty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
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
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'inventory'
                ? 'border-[#14856E] text-[#14856E]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package size={18} />
            <span>Inventory</span>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Phone No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{student.student_name}</td>
                      <td className="px-6 py-4 text-gray-700">{student.phone || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">{student.course || 'N/A'}</td>
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

      {activeTab === 'inventory' && (
        <div className="rounded-lg bg-white shadow">
          <div className="flex items-center justify-between border-b border-gray-200 p-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inventory</h2>
              <p className="text-sm text-gray-600">Track ICT equipment and supplies</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {inventoryItems.length > 0 && (
                <button
                  onClick={handlePrintInventoryFullReport}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <FileText size={16} />
                  Print Full Report
                </button>
              )}
              {selectedInventoryIds.length > 0 && (
                <button
                  onClick={handlePrintSelectedInventorySlips}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#14856E] bg-white px-4 py-2.5 text-[#14856E] transition-colors hover:bg-[#14856E]/10"
                >
                  <Printer size={16} />
                  Print Selected Slips ({selectedInventoryIds.length})
                </button>
              )}
              <button
                onClick={() => {
                  setSuccess('');
                  setError('');
                  setInventoryEditId(null);
                  setInventoryEditSerial('');
                  setInventoryForm(DEFAULT_INVENTORY_FORM);
                  setIsInventoryFormOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a]"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>
          </div>

          {inventoryItems.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50/60 p-6">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Inventory Summary</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{inventorySummary.total}</p>
                    <p className="text-xs text-gray-500">Total Items</p>
                  </div>
                  <div className="rounded-lg bg-[#14856E] p-2.5">
                    <Package className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{inventorySummary.active}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                  <div className="rounded-lg bg-green-600 p-2.5">
                    <CheckCircle2 className="text-white" size={20} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{inventorySummary.disabled}</p>
                    <p className="text-xs text-gray-500">Disabled</p>
                  </div>
                  <div className="rounded-lg bg-gray-400 p-2.5">
                    <Power className="text-white" size={20} />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">By Category</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {categoryChartData.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_CATEGORY_COLORS[index % CHART_CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v, n]} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                    {categoryChartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CHART_CATEGORY_COLORS[index % CHART_CATEGORY_COLORS.length] }}
                        />
                        <span className="text-xs text-gray-600">{entry.name} ({entry.value})</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">By Lab</p>
                  <ResponsiveContainer width="100%" height={Math.max(200, locationChartData.length * 34)}>
                    <BarChart data={locationChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} width={100} />
                      <Tooltip formatter={(v: number) => [v, 'Items']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                      <Bar dataKey="value" fill="#14856E" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {lastAddedInventoryItem && (
            <div className="mx-6 mt-6 flex items-center justify-between gap-3 rounded-lg border border-[#14856E]/30 bg-[#14856E]/5 p-4">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">{lastAddedInventoryItem.serial_no}</span> was added to inventory.
              </p>
              <button
                onClick={() => handlePrintInventorySlip(lastAddedInventoryItem)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#14856E] bg-white px-3 py-1.5 text-sm font-medium text-[#14856E] hover:bg-[#14856E]/10"
              >
                <Printer size={15} />
                Print Slip
              </button>
            </div>
          )}

          {inventoryItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600" htmlFor="inventory-filter-category">Category</label>
                <select
                  id="inventory-filter-category"
                  value={inventoryCategoryFilter}
                  onChange={(e) => setInventoryCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#14856E] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {inventoryCategories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600" htmlFor="inventory-filter-location">Lab</label>
                <select
                  id="inventory-filter-location"
                  value={inventoryLocationFilter}
                  onChange={(e) => setInventoryLocationFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-[#14856E] focus:outline-none"
                >
                  <option value="all">All Labs</option>
                  {inventoryLocationOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
              {(inventoryCategoryFilter !== 'all' || inventoryLocationFilter !== 'all') && (
                <button
                  onClick={() => {
                    setInventoryCategoryFilter('all');
                    setInventoryLocationFilter('all');
                  }}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 underline"
                >
                  Clear filters
                </button>
              )}
              <span className="text-xs text-gray-400">
                Showing {filteredInventoryItems.length} of {inventoryItems.length}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 px-6 py-10 text-sm text-gray-600">
              <Loader2 size={18} className="animate-spin" />
              Loading inventory...
            </div>
          ) : filteredInventoryItems.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-500">
              {inventoryItems.length === 0 ? 'No inventory items found.' : 'No inventory items match the selected filters.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={filteredInventoryItems.length > 0 && selectedInventoryIds.length === filteredInventoryItems.length}
                        onChange={toggleSelectAllInventory}
                        className="h-4 w-4 rounded"
                        aria-label="Select all inventory items"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Serial No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Specs</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Device Serial No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Lab</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredInventoryItems.map((item) => (
                    <tr key={item.id} className={`hover:bg-gray-50 ${item.is_active ? '' : 'opacity-60'}`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedInventoryIds.includes(item.id)}
                          onChange={() => toggleInventorySelection(item.id)}
                          className="h-4 w-4 rounded"
                          aria-label={`Select ${item.serial_no}`}
                        />
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.serial_no}</td>
                      <td className="px-6 py-4 text-gray-700">{item.category_name || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700 text-xs">
                        {SPEC_CATEGORIES.includes(item.category_name)
                          ? [item.cpu, item.ram, item.ssd, item.hdd].filter(Boolean).join(' / ') || 'N/A'
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-700">{item.device_serial_no || 'N/A'}</td>
                      <td className="px-6 py-4 text-gray-700">{item.quantity} {item.unit || ''}</td>
                      <td className="px-6 py-4 text-gray-700">{item.location || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        <div className="flex gap-1.5 flex-wrap items-center">
                          <button
                            onClick={() => handleEditInventoryItem(item)}
                            title="Edit"
                            aria-label="Edit"
                            className="inline-flex items-center justify-center rounded bg-blue-50 p-1.5 text-blue-700"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handlePrintInventorySlip(item)}
                            title="Print Slip"
                            aria-label="Print Slip"
                            className="inline-flex items-center justify-center rounded bg-white border p-1.5"
                          >
                            <Printer size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleInventoryStatus(item)}
                            title={item.is_active ? 'Disable' : 'Enable'}
                            aria-label={item.is_active ? 'Disable' : 'Enable'}
                            className={`inline-flex items-center justify-center rounded p-1.5 ${
                              item.is_active ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                            }`}
                          >
                            <Power size={14} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteInventoryItem(item.id)}
                              title="Delete"
                              aria-label="Delete"
                              className="inline-flex items-center justify-center rounded bg-red-50 p-1.5 text-red-600"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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

      {isInventoryFormOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeInventoryForm} />
          <aside className="fixed inset-y-0 left-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {inventoryEditId ? `Edit Inventory Item (${inventoryEditSerial})` : 'Add Inventory Item'}
                </h3>
                <p className="text-sm text-gray-600">Fill in item details</p>
              </div>
              <button
                onClick={closeInventoryForm}
                className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close inventory form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddInventoryItem} className="space-y-4 p-5">
              {inventoryEditId ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Category</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedInventoryCategory?.name || 'N/A'} &middot; Serial No {inventoryEditSerial}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Category and serial number can't be changed after creation.</p>
                </div>
              ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="inventory-category">
                  Category *
                </label>
                <div className="flex gap-2">
                  <select
                    id="inventory-category"
                    value={inventoryForm.category_id}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, category_id: e.target.value })}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  >
                    <option value="">Select a category</option>
                    {inventoryCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory((prev) => !prev)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Plus size={15} />
                    Add
                  </button>
                </div>
                {selectedInventoryCategory && (
                  <p className="text-xs text-gray-500">
                    Serial number will be auto-generated as {selectedInventoryCategory.prefix}-##
                  </p>
                )}
              </div>
              )}

              {!inventoryEditId && isAddingCategory && (
                <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Router)"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#14856E] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Serial prefix (e.g. RTR)"
                      value={categoryForm.prefix}
                      onChange={(e) => setCategoryForm({ ...categoryForm, prefix: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#14856E] focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={isSavingCategory || !categoryForm.name || !categoryForm.prefix}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-3 py-1.5 text-sm text-white hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSavingCategory ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      Save Category
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCategory(false); setCategoryForm(DEFAULT_CATEGORY_FORM); }}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {showSpecFields && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm font-medium text-gray-700">
                    CPU
                    <select
                      value={inventoryForm.cpu}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, cpu: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    >
                      <option value="">Select CPU</option>
                      {CPU_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-gray-700">
                    RAM
                    <select
                      value={inventoryForm.ram}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, ram: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    >
                      <option value="">Select RAM</option>
                      {RAM_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-gray-700">
                    SSD
                    <select
                      value={inventoryForm.ssd}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, ssd: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    >
                      <option value="">Select SSD</option>
                      {SSD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2 text-sm font-medium text-gray-700">
                    HDD
                    <select
                      value={inventoryForm.hdd}
                      onChange={(e) => setInventoryForm({ ...inventoryForm, hdd: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    >
                      <option value="">Select HDD</option>
                      {HDD_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </label>
                </div>
              )}

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Device Body Serial No
                <input
                  type="text"
                  value={inventoryForm.device_serial_no}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, device_serial_no: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  placeholder="Manufacturer serial number printed on the device"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium text-gray-700">
                  Purchase Date
                  <input
                    type="date"
                    value={inventoryForm.purchase_date}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, purchase_date: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-gray-700">
                  Purchase Vendor Name
                  <input
                    type="text"
                    value={inventoryForm.vendor_name}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, vendor_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    placeholder="e.g. Ryans Computers"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Warranty Period
                <input
                  type="text"
                  value={inventoryForm.warranty_period}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, warranty_period: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  placeholder="e.g. 1 Year, 18 Months"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium text-gray-700">
                  Quantity
                  <input
                    type="number"
                    value={inventoryForm.quantity}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, quantity: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-gray-700">
                  Unit
                  <input
                    type="text"
                    value={inventoryForm.unit}
                    onChange={(e) => setInventoryForm({ ...inventoryForm, unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                    placeholder="e.g. pcs, boxes"
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Lab
                <input
                  type="text"
                  value={inventoryForm.location}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  placeholder="e.g. ICT Lab 1, Store Room"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Notes
                <textarea
                  value={inventoryForm.notes}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isAddingInventoryItem}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white transition-colors hover:bg-[#0f6b5a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isAddingInventoryItem ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {inventoryEditId ? 'Save Changes' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={closeInventoryForm}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </>
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
              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Student Name *
                <input
                  type="text"
                  value={studentForm.student_name}
                  onChange={(e) => setStudentForm({ ...studentForm, student_name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Phone No
                <input
                  type="tel"
                  value={studentForm.phone}
                  onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                />
              </label>

              <label className="block space-y-2 text-sm font-medium text-gray-700">
                Course
                <input
                  type="text"
                  value={studentForm.course}
                  onChange={(e) => setStudentForm({ ...studentForm, course: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                  placeholder="e.g. Web Design, Graphics, Office Applications"
                />
              </label>

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
                    onClick={openEditProfile}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Pencil size={16} />
                    Edit Profile
                  </button>
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
                              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{selectedStudentProfile.phone || 'N/A'}</span>
                              <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">{selectedStudentProfile.course || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
                          <div className="rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm ring-1 ring-white/15">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Phone No</p>
                            <p className="mt-1 font-semibold">{selectedStudentProfile.phone || 'N/A'}</p>
                          </div>
                          <div className="rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm ring-1 ring-white/15">
                            <p className="text-xs uppercase tracking-[0.18em] text-white/65">Course</p>
                            <p className="mt-1 font-semibold">{selectedStudentProfile.course || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleSaveProfile} className="space-y-4 bg-white p-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#14856E]">Edit Profile</p>
                        <label className="block space-y-1.5 text-sm font-medium text-gray-700">
                          Student Name *
                          <input
                            type="text"
                            value={editProfileForm.student_name}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, student_name: e.target.value })}
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium text-gray-700">
                          Phone No
                          <input
                            type="tel"
                            value={editProfileForm.phone}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                          />
                        </label>
                        <label className="block space-y-1.5 text-sm font-medium text-gray-700">
                          Course
                          <input
                            type="text"
                            value={editProfileForm.course}
                            onChange={(e) => setEditProfileForm({ ...editProfileForm, course: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-[#14856E] focus:outline-none focus:ring-2 focus:ring-[#14856E]/20"
                            placeholder="e.g. Web Design, Graphics, Office Applications"
                          />
                        </label>
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0f6b5a] disabled:opacity-60"
                          >
                            {isSavingProfile ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid gap-4 bg-white p-5 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone No</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.phone || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Course</p>
                          <p className="mt-1 text-sm text-gray-900">{selectedStudentProfile.course || 'N/A'}</p>
                        </div>
                      </div>
                    )}
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
