import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Trash2, Edit2, Loader, AlertCircle, CheckCircle } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  roles: { id: number; name: string }[];
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Module {
  id: number;
  name: string;
  description: string;
  route_name: string;
}

const LEAVE_ONLY_MODULE = {
  moduleName: 'Leave Management',
  canView: true,
  canCreate: true,
  canEdit: true,
  canDelete: false,
  overrideRolePermissions: true,
};

export function Admin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserForm, setNewUserForm] = useState({ username: '', email: '', password: '', fullName: '', roles: [] as string[] });

  useEffect(() => {
    if (token) {
      loadUsers();
      loadRoles();
      loadModules();
    }
  }, [token]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/v1/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/v1/admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadModules = async () => {
    try {
      const response = await fetch('/api/v1/admin/modules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUserForm.username,
          email: newUserForm.email,
          password: newUserForm.password,
          fullName: newUserForm.fullName,
          roles: newUserForm.roles,
        }),
      });

      if (response.ok) {
        setSuccess('User created successfully');
        setNewUserForm({ username: '', email: '', password: '', fullName: '', roles: [] });
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUserRoles = async (userId: number, roleNames: string[]) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleNames }),
      });

      if (response.ok) {
        setSuccess('User roles updated successfully');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update user roles');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, isActive: boolean) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        loadUsers();
      } else {
        setError('Failed to update user status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantLeaveOnlyAccess = async (userId: number, userRoles: { id: number; name: string }[]) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      if (userRoles.length > 0) {
        const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ roleNames: [] }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to remove existing roles');
        }
      }

      const accessResponse = await fetch(`/api/v1/admin/users/${userId}/module-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(LEAVE_ONLY_MODULE),
      });

      if (accessResponse.ok) {
        setSuccess('Leave-only access granted successfully');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await accessResponse.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to grant leave-only access');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant leave-only access');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="md:hidden mb-4">
          <h1 className="text-xl font-bold text-[#14856E]">Sombhabona</h1>
          <p className="text-xs text-gray-600">Foundation Dashboard</p>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm md:text-base text-gray-600 mt-1">Manage users, roles, and permissions</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'users'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex-1 px-6 py-3 font-medium transition-colors ${
              activeTab === 'roles'
                ? 'text-[#14856E] border-b-2 border-[#14856E]'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Roles & Permissions
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h3>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Leave the Roles list empty if you want this account to be leave-only. You can assign Leave Management access later from the user list.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Username"
                      value={newUserForm.username}
                      onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUserForm.email}
                      onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newUserForm.password}
                      onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUserForm.fullName}
                      onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                    <div className="flex flex-wrap gap-3">
                      {roles.map((role) => (
                        <label key={role.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={newUserForm.roles.includes(role.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserForm({
                                  ...newUserForm,
                                  roles: [...newUserForm.roles, role.name],
                                });
                              } else {
                                setNewUserForm({
                                  ...newUserForm,
                                  roles: newUserForm.roles.filter((r) => r !== role.name),
                                });
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-[#14856E] text-white rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Create User
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Users</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Username</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Email</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Full Name</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Roles</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-900 font-medium">{user.username}</td>
                          <td className="px-6 py-3 text-gray-600">{user.email}</td>
                          <td className="px-6 py-3 text-gray-600">{user.full_name}</td>
                          <td className="px-6 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.roles && user.roles.length > 0 ? (
                                user.roles.filter(Boolean).map((role) => (
                                  <span
                                    key={role.id}
                                    className="px-2 py-1 bg-[#14856E]/10 text-[#14856E] text-xs rounded-full font-medium"
                                  >
                                    {role.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-gray-500 text-xs">No roles</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                user.is_active
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedUser(user)}
                                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleGrantLeaveOnlyAccess(user.id, user.roles || [])}
                                disabled={isLoading}
                                className="px-3 py-2 text-xs font-medium rounded-lg border border-[#14856E] text-[#14856E] hover:bg-[#14856E] hover:text-white transition-colors disabled:opacity-50"
                              >
                                Leave only
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                disabled={isLoading}
                                className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isLoading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roles.map((role) => (
                    <div key={role.id} className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2 capitalize">{role.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                      <button
                        onClick={() => {
                          /* Show role permissions editor */
                        }}
                        className="text-sm text-[#14856E] hover:underline font-medium"
                      >
                        Manage Permissions →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Modules</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modules.map((module) => (
                    <div key={module.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-1">{module.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                      <p className="text-xs text-gray-500">Route: {module.route_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
