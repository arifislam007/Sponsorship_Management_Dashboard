import { useEffect, useState } from 'react';
import { Users, Heart, TrendingUp, DollarSign } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, DashboardSummary, DonationTrendPoint } from '../services/api';

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [donationTrendData, setDonationTrendData] = useState<DonationTrendPoint[]>([]);

  useEffect(() => {
    Promise.all([api.getDashboardSummary(), api.getDonationTrend()])
      .then(([summaryData, trendData]) => {
        setSummary(summaryData);
        setDonationTrendData(trendData);
      })
      .catch((error) => {
        console.error('Failed to load dashboard data:', error);
        setSummary(null);
        setDonationTrendData([]);
      });
  }, []);

  const sponsoredCount = summary?.sponsored_students ?? 0;
  const unsponsoredCount = Math.max((summary?.total_students ?? 0) - sponsoredCount, 0);

  const stats = [
    {
      title: 'Total Students',
      value: summary?.total_students.toString() ?? '0',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Donors',
      value: summary?.total_donors.toString() ?? '0',
      icon: Heart,
      color: 'bg-rose-500',
    },
    {
      title: 'Sponsored Students',
      value: sponsoredCount.toString(),
      icon: TrendingUp,
      color: 'bg-[#14856E]',
    },
    {
      title: 'Monthly Donations',
      value: `৳${(summary?.monthly_revenue ?? 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-amber-500',
    },
  ];

  const recentActivity = [
    { student: 'Ayesha Rahman', donor: 'MD AREFUL ISLAM', date: '2026-05-01' },
    { student: 'Karim Ahmed', donor: 'Sarah Johnson', date: '2026-04-30' },
    { student: 'Fatima Begum', donor: 'John Smith', date: '2026-04-28' },
    { student: 'Rakib Hassan', donor: 'Emily Davis', date: '2026-04-25' },
    { student: 'Nadia Islam', donor: 'Michael Brown', date: '2026-04-22' },
  ];

  const studentBreakdownData = [
    { name: 'Sponsored', value: sponsoredCount, color: '#14856E' },
    { name: 'Unsponsored', value: unsponsoredCount, color: '#F59E0B' },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Welcome to Sombhabona Foundation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="text-white" size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Donation Trend</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={donationTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                formatter={(value: number) => `৳${value.toLocaleString()}`}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.month_key || ''}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#14856E"
                strokeWidth={3}
                dot={{ fill: '#14856E', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Breakdown</h2>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={studentBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {studentBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#14856E]"></div>
              <span className="text-sm text-gray-700">Sponsored ({sponsoredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#F59E0B]"></div>
              <span className="text-sm text-gray-700">Unsponsored ({unsponsoredCount})</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Sponsorships</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Donor Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivity.map((activity, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.student}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {activity.donor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.date}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
