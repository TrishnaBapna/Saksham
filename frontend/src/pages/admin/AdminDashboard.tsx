import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { isLocalDemoEnvironment } from '../../features/auth/services/identityService.js';
import { db, isFirebaseConfigured } from '../../services/firebase.js';
import { getPortalUi } from '../../features/portals/utils/portalTranslation.js';
import {
  ShieldAlert,
  History,
  Lock,
  CheckCircle,
  Bug,
} from 'lucide-react';
import { DeveloperScreenshotDiagnosticPanel } from '../../features/admin/components/DeveloperScreenshotDiagnosticPanel.js';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
}

interface AdminAuditRow {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  result: string;
}

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const ui = getPortalUi(language);
  const [activeTab, setActiveTab] = useState<'users' | 'audit' | 'system' | 'diagnostics'>('users');
  const isDemo = isLocalDemoEnvironment();

  const demoUsers: AdminUserRow[] = [
    { id: 'usr-001', name: 'Sunita Sharma', email: 'sunita.sharma@saksham.care', role: 'patient', status: 'verified', joined: 'Oct 12, 2026' },
    { id: 'usr-002', name: 'Ananya Sharma', email: 'ananya.sharma@saksham.care', role: 'caregiver', status: 'verified', joined: 'Oct 14, 2026' },
    { id: 'usr-003', name: 'Dr. Raman Verma', email: 'dr.raman.verma@saksham.care', role: 'doctor', status: 'verified', joined: 'Oct 15, 2026' },
    { id: 'usr-004', name: 'Rohan Mehta', email: 'rohan.mehta@care.org', role: 'caregiver', status: 'pending_verification', joined: 'Nov 02, 2026' },
  ];

  const demoAuditLogs: AdminAuditRow[] = [
    { id: 'log-101', timestamp: 'Today at 09:42 AM', actor: 'caregiver-demo-01', action: 'LOCATION_ACCESS_CHECK', resource: 'patients/patient-demo-01', result: 'PERMITTED_WITH_CONSENT' },
    { id: 'log-102', timestamp: 'Today at 08:32 AM', actor: 'patient-demo-01', action: 'ROUTINE_COMPLETION', resource: 'routines/routine-01', result: 'SUCCESS' },
    { id: 'log-103', timestamp: 'Yesterday at 05:15 PM', actor: 'admin-demo-01', action: 'ROLE_ELEVATION', resource: 'users/dr.raman.verma', result: 'CUSTOM_CLAIMS_SET' },
    { id: 'log-104', timestamp: 'Nov 03 at 11:20 AM', actor: 'unauth-client', action: 'DIRECT_FIRESTORE_WRITE', resource: 'auditLogs/any', result: 'BLOCKED_BY_SECURITY_RULES' },
  ];

  const [users, setUsers] = useState<AdminUserRow[]>(() => (isDemo ? demoUsers : []));
  const [auditLogs, setAuditLogs] = useState<AdminAuditRow[]>(() => (isDemo ? demoAuditLogs : []));
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(!isDemo);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  const loadProductionGovernanceData = useCallback(async () => {
    if (isDemo || !isFirebaseConfigured) {
      return;
    }
    setIsLoadingUsers(true);
    setRegistryError(null);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: AdminUserRow[] = usersSnap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: String(data.displayName || data.email || d.id),
          email: String(data.email || ''),
          role: String(data.role || 'patient'),
          status: String(data.status || 'verified'),
          joined: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleDateString() : '',
        };
      });
      setUsers(fetchedUsers);

      try {
        const auditSnap = await getDocs(collection(db, 'auditLogs'));
        const fetchedLogs: AdminAuditRow[] = auditSnap.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            timestamp: String(data.timestamp || ''),
            actor: String(data.actorUid || data.actor || ''),
            action: String(data.action || ''),
            resource: String(data.targetResource || data.resource || ''),
            result: String(data.result || 'LOGGED'),
          };
        });
        setAuditLogs(fetchedLogs);
      } catch {
        setAuditLogs([]);
      }
    } catch (err: any) {
      setRegistryError(err?.message || 'Unable to load Firestore user registry.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [isDemo]);

  useEffect(() => {
    if (!isDemo) {
      loadProductionGovernanceData();
    }
  }, [isDemo, loadProductionGovernanceData]);

  const handleUpdateUserStatus = async (targetUid: string, nextStatus: 'verified' | 'suspended') => {
    if (isDemo) {
      setUsers((prev) => prev.map((u) => (u.id === targetUid ? { ...u, status: nextStatus } : u)));
      return;
    }
    if (!isFirebaseConfigured || currentUser?.role !== 'admin') return;
    setUpdatingUid(targetUid);
    setRegistryError(null);
    try {
      await updateDoc(doc(db, 'users', targetUid), { status: nextStatus });
      setUsers((prev) => prev.map((u) => (u.id === targetUid ? { ...u, status: nextStatus } : u)));
    } catch (err: any) {
      setRegistryError(err?.message || 'Failed to update account status.');
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-5xl mx-auto space-y-6">
      {/* Demonstration Banner */}
      {isDemo && (
        <div data-testid="admin-demo-badge" className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>{t('admin.demo_badge')}</span>
          </div>
          <span className="text-2xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">{ui.localSandbox}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-rose-900 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>{t('admin.dashboard_title')}</span>
        </div>
        <h1 className="text-2xl font-bold">{ui.adminHubPrefix} {currentUser?.displayName}</h1>
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-saksham-darkText">{ui.adminRegisteredAccounts}</h2>
            {!isDemo && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {ui.adminLiveFirestoreBadge}
              </span>
            )}
          </div>

          {registryError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
              {registryError}
            </div>
          )}

          {isLoadingUsers ? (
            <div className="py-6 text-center text-xs text-gray-500">{ui.adminLoadingUsers}</div>
          ) : users.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">{ui.adminNoUsers}</div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-3">{ui.adminColName}</th>
                  <th className="py-3 px-3">{ui.adminColEmail}</th>
                  <th className="py-3 px-3">{ui.adminColRole}</th>
                  <th className="py-3 px-3">{ui.adminColStatus}</th>
                  <th className="py-3 px-3 text-right">{ui.adminColActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
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
                    <td className="py-3 px-3 text-right space-x-2">
                      {u.status !== 'verified' ? (
                        <button
                          type="button"
                          disabled={updatingUid === u.id}
                          onClick={() => handleUpdateUserStatus(u.id, 'verified')}
                          className="text-emerald-700 hover:underline font-bold text-xs disabled:opacity-50"
                        >
                          {u.status === 'suspended' ? ui.adminActivateBtn : ui.adminApproveBtn}
                        </button>
                      ) : u.role !== 'admin' ? (
                        <button
                          type="button"
                          disabled={updatingUid === u.id}
                          onClick={() => handleUpdateUserStatus(u.id, 'suspended')}
                          className="text-rose-700 hover:underline font-bold text-xs disabled:opacity-50"
                        >
                          {ui.adminSuspendBtn}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-saksham-darkText flex items-center space-x-2">
              <History className="w-5 h-5 text-gray-600" />
              <span>{ui.adminAuditTitle}</span>
            </h2>
            <span className="text-xs text-gray-500">{ui.adminAuditSub}</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">{ui.adminNoAuditLogs}</div>
          ) : (
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
                    {log.actor} • {log.resource}
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
          )}
        </div>
      )}

      {/* Tab 3: System Health */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>{ui.adminSysFirestore}</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">{ui.adminSysOperational}</p>
            <p className="text-xs text-gray-500 mt-1">{ui.adminSysRulesNote}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>{ui.adminSysAiGateway}</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">{ui.adminSysHealthy}</p>
            <p className="text-xs text-gray-500 mt-1">{ui.adminSysIntentNote}</p>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-sm mb-1">
              <CheckCircle className="w-4 h-4" />
              <span>{ui.adminSysStorage}</span>
            </div>
            <p className="text-2xl font-black text-saksham-darkText">{ui.adminSysSecured}</p>
            <p className="text-xs text-gray-500 mt-1">{ui.adminSysStorageNote}</p>
          </div>
        </div>
      )}

      {/* Tab 4: Developer Screenshot-to-Gemini Diagnostics */}
      {activeTab === 'diagnostics' && <DeveloperScreenshotDiagnosticPanel />}
    </div>
  );
};
