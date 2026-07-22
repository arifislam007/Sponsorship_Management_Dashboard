import { Outlet, NavLink, useNavigate } from 'react-router';
import { LayoutDashboard, Users, Heart, Link2, FileText, Settings, LogOut, ChevronDown, CalendarDays, Code2, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export function RootLayout() {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600 mt-1">Foundation Dashboard</p>
        </div>

        <nav className="flex-1 p-4">
          {canAccess('Dashboard') && (
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </NavLink>
          )}

          {canAccess('Students') && (
            <NavLink
              to="/dashboard/students"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Users size={20} />
              <span>Students</span>
            </NavLink>
          )}

          {canAccess('Donors') && (
            <NavLink
              to="/dashboard/donors"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Heart size={20} />
              <span>Donors</span>
            </NavLink>
          )}

          {canAccess('Sponsorships') && (
            <NavLink
              to="/dashboard/sponsorships"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Link2 size={20} />
              <span>Sponsorships</span>
            </NavLink>
          )}

          {canAccess('Export') && (
            <NavLink
              to="/dashboard/acknowledgment-letter"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <FileText size={20} />
              <span>Acknowledgment Letter</span>
            </NavLink>
          )}

          {canAccess('Leave Management') && (
            <NavLink
              to="/dashboard/leaves"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <CalendarDays size={20} />
              <span>Leave Management</span>
            </NavLink>
          )}

          {canAccess('ICT') && (
            <NavLink
              to="/dashboard/ict"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Code2 size={20} />
              <span>ICT</span>
            </NavLink>
          )}

          {canAccess('Accounting') && (
            <NavLink
              to="/dashboard/accounting"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <BookOpen size={20} />
              <span>Accounting</span>
            </NavLink>
          )}

          {canAccess('Admin') && (
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-[#14856E] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <Settings size={20} />
              <span>Settings</span>
            </NavLink>
          )}
        </nav>

        <footer className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <p className="font-semibold text-[#14856E] mb-2 text-sm">
              বঞ্চিত শিশুও আগামীর সম্ভাবনা
            </p>
            <p className="mb-1 text-xs text-gray-600">📞 01737243447</p>
            <p className="mb-2 text-xs text-gray-600">📍 Mirpur, Dhaka</p>
            <p className="text-gray-500 text-xs">© 2024 Sombhabona Foundation</p>
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm text-gray-700"
              >
                <div className="text-left flex-1">
                  <p className="font-medium truncate">{user.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <ChevronDown size={16} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-300 rounded-lg shadow-lg">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </footer>
      </aside>

      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around items-center h-16">
          {canAccess('Dashboard') && (
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <LayoutDashboard size={20} />
              <span className="text-xs mt-1">Home</span>
            </NavLink>
          )}

          {canAccess('Students') && (
            <NavLink
              to="/dashboard/students"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <Users size={20} />
              <span className="text-xs mt-1">Students</span>
            </NavLink>
          )}

          {canAccess('Export') && (
            <NavLink
              to="/dashboard/acknowledgment-letter"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <FileText size={20} />
              <span className="text-xs mt-1">Letter</span>
            </NavLink>
          )}

          {canAccess('Leave Management') && (
            <NavLink
              to="/dashboard/leaves"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <CalendarDays size={20} />
              <span className="text-xs mt-1">Leave</span>
            </NavLink>
          )}

          {canAccess('ICT') && (
            <NavLink
              to="/dashboard/ict"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <Code2 size={20} />
              <span className="text-xs mt-1">ICT</span>
            </NavLink>
          )}

          {canAccess('Accounting') && (
            <NavLink
              to="/dashboard/accounting"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <BookOpen size={20} />
              <span className="text-xs mt-1">Accounts</span>
            </NavLink>
          )}

          {canAccess('Admin') && (
            <NavLink
              to="/dashboard/settings"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-[#14856E]' : 'text-gray-600'
                }`
              }
            >
              <Settings size={20} />
              <span className="text-xs mt-1">Admin</span>
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            <span className="text-xs mt-1">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
