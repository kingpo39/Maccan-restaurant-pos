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
      setError(err.message || 'ACCESS DENIED');
    }
    setLoading(false);
  };

  const quickLogin = (em, pw) => {
    setEmail(em);
    setPassword(pw);
  };

  const accounts = [
    { role: 'OWNER', email: 'admin@maccan.com', pw: 'admin123', color: '#00f3ff' },
    { role: 'MANAGER', email: 'sara@maccan.com', pw: 'staff123', color: '#ff00ff' },
    { role: 'HEAD_CHEF', email: 'reza@maccan.com', pw: 'staff123', color: '#ffaa00' },
    { role: 'SERVER', email: 'ali@maccan.com', pw: 'staff123', color: '#00ff88' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] cyber-grid cyber-scanlines flex items-center justify-center p-4">
      {/* Ambient glow orbs */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Terminal Header */}
        <div className="text-center mb-8">
          <div className="inline-block border border-cyan-500/30 px-6 py-2 mb-4">
            <span className="text-cyan-400 text-xs font-mono tracking-[4px] text-glow-cyan">
              SYSTEM.INIT
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            MACCAN<span className="text-cyan-400 text-glow-cyan"> RMS</span>
          </h1>
          <p className="text-cyan-500/60 text-xs font-mono tracking-widest">
            RESTAURANT MANAGEMENT SYSTEM v2.0
          </p>
          <p className="text-gray-600 text-[10px] mt-2 font-mono">
            &#x250C;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2510;<br />
            &#x2502; &#x1F33F;&#x1F30A; Laleh Sar, Mazandaran  &#x2502;<br />
            &#x2514;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2500;&#x2518;
          </p>
        </div>

        {/* Login Form */}
        <div className="cyber-panel p-6 animate-border-glow">
          <div className="flex items-center gap-2 mb-6 pb-3 border-b border-cyan-500/10">
            <span className="status-dot status-online animate-pulse-glow" />
            <span className="text-cyan-400 text-xs font-mono tracking-widest">AUTH.SUBSYSTEM</span>
          </div>

          {error && (
            <div className="mb-4 px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
              &#x26A0; {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-cyan-500/70 text-[10px] font-mono tracking-widest mb-1.5 uppercase">
                &#x25B8; IDENTIFIER
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="cyber-input w-full"
                placeholder="user@maccan.com"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-cyan-500/70 text-[10px] font-mono tracking-widest mb-1.5 uppercase">
                &#x25B8; PASSPHRASE
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="cyber-input w-full"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cyber-btn w-full text-center disabled:opacity-30"
            >
              {loading ? '&#x25CC; AUTHENTICATING...' : '&#x25B6; INITIALIZE SESSION'}
            </button>
          </form>
        </div>

        {/* Quick Access */}
        <div className="mt-4 cyber-panel p-4">
          <div className="text-[10px] text-gray-600 font-mono tracking-widest mb-3 uppercase">
            &#x25B8; Quick Access Profiles
          </div>
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((a) => (
              <button
                key={a.role}
                onClick={() => quickLogin(a.email, a.pw)}
                className="text-left px-3 py-2 bg-white/[0.02] border border-white/[0.06] hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group"
              >
                <div className="text-[10px] font-mono font-bold" style={{ color: a.color }}>
                  {a.role}
                </div>
                <div className="text-[9px] text-gray-600 font-mono group-hover:text-gray-400 transition-colors">
                  {a.email}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[9px] text-gray-700 font-mono">
          MACCAN GROUP &#x2022; Laleh Sar, Mazandaran<br />
          <span className="text-cyan-500/30">Powered by Cyberpunk Command Center v2.0</span>
        </div>
      </div>
    </div>
  );
}
