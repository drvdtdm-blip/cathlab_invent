import React, { useState } from 'react';
import { verifyLocalCredentials } from '../utils/localAuth';
import { Lock, Mail, Activity, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: any) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userSession = await verifyLocalCredentials(email, password);
      const sessionObj = {
        user: {
          email: userSession.email,
          user_metadata: {
            role: userSession.role,
            name: userSession.name
          }
        }
      };
      // Persist the local network session in localStorage
      localStorage.setItem('cathlab_local_session', JSON.stringify(sessionObj));
      onLoginSuccess(sessionObj);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Decorative background light blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>

      {/* Main glassmorphism card */}
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 space-y-6">
        
        {/* Header Block */}
        <div className="text-center space-y-2">
          <div className="mx-auto bg-blue-600/20 text-blue-500 p-3 rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg shadow-blue-500/10 border border-blue-500/20">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0">Cath Lab Portal</h1>
            <p className="text-xs text-slate-400 mt-1 leading-normal">Shyam Shah Medical College, Rewa</p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs font-semibold leading-relaxed">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="e.g. cardiologist@ssmc.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm text-white focus:outline-none transition-all placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying Credentials...
              </>
            ) : (
              'Sign In to Dashboard'
            )}
          </button>
        </form>

        {/* Local Demo / Default Accounts Credentials */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Local Network User Access</h3>
            <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Offline Mode</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { label: 'Cardiologist (Admin)', email: 'cardiologist@ssmc.com', pass: 'ssmcadmin' },
              { label: 'Inventory Registrar', email: 'inventory@ssmc.com', pass: 'ssmcinventory' },
              { label: 'Clinical Ops Desk', email: 'clinical@ssmc.com', pass: 'ssmcclinical' }
            ].map(user => (
              <button
                key={user.email}
                type="button"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.pass);
                }}
                className="w-full text-left p-2.5 bg-slate-950/40 hover:bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between transition-all group text-xs text-slate-300"
              >
                <div>
                  <div className="font-bold text-[11px] text-white flex items-center gap-1.5">
                    {user.label}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{user.email}</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[10px] font-mono text-slate-400 font-bold">pass: {user.pass}</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">Click to Fill</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 text-center text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider font-semibold">
          Authorized Medical Personnel Only
        </div>
      </div>
    </div>
  );
};
