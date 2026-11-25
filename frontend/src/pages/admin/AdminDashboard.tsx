import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { isLocalDemoEnvironment } from '../../features/auth/services/identityService.js';
import {
  ShieldAlert,
  History,
  Lock,
  CheckCircle,
  Bug,
} from 'lucide-react';
import { DeveloperScreenshotDiagnosticPanel } from '../../features/admin/components/DeveloperScreenshotDiagnosticPanel.js';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system' | 'diagnostics'>('users');

  const demoUsers = [
    { id: 'usr-001', name: 'Sunita Sharma', email: 'sunita.sharma@saksham.care', role: 'patient', status: 'verified', joined: 'Oct 12, 2026' },
    { id: 'usr-002', name: 'Ananya Sharma', email: 'ananya.sharma@saksham.care', role: 'caregiver', status: 'verified', joined: 'Oct 14, 2026' },
    { id: 'usr-003', name: 'Dr. Raman Verma', email: 'dr.raman.verma@saksham.care', role: 'doctor', status: 'verified', joined: 'Oct 15, 2026' },
    { id: 'usr-004', name: 'Rohan Mehta', email: 'rohan.mehta@care.org', role: 'caregiver', status: 'pending_verification', joined: 'Nov 02, 2026' },
  ];

  const auditLogs = [
    { id: 'log-101', timestamp: 'Today at 09:42 AM', actor: 'caregiver-demo-01', action: 'LOCATION_ACCESS_CHECK', resource: 'patients/patient-demo-01', result: 'PERMITTED_WITH_CONSENT' },
    { id: 'log-102', timestamp: 'Today at 08:32 AM', actor: 'patient-demo-01', action: 'ROUTINE_COMPLETION', resource: 'routines/routine-01', result: 'SUCCESS' },
    { id: 'log-103', timestamp: 'Yesterday at 05:15 PM', actor: 'admin-demo-01', action: 'ROLE_ELEVATION', resource: 'users/dr.raman.verma', result: 'CUSTOM_CLAIMS_SET' },
    { id: 'log-104', timestamp: 'Nov 03 at 11:20 AM', actor: 'unauth-client', action: 'DIRECT_FIRESTORE_WRITE', resource: 'auditLogs/any', result: 'BLOCKED_BY_SECURITY_RULES' },
  ];

  return (
    <div className="pb-24 pt-6 px-4 max-w-5xl mx-auto space-y-6">
      {/* Demonstration Banner */}
      {isLocalDemoEnvironment() && (
        <div data-testid="admin-demo-badge" className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>{t('admin.demo_badge')}</span>
          </div>
          <span className="text-2xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Local Sandbox</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-rose-900 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>{t('admin.dashboard_title')}</span>
        </div>
        <h1 className="text-2xl font-bold">Admin Hub: {currentUser?.displayName}</h1>
        <p className="text-xs md:text-sm text-gray-300 mt-1">
          {t('admin.portal_subtitle')}
        </p>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          {t('admin.zero_knowledge')}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition ${
            activeTab === 'users' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.tab_users')}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition ${
            activeTab === 'audit' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.tab_audit')}
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition ${
            activeTab === 'system' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.tab_system')}
        </button>
        <button
          data-testid="admin-tab-diagnostics"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 py-2.5 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'diagnostics' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          <Bug className="w-4 h-4 text-rose-600" />
          <span>{t('admin.tab_diagnostics')}</span>
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-saksham-darkText">Registered Accounts & Verified Claims</h2>
            <button
              onClick={() => alert('New user registration and verification can be initiated here.')}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition"
            >
              + Create Verified User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Verified Role Claim</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {demoUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-3 font-bold text-saksham-darkText">{u.name}</td>
                    <td className="py-3 px-3 text-gray-600">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${
                        u.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => alert(`Reviewing credentials & claims for ${u.name}`)}
                        className="text-purple-700 hover:underline font-bold text-xs"
                      >
                        Edit Claims
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-saksham-darkText flex items-center space-x-2">
              <History className="w-5 h-5 text-gray-600" />
              <span>Immutable System Audit Trail</span>
            </h2>
            <span className="text-xs text-gray-500">Append-only compliance log</span>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-start justify-between text-xs">
                <div>
                  <div className="flex items-center space-x-2 font-mono font-bold text-purple-900">
                    <span>{log.action}</span>
                    <span className="text-[10px] font-sans bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] mt-0.5">
                    Actor: <span className="font-semibold text-gray-700">{log.actor}</span> • Target: <span className="font-semibold text-gray-700">{log.resource}</span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  log.result.includes('PERMITTED') || log.result === 'SUCCESS' || log.result.includes('CUSTOM_CLAIMS')
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {log.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: System Health */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>Cloud Firestore</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">Operational</p>
            <p className="text-xs text-gray-500 mt-1">Rules: Locked to RBAC custom claims</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>AI Companion Gateway</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">Healthy</p>
            <p className="text-xs text-gray-500 mt-1">Intent whitelist strictly enforced</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>Firebase Storage Vault</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">Secured</p>
            <p className="text-xs text-gray-500 mt-1">Photo cues encryption enabled</p>
          </div>
        </div>
      )}

      {/* Tab 4: Developer Screenshot-to-Gemini Diagnostics */}
      {activeTab === 'diagnostics' && <DeveloperScreenshotDiagnosticPanel />}
    </div>
  );
};
