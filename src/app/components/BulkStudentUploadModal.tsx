import { useMemo, useRef, useState } from 'react';
import { Download, Loader2, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CreateStudentPayload, api } from '../services/api';

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

interface ParsedRow {
  name: string;
  class: string;
  age: number;
  bio?: string;
  photo_url?: string;
  is_sponsored?: boolean;
  is_featured?: boolean;
}

const SAMPLE_HEADERS = ['name', 'class', 'age', 'bio', 'photo_url', 'is_sponsored', 'is_featured'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', 'yes', 'y', '1', 'x'].includes(normalized);
}

function parseNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function getValue(row: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const match = Object.entries(row).find(([key]) => normalizeHeader(key) === normalizeHeader(alias));
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

function parseRow(row: Record<string, unknown>): ParsedRow | null {
  const name = String(getValue(row, ['name', 'student_name', 'student name']) ?? '').trim();
  const studentClass = String(getValue(row, ['class', 'student_class', 'student class']) ?? '').trim();
  const age = parseNumber(getValue(row, ['age', 'student_age', 'student age']));

  if (!name || !studentClass || !Number.isFinite(age) || age <= 0) {
    return null;
  }

  const bio = String(getValue(row, ['bio', 'story', 'description']) ?? '').trim();
  const photoUrl = String(getValue(row, ['photo_url', 'photo url', 'photo']) ?? '').trim();

  return {
    name,
    class: studentClass,
    age,
    bio: bio || undefined,
    photo_url: photoUrl || undefined,
    is_sponsored: parseBoolean(getValue(row, ['is_sponsored', 'sponsored', 'is sponsored'])),
    is_featured: parseBoolean(getValue(row, ['is_featured', 'featured', 'is featured'])),
  };
}

function buildSampleWorkbook() {
  const worksheet = XLSX.utils.json_to_sheet([
    {
      name: 'Amina Khatun',
      class: '8',
      age: 13,
      bio: 'Loves reading and wants to become a teacher.',
      photo_url: '',
      is_sponsored: false,
      is_featured: false,
    },
    {
      name: 'Rafi Ahmed',
      class: '5',
      age: 10,
      bio: 'Dreams of studying science and helping the community.',
      photo_url: '',
      is_sponsored: false,
      is_featured: false,
    },
  ], {
    header: SAMPLE_HEADERS,
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
  return workbook;
}

export function BulkStudentUploadModal({ isOpen, onClose, onUploaded }: BulkStudentUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<{ created: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = useMemo(() => Boolean(selectedFile) && !isUploading, [isUploading, selectedFile]);

  if (!isOpen) return null;

  const downloadSampleSheet = () => {
    const workbook = buildSampleWorkbook();
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-bulk-upload-sample.xlsx';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    setIsUploading(true);
    setSummary(null);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('The uploaded file does not contain a worksheet.');
      }

      const sheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      if (rows.length === 0) {
        throw new Error('The worksheet is empty.');
      }

      const errors: string[] = [];
      let created = 0;
      let failed = 0;

      for (const [index, row] of rows.entries()) {
        const parsed = parseRow(row);
        if (!parsed) {
          failed += 1;
          errors.push(`Row ${index + 2}: missing name, class, or a valid age.`);
          continue;
        }

        try {
          const payload: CreateStudentPayload = {
            name: parsed.name,
            class: parsed.class,
            age: parsed.age,
            bio: parsed.bio,
            photo_url: parsed.photo_url,
            is_sponsored: parsed.is_sponsored,
            is_featured: parsed.is_featured,
          };

          await api.createStudent(payload);
          created += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Row ${index + 2}: ${message}`);
        }
      }

      setSummary({ created, failed, errors });
      await onUploaded();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process the uploaded file.';
      setSummary({ created: 0, failed: 1, errors: [message] });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-200 p-5">
          <div>
            <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.18em]">Bulk upload</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">Upload students from Excel</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-xl border border-[#14856E]/20 bg-[#14856E]/5 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-2">Required columns</p>
            <p className="mb-3">
              <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">name</span>{' '}
              <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">class</span>{' '}
              <span className="font-mono text-xs bg-white border border-gray-200 rounded px-2 py-1">age</span>
            </p>
            <p className="text-sm text-gray-600">
              Optional columns: <span className="font-medium">bio</span>, <span className="font-medium">photo_url</span>, <span className="font-medium">is_sponsored</span>, <span className="font-medium">is_featured</span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={downloadSampleSheet}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download size={16} />
              Download sample Excel sheet
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14856E] px-4 py-3 text-white hover:bg-[#0f6b5a] transition-colors"
            >
              <Upload size={16} />
              {selectedFile ? 'Change file' : 'Choose Excel file'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              setSummary(null);
              setSelectedFile(e.target.files?.[0] || null);
            }}
          />

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p className="font-semibold text-gray-900 mb-1">Selected file</p>
            <p>{selectedFile ? selectedFile.name : 'No file selected yet.'}</p>
          </div>

          {summary && (
            <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 space-y-2">
              <p className="font-semibold text-gray-900">Upload result</p>
              <p>Created: {summary.created}</p>
              <p>Failed: {summary.failed}</p>
              {summary.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">Errors</p>
                  <ul className="list-disc pl-5 space-y-1 text-red-600">
                    {summary.errors.slice(0, 10).map((error, index) => (
                      <li key={`${index}-${error}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!canUpload}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14856E] px-4 py-2.5 text-white hover:bg-[#0f6b5a] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading && <Loader2 size={16} className="animate-spin" />}
              {isUploading ? 'Uploading...' : 'Upload students'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
