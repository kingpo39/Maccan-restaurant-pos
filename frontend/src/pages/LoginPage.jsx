import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-green-800 to-green-950">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-yellow-400 font-bold text-lg">MACCAN</span>
          </div>
          <h1 className="text-2xl font-bold text-green-900">MACCAN RMS</h1>
          <p className="text-gray-500 text-sm mt-1">Restaurant Management System</p>
          <p className="text-gray-400 text-xs mt-1">🌿🌊 جایی که جنگل به دریا می‌رسد</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
              placeholder="admin@maccan.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-900 hover:bg-green-800 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'ورود...' : 'ورود به سیستم | Sign In'}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center mb-3">حساب‌های نمونه:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => { setEmail('admin@maccan.com'); setPassword('admin123'); }}
              className="bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg text-left"
            >
              <div className="font-medium text-green-800">Owner</div>
              <div className="text-gray-500">admin@maccan.com</div>
            </button>
            <button
              onClick={() => { setEmail('ali@maccan.com'); setPassword('staff123'); }}
              className="bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg text-left"
            >
              <div className="font-medium text-green-800">Server</div>
              <div className="text-gray-500">ali@maccan.com</div>
            </button>
            <button
              onClick={() => { setEmail('reza@maccan.com'); setPassword('staff123'); }}
              className="bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg text-left"
            >
              <div className="font-medium text-green-800">Head Chef</div>
              <div className="text-gray-500">reza@maccan.com</div>
            </button>
            <button
              onClick={() => { setEmail('sara@maccan.com'); setPassword('staff123'); }}
              className="bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg text-left"
            >
              <div className="font-medium text-green-800">Manager</div>
              <div className="text-gray-500">sara@maccan.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
