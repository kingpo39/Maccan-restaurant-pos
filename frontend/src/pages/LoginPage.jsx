import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email);
    } catch (err) {
      setError(err.message || 'ورود ناموفق بود');
    }
    setLoading(false);
  };

  const accounts = [
    ['مالک | Owner', 'dara@maccan.com', 'bg-[#2d5016]'],
    ['مدیر | Manager', 'sara@maccan.com', 'bg-[#6b4c9a]'],
    ['سرآشپز | Head Chef', 'reza@maccan.com', 'bg-[#c88a22]'],
    ['گارسون | Server', 'ali@maccan.com', 'bg-[#287f72]'],
    ['مهمان | Guest', 'guest@maccan.com', 'bg-[#64748b]'],
  ];

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center p-5 bg-[#f4f7f0]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-[#2d5016] text-[#c8a951] flex items-center justify-center text-sm font-bold leading-tight shadow-lg">
            دهکده<br/>جنگلی<br/>ماکان
          </div>
          <h1 className="text-2xl font-light text-[#1e2b2a]">
            دهکده جنگلی <span className="font-bold text-[#2d5016]">ماکان</span>
          </h1>
          <p className="text-sm text-[#5a6b68] mt-1">سیستم مدیریت رستوران | MACCAN RMS</p>
          <p className="text-xs text-[#5a6b68]">🌿🌊 لالیم سر، مازندران</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-md border border-[#dfe7dc] p-6">
          <h2 className="text-lg font-semibold text-[#2d5016] mb-1">ورود به سامانه</h2>
          <p className="text-xs text-[#5a6b68] mb-5">Sign in to your restaurant dashboard</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-[#1e2b2a] mb-1">
              ایمیل | Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mb-5 px-3 py-2.5 rounded-lg border border-[#cfd9cc] focus:outline-none focus:ring-2 focus:ring-[#2d5016]/30"
              placeholder="example@maccan.com"
              required
            />

            <button
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#2d5016] text-white font-medium hover:bg-[#1f3a0f] disabled:opacity-50 transition-colors"
            >
              {loading ? 'در حال ورود...' : 'ورود | Sign in'}
            </button>
          </form>
        </div>

        {/* Demo Accounts */}
        <div className="mt-4 bg-white rounded-xl border border-[#dfe7dc] p-4">
          <p className="text-xs font-semibold text-[#5a6b68] mb-3">حساب‌های آزمایشی | Demo accounts</p>
          <div className="grid grid-cols-2 gap-2" dir="ltr">
            {accounts.map(([role, em, color]) => (
              <button
                key={em}
                onClick={() => { setEmail(em); }}
                className="text-left p-2.5 rounded-lg border border-[#e1e7df] hover:border-[#2d5016] hover:bg-[#f4f7f0] transition-colors"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <i className={`w-2 h-2 rounded-full ${color}`}/>
                  {role}
                </span>
                <span className="block text-[10px] text-[#6b7772] mt-1">{em}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
