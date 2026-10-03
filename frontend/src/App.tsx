import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { OfflineBanner } from './components/common/OfflineBanner';
import { CopilotDrawer } from './components/copilot/CopilotDrawer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { ReportEmergencyPage } from './pages/ReportEmergencyPage';
import { SOSPage } from './pages/SOSPage';
import { DispatcherDashboard } from './pages/DispatcherDashboard';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ResourceManagementPage } from './pages/ResourceManagementPage';
import { ResponderDashboard } from './pages/ResponderDashboard';
import { AnalystDashboard } from './pages/AnalystDashboard';
import { DataSourcesPage } from './pages/DataSourcesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SitrepPage } from './pages/SitrepPage';
import { OfflineSyncPage } from './pages/OfflineSyncPage';

function AppContent() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotContext, setCopilotContext] = useState<{ id?: string; num?: string }>({});

  const handleOpenCopilot = (incidentId?: string, incNumber?: string) => {
    setCopilotContext({ id: incidentId, num: incNumber });
    setCopilotOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      <OfflineBanner />
      <Navbar onToggleCopilot={() => setCopilotOpen(!copilotOpen)} />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          
          {/* Citizen Screens */}
          <Route path="/citizen" element={<CitizenDashboard />} />
          <Route path="/report" element={<ReportEmergencyPage />} />
          <Route path="/sos" element={<SOSPage />} />

          {/* Operational Screens */}
          <Route path="/dispatcher" element={<DispatcherDashboard onOpenCopilot={handleOpenCopilot} />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="/resources" element={<ResourceManagementPage />} />
          <Route path="/responder" element={<ResponderDashboard />} />
          <Route path="/analyst" element={<AnalystDashboard />} />
          <Route path="/datasets" element={<DataSourcesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/health" element={<SystemHealthPage />} />
          <Route path="/sitrep" element={<SitrepPage />} />
          <Route path="/offline" element={<OfflineSyncPage />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global AI Copilot Drawer */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        activeIncidentId={copilotContext.id}
        activeIncidentNumber={copilotContext.num}
      />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
