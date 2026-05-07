import { useEffect, useState } from 'react';
import { Heart, Users, ShieldCheck, Share2, Copy, Mail } from 'lucide-react';
import { Link } from 'react-router';
import { api, StudentApi } from '../services/api';
import { ImageWithFallback } from './ImageWithFallback';

const FEATURED_STUDENT_LIMIT = 4;

export function Home() {
  const [students, setStudents] = useState<StudentApi[]>([]);
  const sponsoredCount = students.filter((student) => student.is_sponsored).length;
  const unsponsoredCount = students.length - sponsoredCount;
  const featuredStudents = students.filter((student) => student.is_featured).slice(0, FEATURED_STUDENT_LIMIT);

  useEffect(() => {
    api.getStudents('all').then(setStudents).catch((error) => {
      console.error('Failed to load students:', error);
      setStudents([]);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5fbf9] via-white to-[#eef8f5]">
      <section className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#14856E]/10 text-[#14856E] px-4 py-2 text-sm font-semibold mb-5">
              <ShieldCheck size={16} />
              Sombhabona Foundation
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight">
              Our Students Stories
            </h1>
            <p className="mt-5 text-lg text-gray-600 max-w-2xl">
              Browse the student list, explore their stories and let them fulfill their future.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href="#students"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#14856E] px-6 py-3 text-[#14856E] font-semibold hover:bg-[#14856E]/5 transition-colors"
              >
                View Students
              </a>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
              <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm border border-white">
                <Users className="text-[#14856E]" size={22} />
                <p className="mt-3 text-2xl font-bold text-gray-900">{students.length}</p>
                <p className="text-sm text-gray-600">Students listed</p>
              </div>
              <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm border border-white">
                <Heart className="text-[#14856E]" size={22} />
                <p className="mt-3 text-2xl font-bold text-gray-900">{sponsoredCount}</p>
                <p className="text-sm text-gray-600">Sponsored</p>
              </div>
              <div className="rounded-2xl bg-white/80 backdrop-blur p-4 shadow-sm border border-white">
                <ShieldCheck className="text-[#14856E]" size={22} />
                <p className="mt-3 text-2xl font-bold text-gray-900">{unsponsoredCount}</p>
                <p className="text-sm text-gray-600">Unsponsored</p>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="rounded-[2rem] bg-white shadow-xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm font-semibold text-[#14856E] uppercase tracking-[0.2em]">Featured students</p>
                  <h2 className="text-2xl font-bold text-gray-900 mt-1">Stories that need support</h2>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-[#14856E]/10 flex items-center justify-center text-[#14856E] font-black">
                  {featuredStudents.length}
                </div>
              </div>
              <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
                {featuredStudents.map((student) => (
                  <div key={student.id} className="group rounded-2xl border border-gray-100 p-4 hover:border-[#14856E]/30 transition-colors bg-white hover:shadow-md">
                    <Link to={`/student/${student.id}`} className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                        {student.photo_url ? (
                          <ImageWithFallback src={student.photo_url} alt={student.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#14856E] to-[#0f6b5a] text-white font-bold">
                            {student.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate hover:underline">{student.name}</p>
                        <p className="text-sm text-gray-600">Class {student.class} · Age {student.age}</p>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{student.bio || 'A student profile ready for public sponsorship viewing.'}</p>
                      </div>
                    </Link>
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                      <ShareButton studentId={student.id} studentName={student.name} />
                    </div>
                  </div>
                ))}
                {featuredStudents.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-gray-500">
                    No featured students have been selected yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="students" className="max-w-7xl mx-auto px-4 pb-16 md:pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {students.map((student) => (
            <article key={student.id} className="overflow-hidden rounded-[1.75rem] bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-shadow flex flex-col">
              <Link to={`/student/${student.id}`} className="block h-56 bg-gradient-to-br from-[#14856E] to-[#0f6b5a] overflow-hidden hover:opacity-90 transition-opacity">
                {student.photo_url ? (
                  <ImageWithFallback src={student.photo_url} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-white/70">
                    <Users size={70} />
                  </div>
                )}
              </Link>
              <div className="p-6 flex-1 flex flex-col">
                <Link to={`/student/${student.id}`} className="block mb-3">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-xl font-bold text-gray-900 hover:underline">{student.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${student.is_sponsored ? 'bg-[#14856E]/10 text-[#14856E]' : 'bg-amber-100 text-amber-700'}`}>
                      {student.is_sponsored ? 'Sponsored' : 'Unsponsored'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">Class {student.class}</p>
                  <p className="text-sm text-gray-500 line-clamp-3">{student.bio || 'No story has been added yet.'}</p>
                </Link>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <ShareButton studentId={student.id} studentName={student.name} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ShareButton({ studentId, studentName }: { studentId: number; studentName: string }) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/student/${studentId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}/student/${studentId}`;
    const subject = `Support ${studentName} - Student Sponsorship`;
    const body = `Check out ${studentName}'s profile and consider sponsoring their education:\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowMenu(false);
  };

  return (
    <div className="relative inline-flex">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="inline-flex items-center gap-1 text-sm rounded-lg border border-[#14856E] text-[#14856E] px-3 py-1.5 font-semibold hover:bg-[#14856E]/5 transition-colors"
      >
        <Share2 size={16} />
        Share
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-100 overflow-hidden z-20">
          <button
            onClick={handleCopyLink}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 text-sm"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-green-600 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} className="text-gray-600" />
                <span className="text-gray-900">Copy Link</span>
              </>
            )}
          </button>
          <button
            onClick={handleShareEmail}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm"
          >
            <Mail size={16} className="text-gray-600" />
            <span className="text-gray-900">Share via Email</span>
          </button>
        </div>
      )}
    </div>
  );
}