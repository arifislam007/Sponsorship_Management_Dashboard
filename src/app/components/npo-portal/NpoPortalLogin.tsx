import { useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, Loader } from 'lucide-react';
import logo from '../../../../logo.png';

// Deliberately separate from the staff Login/AuthContext — NPO members aren't
// staff app users with module permissions, so this is a tiny two-page
// micro-app rather than being wired into the main SPA's auth machinery.
// Token lives under its own localStorage key so it can never collide with
// or be confused for the staff session (`authToken`).
export function NpoPortalLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/npo/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Login failed');
      }
      const data = await res.json();
      localStorage.setItem('npoPortalToken', data.token);
      localStorage.setItem('npoPortalName', data.fullName || '');
      navigate('/npo-portal/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#14856E]/10 to-[#14856E]/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <img src={logo} alt="Sombhabona" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Member Approval Portal</h1>
          <p className="text-sm text-gray-600 mt-1">Sombhabona Foundation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              placeholder="Your portal username"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              disabled={isLoading} required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Your portal password"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14856E] focus:border-transparent"
              disabled={isLoading} required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={isLoading}
            className="w-full px-4 py-2.5 bg-[#14856E] text-white font-medium rounded-lg hover:bg-[#0f6b5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader size={16} className="animate-spin" />}
            {isLoading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Don't have a portal login? Contact the foundation office to have one issued.
        </p>
      </div>
    </div>
  );
}
