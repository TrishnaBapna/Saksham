import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { getPortalUi } from '../../features/portals/utils/portalTranslation.js';
import { getGovernanceUi } from '../../features/portals/utils/governanceTranslation.js';
import {
  AdminGovernanceService,
  GovernanceAuditEntry,
  GovernanceDoctorAssignment,
  GovernanceUserRecord,
  shouldUseAdminSandbox,
} from '../../features/admin/services/adminGovernanceService.js';
import {
  DoctorVerificationStatus,
  UserRole,
} from '../../features/auth/types/auth.types.js';
import {
  ShieldAlert,
  History,
  Lock,
  CheckCircle,
  Bug,
  Stethoscope,
  Users,
  Search,
  RefreshCw,
  Trash2,
  UserCheck,
  UserX,
  MessageSquarePlus,
  Clock,
  FileText,
  ExternalLink,
  AlertTriangle,
  Database,
} from 'lucide-react';
import { DeveloperScreenshotDiagnosticPanel } from '../../features/admin/components/DeveloperScreenshotDiagnosticPanel.js';

type AdminTab = 'users' | 'doctors' | 'audit' | 'system' | 'diagnostics';
type DoctorFilter = 'all' | 'pending' | 'additional_info_required' | 'verified' | 'rejected' | 'suspended';

export const AdminDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { t, language } = useLanguage();
  const ui = getPortalUi(language);
  const govUi = getGovernanceUi(language);
  const isDemo = shouldUseAdminSandbox(currentUser);

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<GovernanceUserRecord[]>([]);
  const [assignments, setAssignments] = useState<GovernanceDoctorAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<GovernanceAuditEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [doctorFilter, setDoctorFilter] = useState<DoctorFilter>('all');

  // Doctor review & patient assignment local inputs
  const [reviewNotesByUid, setReviewNotesByUid] = useState<Record<string, string>>({});
  const [selectedPatientByDoctor, setSelectedPatientByDoctor] = useState<Record<string, string>>({});

  // Profile removal modal state
  const [deleteTargetUser, setDeleteTargetUser] = useState<GovernanceUserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadGovernanceData = useCallback(async () => {
    setIsLoadingData(true);
    setRegistryError(null);
    try {
      const data = await AdminGovernanceService.fetchGovernanceData(currentUser);
      setUsers(data.users);
      setAssignments(data.assignments);
      setAuditLogs(data.auditLogs);
    } catch (err: any) {
      setRegistryError(err?.message || 'Unable to load Firestore user registry.');
    } finally {
      setIsLoadingData(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  // Derived metrics & slices
  const doctors = useMemo(() => users.filter((u) => u.role === 'doctor'), [users]);
  const patients = useMemo(() => users.filter((u) => u.role === 'patient'), [users]);
  const caregivers = useMemo(() => users.filter((u) => u.role === 'caregiver'), [users]);

  const metrics = useMemo(
    () => ({
      pendingDoctors: doctors.filter(
        (d) => d.status === 'pending' || d.status === 'additional_info_required'
      ).length,
      approvedDoctors: doctors.filter((d) => d.status === 'verified').length,
      patients: patients.length,
      caregivers: caregivers.length,
      restricted: users.filter(
        (u) => u.status === 'rejected' || u.status === 'suspended'
      ).length,
    }),
    [doctors, patients, caregivers, users]
  );

  const filteredDoctors = useMemo(() => {
    if (doctorFilter === 'all') return doctors;
    return doctors.filter((d) => d.status === doctorFilter);
  }, [doctors, doctorFilter]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.licenseNumber || '').toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'additional_info_required':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      case 'rejected':
      case 'suspended':
        return 'bg-rose-100 text-rose-900 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (u: GovernanceUserRecord): string => {
    if (u.role === 'doctor') {
      switch (u.status) {
        case 'verified':
          return govUi.statusApprovedLabel;
        case 'pending':
          return govUi.statusPendingLabel;
        case 'additional_info_required':
          return govUi.statusInfoRequiredLabel;
        case 'rejected':
          return govUi.statusRejectedLabel;
        case 'suspended':
          return govUi.statusSuspendedLabel;
      }
    }
    return u.status;
  };

  const handleDoctorDecision = async (
    doctor: GovernanceUserRecord,
    decision: DoctorVerificationStatus
  ) => {
    const note = reviewNotesByUid[doctor.id] || '';
    if (
      (decision === 'REJECTED' || decision === 'ADDITIONAL_INFORMATION_REQUIRED') &&
      !note.trim()
    ) {
      setRegistryError(govUi.docReviewRequiredErr);
      return;
    }

    setUpdatingUid(doctor.id);
    setRegistryError(null);
    setActionBanner(null);
    try {
      const updated = await AdminGovernanceService.reviewDoctorApplication(
        currentUser,
        doctor,
        decision,
        note
      );
      setUsers((prev) => prev.map((u) => (u.id === doctor.id ? updated : u)));
      setActionBanner(`${doctor.name} → ${decision}`);
      await loadGovernanceData();
    } catch (err: any) {
      setRegistryError(err?.message || 'Failed to record verification decision.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleUpdateUserStatus = async (
    targetUser: GovernanceUserRecord,
    nextStatus: 'verified' | 'suspended'
  ) => {
    setUpdatingUid(targetUser.id);
    setRegistryError(null);
    setActionBanner(null);
    try {
      const updated = await AdminGovernanceService.updateUserAccountStatus(
        currentUser,
        targetUser,
        nextStatus
      );
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updated : u)));
      setActionBanner(`${targetUser.name} → ${nextStatus}`);
    } catch (err: any) {
      setRegistryError(err?.message || 'Failed to update account status.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleAssignPatient = async (doctor: GovernanceUserRecord) => {
    const patientId = selectedPatientByDoctor[doctor.id];
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;

    setUpdatingUid(doctor.id);
    setRegistryError(null);
    try {
      const created = await AdminGovernanceService.assignDoctorToPatient(
        currentUser,
        doctor,
        patient
      );
      setAssignments((prev) => [
        created,
        ...prev.filter((a) => a.id !== created.id),
      ]);
      setActionBanner(`${doctor.name} ↔ ${patient.name}`);
    } catch (err: any) {
      setRegistryError(err?.message || 'Unable to assign patient to doctor.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleRevokeAssignment = async (assignment: GovernanceDoctorAssignment) => {
    setUpdatingUid(assignment.doctorId);
    setRegistryError(null);
    try {
      await AdminGovernanceService.revokeDoctorAssignment(currentUser, assignment);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? { ...a, status: 'revoked' } : a))
      );
    } catch (err: any) {
      setRegistryError(err?.message || 'Unable to revoke doctor assignment.');
    } finally {
      setUpdatingUid(null);
    }
  };

  const handleConfirmDeleteProfile = async () => {
    if (!deleteTargetUser) return;
    setIsDeleting(true);
    setRegistryError(null);
    try {
      await AdminGovernanceService.removeUserProfileFromRegistry(
        currentUser,
        deleteTargetUser,
        assignments
      );
      setUsers((prev) => prev.filter((u) => u.id !== deleteTargetUser.id));
      setAssignments((prev) =>
        prev.map((a) =>
          a.doctorId === deleteTargetUser.id || a.patientId === deleteTargetUser.id
            ? { ...a, status: 'revoked' }
            : a
        )
      );
      setActionBanner(`Removed Firestore profile: ${deleteTargetUser.email || deleteTargetUser.name}`);
      setDeleteTargetUser(null);
    } catch (err: any) {
      setRegistryError(err?.message || 'Unable to remove user profile.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-5xl mx-auto space-y-6">
      {/* Demonstration Banner */}
      {isDemo && (
        <div
          data-testid="admin-demo-badge"
          className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl px-4 py-2.5 text-xs font-medium flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <span>{t('admin.demo_badge')}</span>
          </div>
          <span className="text-2xs bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {ui.localSandbox}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-rose-900 rounded-3xl p-6 text-white shadow-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldAlert className="w-4 h-4" />
              <span>{t('admin.dashboard_title')}</span>
            </div>
            <h1 className="text-2xl font-bold">
              {ui.adminHubPrefix} {currentUser?.displayName}
            </h1>
            <p className="text-xs md:text-sm text-gray-300 mt-1">{t('admin.portal_subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={loadGovernanceData}
            disabled={isLoadingData}
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-white/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>{govUi.refreshRegistryBtn}</span>
          </button>
        </div>
      </div>

      {/* Live Governance Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab('doctors');
            setDoctorFilter('pending');
          }}
          className="text-left bg-amber-50 hover:bg-amber-100/70 border border-amber-200 rounded-2xl p-3.5 transition"
        >
          <div className="text-[11px] font-bold text-amber-800 uppercase">{govUi.statPendingDoctors}</div>
          <div className="text-2xl font-black text-amber-950 mt-0.5">{metrics.pendingDoctors}</div>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('doctors');
            setDoctorFilter('verified');
          }}
          className="text-left bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 rounded-2xl p-3.5 transition"
        >
          <div className="text-[11px] font-bold text-emerald-800 uppercase">{govUi.statApprovedDoctors}</div>
          <div className="text-2xl font-black text-emerald-950 mt-0.5">{metrics.approvedDoctors}</div>
        </button>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-purple-800 uppercase">{govUi.statPatients}</div>
          <div className="text-2xl font-black text-purple-950 mt-0.5">{metrics.patients}</div>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-teal-800 uppercase">{govUi.statCaregivers}</div>
          <div className="text-2xl font-black text-teal-950 mt-0.5">{metrics.caregivers}</div>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-rose-800 uppercase">{govUi.statRestricted}</div>
          <div className="text-2xl font-black text-rose-950 mt-0.5">{metrics.restricted}</div>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-950 flex items-start space-x-3">
        <Lock className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>{t('admin.zero_knowledge')}</div>
      </div>

      {actionBanner && (
        <div
          data-testid="admin-action-banner"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center justify-between"
        >
          <span>{actionBanner}</span>
          <button type="button" onClick={() => setActionBanner(null)} className="text-emerald-700 underline text-[11px]">
            OK
          </button>
        </div>
      )}

      {registryError && (
        <div
          data-testid="admin-error-banner"
          className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium"
        >
          {registryError}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
        <button
          type="button"
          data-testid="admin-tab-users"
          onClick={() => setActiveTab('users')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'users' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          <Users className="w-4 h-4 text-purple-600" />
          <span>{t('admin.tab_users')}</span>
        </button>

        <button
          type="button"
          data-testid="admin-tab-doctors"
          onClick={() => setActiveTab('doctors')}
          className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'doctors' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-blue-600" />
          <span>{govUi.tabDoctors}</span>
          {metrics.pendingDoctors > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500 text-white font-bold">
              {metrics.pendingDoctors}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="admin-tab-audit"
          onClick={() => setActiveTab('audit')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          <History className="w-4 h-4 text-slate-600" />
          <span>{t('admin.tab_audit')}</span>
        </button>

        <button
          type="button"
          data-testid="admin-tab-system"
          onClick={() => setActiveTab('system')}
          className={`flex-1 min-w-[110px] py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition ${
            activeTab === 'system' ? 'bg-white text-saksham-darkText shadow-sm' : 'text-gray-600'
          }`}
        >
          {t('admin.tab_system')}
        </button>

        <button
          type="button"
          data-testid="admin-tab-diagnostics"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 text-xs md:text-sm font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
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

          {/* Search & Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                data-testid="admin-user-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={govUi.userSearchPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <select
              aria-label={ui.adminColRole}
              data-testid="admin-role-filter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | UserRole)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-semibold"
            >
              <option value="all">{govUi.roleAll}</option>
              <option value="patient">patient</option>
              <option value="caregiver">caregiver</option>
              <option value="doctor">doctor</option>
              <option value="admin">admin</option>
            </select>

            <select
              aria-label={ui.adminColStatus}
              data-testid="admin-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-semibold"
            >
              <option value="all">{govUi.filterAll}</option>
              <option value="verified">verified</option>
              <option value="pending">pending</option>
              <option value="additional_info_required">additional_info_required</option>
              <option value="rejected">rejected</option>
              <option value="suspended">suspended</option>
            </select>
          </div>

          {isLoadingData ? (
            <div className="py-6 text-center text-xs text-gray-500">{ui.adminLoadingUsers}</div>
          ) : filteredUsers.length === 0 ? (
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
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.uid === u.id;
                    const isProtectedAdmin = u.role === 'admin' || isSelf;
                    return (
                      <tr key={u.id} data-testid={`admin-user-row-${u.id}`} className="hover:bg-gray-50/50">
                        <td className="py-3 px-3">
                          <div className="font-bold text-saksham-darkText">{u.name}</div>
                          <div className="text-[10px] font-mono text-gray-400">{u.id}</div>
                          {u.licenseNumber && (
                            <div className="text-[10px] text-blue-700 font-mono">
                              {u.licenseNumber} {u.specialty ? `• ${u.specialty}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-600">
                          <div>{u.email}</div>
                          {u.joined && <div className="text-[10px] text-gray-400">{u.joined}</div>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-semibold text-[10px] border ${getStatusBadgeStyle(
                              u.status
                            )}`}
                          >
                            {getStatusLabel(u)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                          {u.role === 'doctor' && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTab('doctors');
                                setDoctorFilter('all');
                              }}
                              className="text-blue-700 hover:underline font-bold text-xs"
                            >
                              {govUi.tabDoctors}
                            </button>
                          )}
                          {u.status !== 'verified' ? (
                            <button
                              type="button"
                              disabled={updatingUid === u.id}
                              onClick={() => handleUpdateUserStatus(u, 'verified')}
                              className="text-emerald-700 hover:underline font-bold text-xs disabled:opacity-50"
                            >
                              {u.status === 'suspended' ? ui.adminActivateBtn : ui.adminApproveBtn}
                            </button>
                          ) : !isProtectedAdmin ? (
                            <button
                              type="button"
                              disabled={updatingUid === u.id}
                              onClick={() => handleUpdateUserStatus(u, 'suspended')}
                              className="text-rose-700 hover:underline font-bold text-xs disabled:opacity-50"
                            >
                              {ui.adminSuspendBtn}
                            </button>
                          ) : null}

                          {!isProtectedAdmin && (
                            <button
                              type="button"
                              data-testid={`delete-user-btn-${u.id}`}
                              disabled={updatingUid === u.id}
                              onClick={() => setDeleteTargetUser(u)}
                              className="text-gray-500 hover:text-rose-700 inline-flex items-center gap-0.5 font-semibold text-xs ml-1"
                              title={govUi.btnDeleteProfile}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Doctor Credential Verification & Patient Assignment */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold text-saksham-darkText flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-blue-700" />
              <span>{govUi.docAppsTitle}</span>
            </h2>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['all', govUi.filterAll],
                  ['pending', govUi.filterPending],
                  ['additional_info_required', govUi.filterInfoReq],
                  ['verified', govUi.filterApproved],
                  ['rejected', govUi.filterRejected],
                  ['suspended', govUi.filterSuspended],
                ] as [DoctorFilter, string][]
              ).map(([filterKey, label]) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setDoctorFilter(filterKey)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                    doctorFilter === filterKey
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredDoctors.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">{govUi.docAppsEmpty}</div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((docUser) => {
                const activeDoctorAssignments = assignments.filter(
                  (a) => a.doctorId === docUser.id && a.status === 'active'
                );
                return (
                  <div
                    key={docUser.id}
                    data-testid={`doctor-verification-card-${docUser.id}`}
                    className="p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-4"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm md:text-base font-extrabold text-gray-900">
                            {docUser.name}
                          </h3>
                          <span
                            data-testid={`doctor-status-badge-${docUser.id}`}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadgeStyle(
                              docUser.status
                            )}`}
                          >
                            {getStatusLabel(docUser)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {docUser.email} • <span className="font-mono text-[11px]">{docUser.id}</span>
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-500">
                        {docUser.joined && (
                          <div>
                            {govUi.fieldSubmittedAt}: <span className="font-semibold">{docUser.joined}</span>
                          </div>
                        )}
                        {docUser.reviewedAt && (
                          <div>
                            {govUi.fieldReviewedAt}: <span className="font-semibold">{docUser.reviewedAt}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credentials Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs bg-white p-3.5 rounded-xl border border-gray-200">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldLicense}</span>
                        <span className="font-mono font-bold text-gray-900">{docUser.licenseNumber || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldQualification}</span>
                        <span className="font-semibold text-gray-900">{docUser.qualification || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldAuthority}</span>
                        <span className="font-semibold text-gray-900">{docUser.registrationAuthority || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldSpecialty}</span>
                        <span className="font-semibold text-gray-900">{docUser.specialty || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldInstitution}</span>
                        <span className="font-semibold text-gray-900">{docUser.hospital || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-bold">{govUi.fieldPhone}</span>
                        <span className="font-mono text-gray-900">{docUser.phoneNumber || '—'}</span>
                      </div>
                    </div>

                    {/* Document & Clarification Info */}
                    {(docUser.verificationDocumentName || docUser.applicantResponseNote || docUser.reviewNotes) && (
                      <div className="space-y-2 text-xs">
                        {docUser.verificationDocumentName && (
                          <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-950">
                            <span className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-700" />
                              <span>
                                <strong>{govUi.fieldDocument}:</strong> {docUser.verificationDocumentName}
                              </span>
                            </span>
                            {docUser.verificationDocumentUrl ? (
                              <a
                                href={docUser.verificationDocumentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 font-bold text-blue-800 hover:underline"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-[11px] font-semibold text-blue-700">
                                {docUser.verificationDocumentStatus || 'metadata'}
                              </span>
                            )}
                          </div>
                        )}

                        {docUser.applicantResponseNote && (
                          <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950">
                            <strong>{govUi.fieldApplicantResponse}:</strong> {docUser.applicantResponseNote}
                          </div>
                        )}

                        {docUser.reviewNotes && (
                          <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-950">
                            <strong>{govUi.docReviewNoteLabel}:</strong> {docUser.reviewNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Decision Controls */}
                    <div className="space-y-2.5 pt-2 border-t border-gray-200">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                        {govUi.reviewNoteInputLabel}
                      </label>
                      <input
                        type="text"
                        data-testid={`review-note-input-${docUser.id}`}
                        value={reviewNotesByUid[docUser.id] ?? ''}
                        onChange={(e) =>
                          setReviewNotesByUid((prev) => ({
                            ...prev,
                            [docUser.id]: e.target.value,
                          }))
                        }
                        placeholder={govUi.reviewNotePlaceholder}
                        className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />

                      <div className="flex flex-wrap gap-2">
                        {docUser.status !== 'verified' && (
                          <button
                            type="button"
                            data-testid={`approve-doctor-btn-${docUser.id}`}
                            disabled={updatingUid === docUser.id}
                            onClick={() => handleDoctorDecision(docUser, 'APPROVED')}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{govUi.btnApproveDoctor}</span>
                          </button>
                        )}

                        {docUser.status !== 'verified' && (
                          <button
                            type="button"
                            data-testid={`request-info-doctor-btn-${docUser.id}`}
                            disabled={updatingUid === docUser.id}
                            onClick={() =>
                              handleDoctorDecision(docUser, 'ADDITIONAL_INFORMATION_REQUIRED')
                            }
                            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>{govUi.btnRequestInfo}</span>
                          </button>
                        )}

                        {docUser.status !== 'rejected' && docUser.status !== 'verified' && (
                          <button
                            type="button"
                            data-testid={`reject-doctor-btn-${docUser.id}`}
                            disabled={updatingUid === docUser.id}
                            onClick={() => handleDoctorDecision(docUser, 'REJECTED')}
                            className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{govUi.btnRejectDoctor}</span>
                          </button>
                        )}

                        {docUser.status === 'verified' ? (
                          <button
                            type="button"
                            data-testid={`suspend-doctor-btn-${docUser.id}`}
                            disabled={updatingUid === docUser.id}
                            onClick={() => handleDoctorDecision(docUser, 'SUSPENDED')}
                            className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{govUi.btnSuspendAccount}</span>
                          </button>
                        ) : docUser.status === 'suspended' || docUser.status === 'rejected' ? (
                          <button
                            type="button"
                            data-testid={`reactivate-doctor-btn-${docUser.id}`}
                            disabled={updatingUid === docUser.id}
                            onClick={() => handleDoctorDecision(docUser, 'APPROVED')}
                            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{govUi.btnReactivateAccount}</span>
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Patient Clinical Assignment Section (Approved Doctors Only) */}
                    {docUser.status === 'verified' && (
                      <div className="pt-3 border-t border-gray-200 space-y-2">
                        <div className="text-xs font-bold text-gray-800">
                          {govUi.assignedPatientsLabel} ({activeDoctorAssignments.length})
                        </div>
                        {activeDoctorAssignments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {activeDoctorAssignments.map((assign) => {
                              const pat = users.find((u) => u.id === assign.patientId);
                              return (
                                <span
                                  key={assign.id}
                                  className="inline-flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-emerald-200 text-xs"
                                >
                                  <span className="font-semibold text-gray-800">
                                    {pat?.name || assign.patientId}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeAssignment(assign)}
                                    className="text-rose-700 hover:underline font-bold text-[11px]"
                                  >
                                    {govUi.btnRevokeAssignment}
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 items-center">
                          <select
                            value={selectedPatientByDoctor[docUser.id] || ''}
                            onChange={(e) =>
                              setSelectedPatientByDoctor((prev) => ({
                                ...prev,
                                [docUser.id]: e.target.value,
                              }))
                            }
                            className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs min-w-[210px]"
                          >
                            <option value="">
                              {patients.length === 0 ? govUi.noPatientsToAssign : govUi.selectPatientPlaceholder}
                            </option>
                            {patients.map((pat) => (
                              <option key={pat.id} value={pat.id}>
                                {pat.name} ({pat.email || pat.id})
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            disabled={!selectedPatientByDoctor[docUser.id] || updatingUid === docUser.id}
                            onClick={() => handleAssignPatient(docUser)}
                            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            {govUi.btnAssignPatient}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Audit History Timeline */}
                    {docUser.verificationHistory && docUser.verificationHistory.length > 0 && (
                      <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-600 space-y-1">
                        <div className="font-bold text-gray-700 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{govUi.verificationHistoryTitle}</span>
                        </div>
                        {docUser.verificationHistory.slice(0, 4).map((h, idx) => (
                          <div key={idx} className="flex items-start justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-gray-100">
                            <span>
                              <strong className="text-gray-900">{h.status}</strong>
                              {h.note ? ` — ${h.note}` : ''}
                            </span>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {h.reviewedByName ? `${h.reviewedByName} • ` : ''}
                              {h.timestamp.slice(0, 10)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Audit Logs */}
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
                <div
                  key={log.id}
                  className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 flex items-start justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2 font-mono font-bold text-purple-900 flex-wrap">
                      <span>{log.action}</span>
                      <span className="text-[10px] font-sans bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded">
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {log.actor} • {log.resource}
                    </p>
                    {log.note && <p className="text-gray-700 text-[11px] mt-1">{log.note}</p>}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      log.result.includes('PERMITTED') ||
                      log.result === 'SUCCESS' ||
                      log.result === 'APPROVED' ||
                      log.result === 'ACTIVE' ||
                      log.result.includes('CUSTOM_CLAIMS')
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {log.result}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: System Health & Bootstrap Architecture */}
      {activeTab === 'system' && (
        <div className="space-y-4">
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

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-2 text-xs">
            <div className="flex items-center space-x-2 font-bold text-slate-900">
              <Database className="w-4 h-4 text-slate-700" />
              <span>{govUi.adminBootstrapRefTitle}</span>
            </div>
            <p className="text-gray-600 leading-relaxed">{govUi.adminBootstrapRefSub}</p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1 overflow-x-auto">
              <div>Firestore Path: users/&lt;firebaseAuthUid&gt; → &#123; uid, email, displayName, role: &quot;admin&quot;, status: &quot;verified&quot; &#125;</div>
              <div>CLI Script: cd backend && GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json npm run bootstrap:admin -- --email &lt;email&gt;</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Developer Screenshot-to-Gemini Diagnostics */}
      {activeTab === 'diagnostics' && <DeveloperScreenshotDiagnosticPanel />}

      {/* Safe Account Deletion Confirmation Modal */}
      {deleteTargetUser && (
        <div
          data-testid="admin-delete-confirm-modal"
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center space-x-2 text-rose-700 font-extrabold text-base">
              <AlertTriangle className="w-5 h-5" />
              <span>{govUi.deleteModalTitle}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-0.5">
              <div className="font-bold text-gray-900">{deleteTargetUser.name}</div>
              <div className="text-gray-600">{deleteTargetUser.email}</div>
              <div className="font-mono text-[11px] text-gray-500">
                {deleteTargetUser.role} • {deleteTargetUser.id}
              </div>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed">{govUi.deleteModalHonestNote}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                {govUi.cancelBtn}
              </button>
              <button
                type="button"
                data-testid="confirm-delete-profile-btn"
                onClick={handleConfirmDeleteProfile}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold disabled:opacity-60"
              >
                {govUi.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
