import { useEffect, useState } from 'react';
import { Users, Heart, TrendingUp, DollarSign, Activity, Award, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format } from 'date-fns';
import { api, DashboardSummary, DonationTrendPoint, DashboardAnalytics } from '../services/api';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [donationTrendData, setDonationTrendData] = useState<DonationTrendPoint[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);

  useEffect(() => {
    Promise.all([
      api.getDashboardSummary(),
      api.getDonationTrend(),
      api.getDashboardAnalytics(),
    ])
      .then(([summaryData, trendData, analyticsData]) => {
        setSummary(summaryData);
        setDonationTrendData(trendData);
        setAnalytics(analyticsData);
      })
      .catch((error) => {
        console.error('Failed to load dashboard data:', error);
      });
  }, []);

  const sponsoredCount = summary?.sponsored_students ?? 0;
  const unsponsoredCount = Math.max((summary?.total_students ?? 0) - sponsoredCount, 0);
  const sponsorshipRate = summary?.total_students
    ? Math.round((sponsoredCount / summary.total_students) * 100)
    : 0;

  const growthPct = analytics?.growth_pct ?? 0;
  const GrowthIcon = growthPct > 0 ? ArrowUpRight : growthPct < 0 ? ArrowDownRight : Minus;
  const growthColor = growthPct > 0 ? 'text-green-600' : growthPct < 0 ? 'text-red-500' : 'text-gray-400';
  const growthBg = growthPct > 0 ? 'bg-green-50' : growthPct < 0 ? 'bg-red-50' : 'bg-gray-50';

  const topDonorMax = analytics?.top_donors?.[0]?.total_contributed || 1;

  const stats = [
    {
      title: 'Total Students',
      value: summary?.total_students?.toString() ?? '—',
      sub: `${unsponsoredCount} unsponsored`,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Donors',
      value: summary?.total_donors?.toString() ?? '—',
      sub: `${analytics?.top_donors?.length ?? 0} top contributors`,
      icon: Heart,
      color: 'bg-rose-500',
    },
    {
      title: 'Sponsored Students',
      value: sponsoredCount.toString(),
      sub: `${sponsorshipRate}% coverage rate`,
      icon: TrendingUp,
      color: 'bg-[#14856E]',
    },
    {
      title: 'Active Sponsorships',
      value: analytics?.active_sponsorships?.toString() ?? '—',
      sub: `৳${(analytics?.active_monthly_total ?? 0).toLocaleString()}/mo active`,
      icon: Activity,
      color: 'bg-violet-500',
    },
    {
      title: 'Monthly Ledger',
      value: `৳${(summary?.monthly_revenue ?? 0).toLocaleString()}`,
      sub: 'Credits this month',
      icon: DollarSign,
      color: 'bg-amber-500',
    },
    {
      title: 'Total Contributions',
      value: `৳${(analytics?.total_contributions_ever ?? 0).toLocaleString()}`,
      sub: 'All-time sponsorships',
      icon: Award,
      color: 'bg-emerald-600',
    },
  ];

  const studentBreakdownData = [
    { name: 'Sponsored', value: sponsoredCount, color: '#14856E' },
    { name: 'Unsponsored', value: unsponsoredCount, color: '#F59E0B' },
  ];

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Welcome to Sombhabona Foundation</p>
          </div>
          {/* MoM growth badge */}
          <div className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl ${growthBg} border border-gray-200`}>
            <GrowthIcon size={18} className={growthColor} />
            <div>
              <p className="text-xs text-gray-500 leading-none">New sponsorships MoM</p>
              <p className={`text-sm font-bold ${growthColor} leading-tight`}>
                {growthPct > 0 ? '+' : ''}{growthPct}%
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({analytics?.new_this_month ?? 0} this month vs {analytics?.new_last_month ?? 0} last)
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-xs text-gray-500 leading-snug">{stat.title}</p>
              <div className={`${stat.color} p-2 rounded-lg flex-shrink-0`}>
                <stat.icon className="text-white" size={14} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 leading-none">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1 leading-snug">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Sponsorship rate progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Sponsorship Coverage</p>
          <p className="text-sm font-bold text-[#14856E]">{sponsoredCount} / {summary?.total_students ?? 0} students ({sponsorshipRate}%)</p>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-3 rounded-full bg-[#14856E] transition-all duration-700"
            style={{ width: `${sponsorshipRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">{sponsoredCount} sponsored</span>
          <span className="text-xs text-gray-400">{unsponsoredCount} still need a sponsor</span>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Donation Trend - 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Sponsorship Amount Trend (12 months)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={donationTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(v) => `৳${v >= 1000 ? `${v / 1000}k` : v}`} />
              <Tooltip
                formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Line type="monotone" dataKey="amount" stroke="#14856E" strokeWidth={2.5} dot={{ fill: '#14856E', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Student Breakdown - 1/3 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-2">Student Breakdown</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={studentBreakdownData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {studentBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [v, '']} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#14856E]" />
              <span className="text-xs text-gray-600">Sponsored ({sponsoredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="text-xs text-gray-600">Unsponsored ({unsponsoredCount})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly New Sponsorships bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">New Sponsorships Per Month</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.monthly_new ?? []} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === 'new_count' ? [value, 'New sponsorships'] : [`৳${value.toLocaleString()}`, 'Total amount']
                }
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Legend formatter={(v) => (v === 'new_count' ? 'Count' : 'Amount (৳)')} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="new_count" fill="#14856E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Donors */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Top Donors by Contribution</h2>
          {(analytics?.top_donors?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No donor data yet</p>
          ) : (
            <div className="space-y-3">
              {(analytics?.top_donors ?? []).map((donor, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
                      <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{donor.name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-semibold text-[#14856E]">৳{donor.total_contributed.toLocaleString()}</span>
                      <span className="text-xs text-gray-400 ml-2">{donor.active_count} active</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-[#14856E] transition-all duration-500"
                      style={{ width: `${Math.round((donor.total_contributed / topDonorMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Sponsorships */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Recent Sponsorships</h2>
          <span className="text-xs text-gray-400">Latest {analytics?.recent_sponsorships?.length ?? 0} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">Student</th>
                <th className="px-6 py-3 text-left">Donor</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Start Date</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(analytics?.recent_sponsorships ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No sponsorships yet</td>
                </tr>
              ) : (
                (analytics?.recent_sponsorships ?? []).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{s.student_name}</td>
                    <td className="px-6 py-3 text-gray-600">{s.donor_name}</td>
                    <td className="px-6 py-3 font-semibold text-[#14856E]">৳{s.amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {s.start_date ? format(new Date(s.start_date), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        String(s.status).toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
