import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, LogIn, Lock, Mail, AlertCircle, Radio, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const LoginPage: React.FC = () => {
  const { login, loginDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dispatcher');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setError('');
    setLoading(true);
    try {
      await loginDemo(role);
      if (role === 'CITIZEN') navigate('/citizen');
      else if (role === 'RESPONDER') navigate('/responder');
      else if (role === 'ANALYST') navigate('/analyst');
      else if (role === 'ADMIN') navigate('/admin');
      else navigate('/dispatcher');
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-slate-950">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white mx-auto shadow-[0_0_20px_rgba(239,68,68,0.4)] mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Sign In to ResQIntel AI
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Access secure emergency operations and field response intelligence
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-700/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Demo Fast-Login Section */}
        <div className="mb-6 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 text-center">
            One-Click Fast Demo Role Access
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('DISPATCHER')}
              className="py-1.5 px-2 bg-red-950/70 hover:bg-red-900/80 border border-red-800/80 text-red-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 text-red-400" />
              Dispatcher
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('RESPONDER')}
              className="py-1.5 px-2 bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-800/80 text-cyan-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              Responder
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ANALYST')}
              className="py-1.5 px-2 bg-purple-950/70 hover:bg-purple-900/80 border border-purple-800/80 text-purple-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              Analyst
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('ADMIN')}
              className="py-1.5 px-2 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-800/80 text-amber-200 text-xs rounded font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              Admin
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleDemoLogin('CITIZEN')}
            className="w-full mt-2 py-1.5 px-2 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/80 text-emerald-200 text-xs rounded font-mono font-semibold transition-colors text-center"
          >
            Citizen Reporter Account
          </button>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dispatcher@resqintel.ai"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          <span>Need a citizen account? </span>
          <Link to="/register" className="text-red-400 hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
