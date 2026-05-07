import { Save, User, Bell, Lock, Database } from 'lucide-react';

export function Settings() {
  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage your organization and system preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-[#14856E] p-2 rounded-lg">
              <User className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Organization Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                defaultValue="Sombhabona Foundation"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input
                type="text"
                defaultValue="Deprived Children Are Future Leader Too"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  defaultValue="01737243447"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="info@sombhabona.org"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                defaultValue="Mirpur, Dhaka"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors">
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Bell className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-[#14856E] border-gray-300 rounded focus:ring-[#14856E]"
              />
              <span className="text-gray-700">Email notifications for new donations</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-[#14856E] border-gray-300 rounded focus:ring-[#14856E]"
              />
              <span className="text-gray-700">Email notifications for new sponsorships</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-[#14856E] border-gray-300 rounded focus:ring-[#14856E]"
              />
              <span className="text-gray-700">Monthly financial summary reports</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="w-4 h-4 text-[#14856E] border-gray-300 rounded focus:ring-[#14856E]"
              />
              <span className="text-gray-700">Low balance alerts</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Lock className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Security</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              />
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors">
              <Lock size={18} />
              Update Password
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-500 p-2 rounded-lg">
              <Database className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Data Management</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Export All Data</p>
                <p className="text-sm text-gray-600">Download a complete backup of your data</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                Export
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Import Data</p>
                <p className="text-sm text-gray-600">Upload data from CSV or Excel files</p>
              </div>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
