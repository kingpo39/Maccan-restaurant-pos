import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  const quickLogin = (em, pw) => {
    setEmail(em);
    setPassword(pw);
  };

  const accounts = [
    { role: 'Owner', email: 'admin@maccan.com', pw: 'admin123', color: 'bg-blue-500' },
    { role: 'Manager', email: 'sara@maccan.com', pw: 'staff123', color: 'bg-purple-500' },
    { role: 'Head Chef', email: 'reza@maccan.com', pw: 'staff123', color: 'bg-amber-500' },
    { role: 'Server', email: 'ali@maccan.com', pw: 'staff123', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4">
            M
          </div>
          <h1 className="text-2xl font-bold text-foreground">MACCAN RMS</h1>
          <p className="text-sm text-muted-foreground mt-1">Restaurant Management System</p>
          <p className="text-xs text-muted-foreground mt-0.5">🌿🌊 Laleh Sar, Mazandaran</p>
        </div>

        {/* Login Form */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Sign in</h2>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="user@maccan.com"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Quick Access */}
        <div className="mt-4 card p-4">
          <p className="text-xs text-muted-foreground mb-3 font-medium">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((a) => (
              <button
                key={a.role}
                onClick={() => quickLogin(a.email, a.pw)}
                className="text-left px-3 py-2 rounded-md border border-border hover:bg-accent hover:border-primary/30 transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${a.color}`} />
                  <span className="text-sm font-medium text-foreground">{a.role}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
