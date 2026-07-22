import { useEffect, useState } from 'react';
import {
  Heart, Users, ShieldCheck, Share2, Copy, Mail,
  BookOpen, Sparkles, MapPin, Phone, ArrowRight,
  CheckCircle2, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router';
import { api, StudentApi } from '../services/api';
import { ImageWithFallback } from './ImageWithFallback';
import logo from '../../../logo.png';

function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

const FEATURED_LIMIT = 4;

export function Home() {
  const [students, setStudents] = useState<StudentApi[]>([]);
  const [filter, setFilter] = useState<'all' | 'sponsored' | 'unsponsored'>('all');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    api.getStudents('all').then(setStudents).catch(() => setStudents([]));
  }, []);

  const sponsored   = students.filter((s) => s.is_sponsored);
  const unsponsored = students.filter((s) => !s.is_sponsored);
  const featured    = students.filter((s) => s.is_featured).slice(0, FEATURED_LIMIT);

  const visibleStudents =
    filter === 'sponsored'   ? sponsored :
    filter === 'unsponsored' ? unsponsored :
    students;

  const cTotal      = useCountUp(students.length);
  const cSponsored  = useCountUp(sponsored.length);
  const cNeeded     = useCountUp(unsponsored.length);
  const cRate       = useCountUp(students.length ? Math.round((sponsored.length / students.length) * 100) : 0);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">

      {/* ── Navbar ── */}
      <nav className="fixed inset-x-0 top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={logo} alt="Sombhabona" className="h-9 w-auto" />
            <span className="font-black text-lg text-[#14856E] hidden sm:block tracking-tight">Sombhabona</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#mission" className="hover:text-[#14856E] transition-colors">Mission</a>
            <a href="#students" className="hover:text-[#14856E] transition-colors">Students</a>
            <a href="#how-to-help" className="hover:text-[#14856E] transition-colors">How to Help</a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#14856E] text-white text-sm font-semibold hover:bg-[#0f6b5a] transition-colors"
            >
              Staff Login
            </Link>
            <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
              <ChevronDown size={18} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-3 text-sm font-medium text-gray-700">
            <a href="#mission"    onClick={() => setMenuOpen(false)} className="hover:text-[#14856E]">Mission</a>
            <a href="#students"   onClick={() => setMenuOpen(false)} className="hover:text-[#14856E]">Students</a>
            <a href="#how-to-help" onClick={() => setMenuOpen(false)} className="hover:text-[#14856E]">How to Help</a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-16">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdf9] via-white to-[#fffbeb] pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-[#14856E]/8 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="flex flex-col lg:flex-row gap-12 lg:items-center">

            {/* Left copy */}
            <div className="flex-1 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#14856E]/10 text-[#14856E] px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-6">
                <Sparkles size={13} />
                Sombhabona Foundation · Dhaka, Bangladesh
              </div>
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-black text-gray-900 leading-[1.05] tracking-tight">
                Every Child<br />
                <span className="text-[#14856E]">Deserves</span><br />
                a Future.
              </h1>
              <p className="mt-6 text-lg text-gray-500 leading-relaxed max-w-md">
                We connect compassionate donors with underprivileged children in Mirpur, Dhaka — giving them
                the education, hope, and opportunity they deserve.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#students"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#14856E] text-white font-semibold shadow-lg shadow-[#14856E]/25 hover:bg-[#0f6b5a] transition-all hover:-translate-y-0.5"
                >
                  Meet Our Students <ArrowRight size={16} />
                </a>
                <a
                  href="#how-to-help"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-[#14856E] hover:text-[#14856E] transition-all"
                >
                  How to Help
                </a>
              </div>

              {/* Trust badges */}
              <div className="mt-10 flex flex-wrap gap-4">
                {[
                  { icon: CheckCircle2, label: 'Verified Students' },
                  { icon: Heart,        label: 'Trusted by Donors' },
                  { icon: ShieldCheck,  label: 'Transparent Records' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Icon size={15} className="text-[#14856E]" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: stat card + featured student mosaic */}
            <div className="flex-1 flex flex-col gap-5">
              {/* Stat pill row */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Students',  value: cTotal,     color: 'from-[#14856E] to-[#0d6e59]', text: 'text-white' },
                  { label: 'Sponsored', value: cSponsored, color: 'from-emerald-500 to-emerald-600', text: 'text-white' },
                  { label: 'Need Help', value: cNeeded,    color: 'from-amber-400 to-amber-500',  text: 'text-white' },
                  { label: 'Coverage',  value: `${cRate}%`, color: 'from-white to-white border border-gray-200', text: 'text-[#14856E]' },
                ].map((s) => (
                  <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-2xl p-5 shadow-sm`}>
                    <p className={`text-3xl font-black ${s.text}`}>{s.value}</p>
                    <p className={`text-sm font-medium mt-1 ${s.text === 'text-white' ? 'text-white/70' : 'text-gray-500'}`}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Featured student cards */}
              {featured.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-gray-800 uppercase tracking-widest">Featured Students</p>
                    <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2.5 py-1 rounded-full">Need Sponsor</span>
                  </div>
                  <div className="space-y-3">
                    {featured.map((s) => (
                      <Link
                        key={s.id}
                        to={`/student/${s.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#14856E]/5 transition-colors group"
                      >
                        <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#14856E] to-[#0f6b5a]">
                          {s.photo_url
                            ? <ImageWithFallback src={s.photo_url} alt={s.name} className="h-full w-full object-cover" />
                            : <div className="h-full w-full flex items-center justify-center text-white font-bold text-sm">{s.name[0]}</div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-[#14856E] transition-colors">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">Class {s.class} · Age {s.age}</p>
                        </div>
                        <ArrowRight size={14} className="text-gray-300 group-hover:text-[#14856E] flex-shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative -mb-px">
          <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 72L80 60C160 48 320 24 480 18C640 12 800 24 960 36C1120 48 1280 60 1360 66L1440 72V72H0Z" fill="#111827"/>
          </svg>
        </div>
      </section>

      {/* ── Mission ── */}
      <section id="mission" className="bg-gray-900 py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#14856E] mb-3">Our Mission</p>
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Why Sombhabona?
            </h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto text-base">
              Sombhabona means "possibility" in Bengali. We exist to turn impossible circumstances
              into possible futures — one child at a time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: 'Education First',
                desc: 'We believe education is the most powerful tool to break the cycle of poverty. Every sponsorship goes directly toward a child\'s education.',
                color: 'bg-[#14856E]',
                glow: 'shadow-[#14856E]/30',
              },
              {
                icon: Users,
                title: 'Community Rooted',
                desc: 'Based in Mirpur, Dhaka, we work directly within the communities we serve — building lasting relationships, not just transactions.',
                color: 'bg-amber-500',
                glow: 'shadow-amber-500/30',
              },
              {
                icon: Heart,
                title: 'Full Transparency',
                desc: 'Donors can see exactly which child they sponsor, track progress, and receive official acknowledgment letters for every contribution.',
                color: 'bg-rose-500',
                glow: 'shadow-rose-500/30',
              },
            ].map(({ icon: Icon, title, desc, color, glow }) => (
              <div key={title} className="bg-gray-800 rounded-2xl p-7 border border-gray-700 hover:border-gray-600 transition-colors">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl ${color} shadow-lg ${glow} mb-5`}>
                  <Icon size={22} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative mt-20 -mb-px">
          <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 0L80 12C160 24 320 48 480 54C640 60 800 48 960 36C1120 24 1280 12 1360 6L1440 0V72H0Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* ── How to Help ── */}
      <section id="how-to-help" className="bg-white py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-[#14856E] mb-3">Get Involved</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">How to Sponsor a Child</h2>
            <p className="mt-4 text-gray-500 max-w-md mx-auto text-base">Three simple steps to change a life.</p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-[#14856E] via-amber-400 to-[#14856E] opacity-20" />

            <div className="grid md:grid-cols-3 gap-8 relative z-10">
              {[
                { step: '01', title: 'Browse Students', desc: 'Explore the profiles of our students below. Each card shares their story, class, and background.', icon: Users },
                { step: '02', title: 'Choose a Child',  desc: 'Pick a student whose story resonates with you. Open their full profile to learn more about their life and dreams.', icon: Heart },
                { step: '03', title: 'Reach Out',       desc: 'Contact us via email or phone. We\'ll guide you through the sponsorship process and keep you updated monthly.', icon: CheckCircle2 },
              ].map(({ step, title, desc, icon: Icon }) => (
                <div key={step} className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#14856E] to-[#0d6e59] flex items-center justify-center shadow-xl shadow-[#14856E]/20">
                      <Icon size={28} className="text-white" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-amber-400 text-gray-900 text-xs font-black flex items-center justify-center shadow">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact CTA */}
          <div className="mt-16 bg-gradient-to-br from-[#14856E] to-[#0d6e59] rounded-3xl p-8 md:p-10 text-center text-white shadow-2xl shadow-[#14856E]/30">
            <h3 className="text-2xl font-black mb-2">Ready to make a difference?</h3>
            <p className="text-white/70 mb-6 text-sm">Our team is available to answer any questions about sponsorship.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:info@sombhabona.org" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#14856E] rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                <Mail size={15} /> info@sombhabona.org
              </a>
              <a href="tel:+8801737243447" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white border border-white/20 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors">
                <Phone size={15} /> 01737-243447
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Students Section ── */}
      <section id="students" className="bg-gray-50 py-20 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#14856E] mb-2">Student Directory</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Our Students</h2>
              <p className="mt-2 text-gray-500 text-sm">{students.length} students registered · {unsponsored.length} awaiting a sponsor</p>
            </div>
            {/* Filter tabs */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm gap-1">
              {([['all', 'All'], ['unsponsored', 'Need Sponsor'], ['sponsored', 'Sponsored']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    filter === key
                      ? 'bg-[#14856E] text-white shadow'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          {visibleStudents.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <Users size={48} className="mx-auto mb-4 opacity-40" />
              <p className="font-medium">No students to display</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {visibleStudents.map((student) => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-white pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-gray-800">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logo} alt="Sombhabona" className="h-10 w-auto" />
                <span className="font-black text-xl tracking-tight text-white">Sombhabona</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                Turning impossible circumstances into possible futures — one child at a time. Based in Mirpur, Dhaka since 2020.
              </p>
              <div className="mt-5 space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2"><MapPin size={14} className="text-[#14856E]" /> 756 West Sewrapara, Mirpur, Dhaka</div>
                <div className="flex items-center gap-2"><Phone size={14} className="text-[#14856E]" /> 01737-243447</div>
                <div className="flex items-center gap-2"><Mail size={14} className="text-[#14856E]" /> info@sombhabona.org</div>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <p className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-4">Navigate</p>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><a href="#mission"     className="hover:text-white transition-colors">Our Mission</a></li>
                <li><a href="#students"    className="hover:text-white transition-colors">Student Directory</a></li>
                <li><a href="#how-to-help" className="hover:text-white transition-colors">How to Help</a></li>
                <li><Link to="/login"      className="hover:text-white transition-colors">Staff Login</Link></li>
              </ul>
            </div>

            {/* CTA */}
            <div>
              <p className="font-bold text-sm uppercase tracking-widest text-gray-500 mb-4">Get Involved</p>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Sponsoring a child costs as little as a few hundred taka per month.
              </p>
              <a
                href="mailto:info@sombhabona.org"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14856E] text-white text-sm font-semibold hover:bg-[#0f6b5a] transition-colors"
              >
                Start Sponsoring <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} Sombhabona Foundation. All rights reserved.</p>
            <p>Made with <Heart size={11} className="inline text-rose-500" /> for the children of Mirpur</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Student Card ── */
function StudentCard({ student }: { student: StudentApi }) {
  return (
    <article className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Photo */}
      <Link to={`/student/${student.id}`} className="block relative h-52 overflow-hidden bg-gradient-to-br from-[#14856E] to-[#0d6e59] flex-shrink-0">
        {student.photo_url
          ? <ImageWithFallback src={student.photo_url} alt={student.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <div className="h-full w-full flex items-center justify-center"><Users size={56} className="text-white/30" /></div>
        }
        {/* Status badge */}
        <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full shadow ${student.is_sponsored ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-gray-900'}`}>
          {student.is_sponsored ? 'Sponsored' : 'Needs Sponsor'}
        </span>
      </Link>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <Link to={`/student/${student.id}`} className="block mb-3 group/link">
          <h3 className="text-base font-bold text-gray-900 group-hover/link:text-[#14856E] transition-colors">{student.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Class {student.class} · Age {student.age}</p>
          {student.bio && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{student.bio}</p>
          )}
        </Link>

        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
          <Link
            to={`/student/${student.id}`}
            className="text-xs font-semibold text-[#14856E] hover:underline inline-flex items-center gap-1"
          >
            View Profile <ArrowRight size={12} />
          </Link>
          <ShareButton studentId={student.id} studentName={student.name} />
        </div>
      </div>
    </article>
  );
}

/* ── Share Button ── */
function ShareButton({ studentId, studentName }: { studentId: number; studentName: string }) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen]     = useState(false);

  const url = `${window.location.origin}/student/${studentId}`;

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    const subject = `Support ${studentName} — Student Sponsorship`;
    const body    = `Check out ${studentName}'s profile and consider sponsoring their education:\n\n${url}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#14856E] border border-gray-200 hover:border-[#14856E]/40 px-3 py-1.5 rounded-lg transition-all"
      >
        <Share2 size={13} /> Share
      </button>

      {open && (
        <div className="absolute right-0 bottom-8 w-44 rounded-xl bg-white shadow-xl border border-gray-100 overflow-hidden z-20">
          <button onClick={handleCopy} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-xs border-b border-gray-100">
            {copied
              ? <><CheckCircle2 size={13} className="text-green-600" /><span className="text-green-600 font-semibold">Copied!</span></>
              : <><Copy size={13} className="text-gray-500" /><span className="text-gray-800">Copy Link</span></>
            }
          </button>
          <button onClick={handleEmail} className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-xs">
            <Mail size={13} className="text-gray-500" /><span className="text-gray-800">Email</span>
          </button>
        </div>
      )}
    </div>
  );
}
