import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ShieldAlert, Radio, Map, BarChart3, Database, Users, 
  Activity, Bell, Bot, LogOut, ChevronDown, Check, AlertOctagon,
  FileText, Truck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface Props {
  onToggleCopilot?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<Props> = ({ onToggleCopilot, unreadCount = 0 }) => {
  const { user, logout, loginDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles: UserRole[] = ['DISPATCHER', 'RESPONDER', 'ANALYST', 'ADMIN', 'CITIZEN'];

  const handleRoleSwitch = async (role: UserRole) => {
    setShowRoleMenu(false);
    await loginDemo(role);
    if (role === 'CITIZEN') navigate('/citizen');
    else if (role === 'RESPONDER') navigate('/responder');
    else if (role === 'ANALYST') navigate('/analyst');
    else if (role === 'ADMIN') navigate('/admin');
    else navigate('/dispatcher');
  };

  const roleColors: Record<UserRole, string> = {
    DISPATCHER: 'bg-red-500/20 text-red-400 border-red-500/40',
    RESPONDER: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    ANALYST: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    ADMIN: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    CITIZEN: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] group-hover:scale-105 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-wider text-white font-mono flex items-center gap-1.5">
                  ResQIntel <span className="text-red-500 text-xs px-1.5 py-0.2 bg-red-500/10 rounded border border-red-500/30">AI</span>
                </span>
                <span className="text-[10px] text-slate-400 tracking-tight -mt-1 hidden sm:inline">
                  EMERGENCY OPERATIONS INTELLIGENCE
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links according to Role */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
                  <Link
                    to="/dispatcher"
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                      isActive('/dispatcher') ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-red-400" />
                    Command Center
                  </Link>
                )}

                <Link
                  to="/map"
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                    isActive('/map') ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Map className="w-3.5 h-3.5 text-blue-400" />
                  Live Geospatial Map
                </Link>

                {user?.role === 'RESPONDER' && (
                  <Link
                    to="/responder"
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                      isActive('/responder') ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Field Duty
                  </Link>
                )}

                {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
                  <Link
                    to="/resources"
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                      isActive('/resources') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-orange-400" />
                    Resources
                  </Link>
                )}

                {(user?.role === 'ANALYST' || user?.role === 'ADMIN') && (
                  <>
                    <Link
                      to="/analyst"
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/analyst') ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                      Analytics & Sitreps
                    </Link>
                    <Link
                      to="/datasets"
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                        isActive('/datasets') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-400" />
                      Data Sources & Models
                    </Link>
                  </>
                )}

                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors ${
                      isActive('/admin') ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    Admin & Audit
                  </Link>
                )}

                {user?.role === 'CITIZEN' && (
                  <>
                    <Link
                      to="/citizen"
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-colors ${
                        isActive('/citizen') ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      Citizen Portal
                    </Link>
                    <Link
                      to="/report"
                      className="px-3 py-1.5 rounded-md text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all"
                    >
                      Report Emergency
                    </Link>
                  </>
                )}
              </>
            ) : (
              <Link to="/report" className="px-3 py-1.5 rounded-md text-xs font-bold bg-red-600 text-white">
                Emergency Report
              </Link>
            )}
          </div>

          {/* Right Action Controls: Role Switcher, Copilot, Alerts, Profile */}
          <div className="flex items-center gap-3">
            {/* Quick Fast-Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-bold tracking-wide transition-all ${
                  user ? roleColors[user.role] : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Switch Demonstration Role"
              >
                <span>ROLE: {user ? user.role : 'GUEST'}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Fast Demo Role Switcher
                  </div>
                  {roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleSwitch(r)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between transition-colors"
                    >
                      <span className="font-mono">{r}</span>
                      {user?.role === r && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Copilot Drawer Button */}
            {onToggleCopilot && (
              <button
                onClick={onToggleCopilot}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-700/60 rounded text-xs font-semibold shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-colors"
              >
                <Bot className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>
            )}

            {/* System Health Icon */}
            <Link
              to="/health"
              className="p-1.5 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
              title="System Component Health"
            >
              <Activity className="w-4 h-4" />
            </Link>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="relative p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              )}
            </Link>

            {/* Auth / Logout */}
            {isAuthenticated ? (
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};
