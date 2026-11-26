import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AuthUser } from '../../auth/types/auth.types.js';
import { useLanguage } from '../../../context/LanguageContext.js';
import { getRelationshipUi } from '../../portals/utils/relationshipManagementTranslation.js';
import { GovernanceUserRecord } from '../services/adminGovernanceService.js';
import { RelationshipManagementService } from '../../relationships/services/relationshipService.js';
import {
  CaregiverPatientRelationshipRecord,
  CaregiverRelationshipPermissions,
  ConsentBasis,
  DEFAULT_CAREGIVER_REL_PERMISSIONS,
  DoctorPatientRelationshipRecord,
  RelationshipAuditLogRecord,
  RelationshipRemovalRequestRecord,
  RelationshipStatus,
} from '../../relationships/types/relationship.types.js';
import {
  Stethoscope,
  HeartHandshake,
  Search,
  UserCheck,
  UserX,
  AlertTriangle,
  MessageSquarePlus,
  RefreshCw,
  History,
  ShieldAlert,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';

interface PatientRelationshipManagementPanelProps {
  currentUser: AuthUser | null;
  users: GovernanceUserRecord[];
}

export const PatientRelationshipManagementPanel: React.FC<
  PatientRelationshipManagementPanelProps
> = ({ currentUser, users }) => {
  const { language } = useLanguage();
  const relUi = getRelationshipUi(language);

  const [subtab, setSubtab] = useState<'doctor' | 'caregiver' | 'audit' | 'reports'>('doctor');
  const [statusFilter, setStatusFilter] = useState<'all' | RelationshipStatus>('all');
  const [accountSearch, setAccountSearch] = useState('');

  const [doctorAssignments, setDoctorAssignments] = useState<DoctorPatientRelationshipRecord[]>([]);
  const [caregiverConnections, setCaregiverConnections] = useState<
    CaregiverPatientRelationshipRecord[]
  >([]);
  const [auditLogs, setAuditLogs] = useState<RelationshipAuditLogRecord[]>([]);
  const [removalRequests, setRemovalRequests] = useState<RelationshipRemovalRequestRecord[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Doctor creation form state
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDocPatientId, setSelectedDocPatientId] = useState('');
  const [docRelType, setDocRelType] = useState('primary_clinician');
  const [docConsentBasis, setDocConsentBasis] = useState<ConsentBasis>('patient_informed_consent');
  const [docConsentRef, setDocConsentRef] = useState('');
  const [docReason, setDocReason] = useState('');

  // Caregiver creation form state
  const [selectedCaregiverId, setSelectedCaregiverId] = useState('');
  const [selectedCgPatientId, setSelectedCgPatientId] = useState('');
  const [cgRelType, setCgRelType] = useState('daughter');
  const [cgConsentBasis, setCgConsentBasis] = useState<ConsentBasis>('patient_informed_consent');
  const [cgConsentRef, setCgConsentRef] = useState('');
  const [cgReason, setCgReason] = useState('');
  const [cgPermissions, setCgPermissions] = useState<CaregiverRelationshipPermissions>({
    ...DEFAULT_CAREGIVER_REL_PERMISSIONS,
  });

  // Per-relationship action notes & reassignment targets
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [reassignTargets, setReassignTargets] = useState<Record<string, string>>({});
  const [reportResolutionNotes, setReportResolutionNotes] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await RelationshipManagementService.fetchAllRelationshipsAndLogs(currentUser);
      setDoctorAssignments(data.doctorAssignments);
      setCaregiverConnections(data.caregiverRelationships);
      setAuditLogs(data.auditLogs);
      setRemovalRequests(data.removalRequests);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to load relationship records.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const queryLower = accountSearch.trim().toLowerCase();
  const matchesQuery = useCallback(
    (u: GovernanceUserRecord) => {
      if (!queryLower) return true;
      return (
        u.name.toLowerCase().includes(queryLower) ||
        u.email.toLowerCase().includes(queryLower) ||
        u.id.toLowerCase().includes(queryLower) ||
        (u.licenseNumber || '').toLowerCase().includes(queryLower)
      );
    },
    [queryLower]
  );

  const doctors = useMemo(
    () => users.filter((u) => u.role === 'doctor' && matchesQuery(u)),
    [users, matchesQuery]
  );
  const approvedDoctors = useMemo(
    () => users.filter((u) => u.role === 'doctor' && u.status === 'verified'),
    [users]
  );
  const caregivers = useMemo(
    () => users.filter((u) => u.role === 'caregiver' && matchesQuery(u)),
    [users, matchesQuery]
  );
  const patients = useMemo(
    () => users.filter((u) => u.role === 'patient' && matchesQuery(u)),
    [users, matchesQuery]
  );

  const filteredDoctorAssignments = useMemo(
    () =>
      doctorAssignments.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (!queryLower) return true;
        return (
          (item.doctorName || '').toLowerCase().includes(queryLower) ||
          (item.patientName || '').toLowerCase().includes(queryLower) ||
          item.doctorId.toLowerCase().includes(queryLower) ||
          item.patientId.toLowerCase().includes(queryLower) ||
          (item.doctorLicenseNumber || '').toLowerCase().includes(queryLower)
        );
      }),
    [doctorAssignments, statusFilter, queryLower]
  );

  const filteredCaregiverConnections = useMemo(
    () =>
      caregiverConnections.filter((item) => {
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;
        if (!queryLower) return true;
        return (
          (item.caregiverName || '').toLowerCase().includes(queryLower) ||
          (item.patientName || '').toLowerCase().includes(queryLower) ||
          item.caregiverId.toLowerCase().includes(queryLower) ||
          item.patientId.toLowerCase().includes(queryLower)
        );
      }),
    [caregiverConnections, statusFilter, queryLower]
  );

  const pendingRemovalReports = useMemo(
    () => removalRequests.filter((r) => r.status === 'pending'),
    [removalRequests]
  );

  const getStatusLabel = (status: RelationshipStatus) => {
    switch (status) {
      case 'active':
        return relUi.statusActive;
      case 'pending':
        return relUi.statusPending;
      case 'additional_info_required':
        return relUi.statusInfoRequired;
      case 'rejected':
        return relUi.statusRejected;
      case 'suspended':
        return relUi.statusSuspended;
      case 'revoked':
        return relUi.statusRevoked;
    }
  };

  const getStatusStyle = (status: RelationshipStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 'pending':
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 'additional_info_required':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      case 'rejected':
      case 'suspended':
      case 'revoked':
      default:
        return 'bg-rose-100 text-rose-900 border-rose-200';
    }
  };

  const handleSubmitDoctorAssignment = async (initialStatus: 'pending' | 'active') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const doctor = users.find((u) => u.id === selectedDoctorId);
    const patient = users.find((u) => u.id === selectedDocPatientId);
    if (!doctor || !patient) {
      setErrorMsg('Please select both a doctor and a patient account.');
      return;
    }

    setBusyId('create-doctor');
    try {
      const created = await RelationshipManagementService.createOrUpdateDoctorAssignment(
        currentUser,
        {
          doctor,
          patient,
          relationshipType: docRelType,
          initialStatus,
          reason: docReason,
          consentBasis: docConsentBasis,
          consentReference: docConsentRef,
        }
      );
      setSuccessMsg(`${created.doctorName} ↔ ${created.patientName}: ${getStatusLabel(created.status)}`);
      setDocReason('');
      setDocConsentRef('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save doctor–patient assignment.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTransitionDoctor = async (
    record: DoctorPatientRelationshipRecord,
    nextStatus: RelationshipStatus
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(record.id);
    try {
      const docUser = users.find((u) => u.id === record.doctorId);
      const updated = await RelationshipManagementService.transitionDoctorAssignmentStatus(
        currentUser,
        record,
        nextStatus,
        decisionNotes[record.id] || '',
        docUser?.status
      );
      setSuccessMsg(`${updated.doctorName || updated.doctorId} → ${getStatusLabel(updated.status)}`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to update doctor assignment status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReassignDoctor = async (previous: DoctorPatientRelationshipRecord) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const newDocId = reassignTargets[previous.id];
    const newDoctor = users.find((u) => u.id === newDocId);
    const patient =
      users.find((u) => u.id === previous.patientId) ||
      ({
        id: previous.patientId,
        uid: previous.patientId,
        name: previous.patientName || previous.patientId,
        email: previous.patientEmail || '',
        role: 'patient',
        status: 'verified',
        joined: '',
      } as GovernanceUserRecord);

    if (!newDoctor) {
      setErrorMsg('Select a replacement approved doctor first.');
      return;
    }

    setBusyId(previous.id);
    try {
      const result = await RelationshipManagementService.reassignPatientDoctor(currentUser, {
        previousAssignment: previous,
        newDoctor,
        patient,
        reason: decisionNotes[previous.id] || 'Administrative clinical reassignment',
      });
      setSuccessMsg(
        `Reassigned ${patient.name}: ${previous.doctorName || previous.doctorId} → ${result.activatedNew.doctorName}`
      );
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to reassign doctor.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitCaregiverConnection = async (initialStatus: 'pending' | 'active') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const caregiver = users.find((u) => u.id === selectedCaregiverId);
    const patient = users.find((u) => u.id === selectedCgPatientId);
    if (!caregiver || !patient) {
      setErrorMsg('Please select both a caregiver and a patient account.');
      return;
    }

    setBusyId('create-caregiver');
    try {
      const created = await RelationshipManagementService.createOrUpdateCaregiverConnection(
        currentUser,
        {
          caregiver,
          patient,
          relationshipType: cgRelType,
          initialStatus,
          consentBasis: cgConsentBasis,
          consentReference: cgConsentRef,
          permissions: cgPermissions,
          reason: cgReason,
        }
      );
      setSuccessMsg(`${created.caregiverName} ↔ ${created.patientName}: ${getStatusLabel(created.status)}`);
      setCgReason('');
      setCgConsentRef('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to save caregiver–patient connection.');
    } finally {
      setBusyId(null);
    }
  };

  const handleTransitionCaregiver = async (
    record: CaregiverPatientRelationshipRecord,
    nextStatus: RelationshipStatus
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(record.id);
    try {
      const updated = await RelationshipManagementService.transitionCaregiverConnectionStatus(
        currentUser,
        record,
        nextStatus,
        decisionNotes[record.id] || ''
      );
      setSuccessMsg(`${updated.caregiverName || updated.caregiverId} → ${getStatusLabel(updated.status)}`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to update caregiver connection status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResolveReport = async (
    report: RelationshipRemovalRequestRecord,
    action: 'approve_removal' | 'dismiss'
  ) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setBusyId(report.id);
    try {
      await RelationshipManagementService.resolveRemovalRequest(
        currentUser,
        report,
        action,
        reportResolutionNotes[report.id] || '',
        doctorAssignments,
        caregiverConnections
      );
      setSuccessMsg(`Resolved report for ${report.counterpartyName || report.relationshipId}`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to resolve report.');
    } finally {
      setBusyId(null);
    }
  };

  const togglePermissionKey = (key: keyof CaregiverRelationshipPermissions) => {
    setCgPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <section
      data-testid="patient-relationship-management-section"
      className="bg-white rounded-3xl p-6 border border-gray-200 shadow-soft-purple space-y-5"
    >
      {/* Header & Refresh */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-saksham-darkText flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-700" />
            <span>{relUi.relMgmtTitle}</span>
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">{relUi.relMgmtSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-800 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Banners */}
      {successMsg && (
        <div
          data-testid="rel-success-banner"
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div
          data-testid="rel-error-banner"
          className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 font-medium"
        >
          {errorMsg}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="rel-account-search"
            value={accountSearch}
            onChange={(e) => setAccountSearch(e.target.value)}
            placeholder="Search patients, doctors, or caregivers by name, email, UID, or registration ID..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <select
          aria-label="Filter relationship status"
          data-testid="rel-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | RelationshipStatus)}
          className="px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white font-semibold"
        >
          <option value="all">All Statuses</option>
          <option value="pending">{relUi.statusPending}</option>
          <option value="active">{relUi.statusActive}</option>
          <option value="additional_info_required">{relUi.statusInfoRequired}</option>
          <option value="rejected">{relUi.statusRejected}</option>
          <option value="suspended">{relUi.statusSuspended}</option>
          <option value="revoked">{relUi.statusRevoked}</option>
        </select>
      </div>

      {/* Subtabs */}
      <div className="flex flex-wrap gap-1.5 bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
        <button
          type="button"
          data-testid="rel-subtab-doctor"
          onClick={() => setSubtab('doctor')}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subtab === 'doctor' ? 'bg-white text-blue-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-blue-700" />
          <span>{relUi.subtabDoctorPatient}</span>
        </button>

        <button
          type="button"
          data-testid="rel-subtab-caregiver"
          onClick={() => setSubtab('caregiver')}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subtab === 'caregiver' ? 'bg-white text-teal-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <HeartHandshake className="w-4 h-4 text-teal-700" />
          <span>{relUi.subtabCaregiverPatient}</span>
        </button>

        <button
          type="button"
          data-testid="rel-subtab-reports"
          onClick={() => setSubtab('reports')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subtab === 'reports' ? 'bg-white text-rose-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{relUi.subtabRemovalReports}</span>
          {pendingRemovalReports.length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-600 text-white">
              {pendingRemovalReports.length}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="rel-subtab-audit"
          onClick={() => setSubtab('audit')}
          className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subtab === 'audit' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-600'
          }`}
        >
          <History className="w-4 h-4 text-slate-700" />
          <span>{relUi.subtabAuditHistory}</span>
        </button>
      </div>

      {/* Subtab 1: Doctor-Patient Assignments */}
      {subtab === 'doctor' && (
        <div className="space-y-5">
          {/* Creation Card */}
          <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
            <h3 className="text-sm font-extrabold text-blue-950">{relUi.createDocAssignTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.selectDoctorLabel}</label>
                <select
                  data-testid="rel-select-doctor"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select Doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.licenseNumber || 'No License'} • {d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.selectPatientLabel}</label>
                <select
                  data-testid="rel-select-doc-patient"
                  value={selectedDocPatientId}
                  onChange={(e) => setSelectedDocPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select Patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.relTypeLabel}</label>
                <select
                  value={docRelType}
                  onChange={(e) => setDocRelType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="primary_clinician">Primary Clinician</option>
                  <option value="consulting_neurologist">Consulting Neurologist</option>
                  <option value="geriatric_specialist">Geriatric Specialist</option>
                  <option value="rehabilitation_physician">Rehabilitation Physician</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.consentBasisLabel}</label>
                <select
                  value={docConsentBasis}
                  onChange={(e) => setDocConsentBasis(e.target.value as ConsentBasis)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="patient_informed_consent">{relUi.consentPatientInformed}</option>
                  <option value="legal_representative_authorization">{relUi.consentLegalRep}</option>
                  <option value="hospital_clinical_referral">{relUi.consentHospitalReferral}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.consentRefLabel}</label>
                <input
                  type="text"
                  data-testid="rel-doc-consent-ref"
                  value={docConsentRef}
                  onChange={(e) => setDocConsentRef(e.target.value)}
                  placeholder={relUi.consentRefPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.reasonLabel}</label>
                <input
                  type="text"
                  data-testid="rel-doc-reason-input"
                  value={docReason}
                  onChange={(e) => setDocReason(e.target.value)}
                  placeholder={relUi.reasonPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                />
              </div>
            </div>

            {docConsentBasis === 'legal_representative_authorization' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                {relUi.legalAuthRequiredWarning}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="rel-doc-create-pending-btn"
                disabled={busyId === 'create-doctor'}
                onClick={() => handleSubmitDoctorAssignment('pending')}
                className="px-3.5 py-2 rounded-xl border border-blue-300 bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold"
              >
                {relUi.btnCreatePending}
              </button>
              <button
                type="button"
                data-testid="rel-doc-approve-create-btn"
                disabled={busyId === 'create-doctor'}
                onClick={() => handleSubmitDoctorAssignment('active')}
                className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold"
              >
                {relUi.btnApproveActivate}
              </button>
            </div>
          </div>

          {/* List of Doctor-Patient Assignments */}
          <div className="space-y-3">
            {filteredDoctorAssignments.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No doctor–patient assignment records match this filter.
              </div>
            ) : (
              filteredDoctorAssignments.map((rec) => {
                const isBusy = busyId === rec.id;
                return (
                  <div
                    key={rec.id}
                    data-testid={`rel-doc-card-${rec.id}`}
                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-gray-900">
                            {rec.doctorName || rec.doctorId} ↔ {rec.patientName || rec.patientId}
                          </span>
                          <span
                            data-testid={`rel-doc-status-${rec.id}`}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(
                              rec.status
                            )}`}
                          >
                            {getStatusLabel(rec.status)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Type: <span className="font-semibold">{rec.relationshipType}</span> • ID:{' '}
                          <span className="font-mono">{rec.id}</span>
                          {rec.doctorLicenseNumber ? ` • License: ${rec.doctorLicenseNumber}` : ''}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 text-right">
                        {rec.approvedAt && <div>Approved: {rec.approvedAt.slice(0, 10)}</div>}
                        {rec.approvedByAdminUid && <div>Admin: {rec.approvedByAdminName || rec.approvedByAdminUid}</div>}
                      </div>
                    </div>

                    {(rec.reason || rec.consentReference) && (
                      <div className="p-2.5 bg-white rounded-xl border border-gray-200 space-y-1 text-[11px] text-gray-700">
                        {rec.consentReference && (
                          <div>
                            <strong>Authorisation / Consent:</strong> {rec.consentBasis} ({rec.consentReference})
                          </div>
                        )}
                        {rec.reason && (
                          <div>
                            <strong>Reason / Notes:</strong> {rec.reason}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        data-testid={`rel-doc-note-${rec.id}`}
                        value={decisionNotes[rec.id] || ''}
                        onChange={(e) =>
                          setDecisionNotes((prev) => ({ ...prev, [rec.id]: e.target.value }))
                        }
                        placeholder={relUi.reasonPlaceholder}
                        className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-doc-approve-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionDoctor(rec, 'active')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{relUi.btnApproveActivate}</span>
                          </button>
                        )}
                        {rec.status !== 'additional_info_required' && rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-doc-inforeq-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionDoctor(rec, 'additional_info_required')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold flex items-center gap-1"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5" />
                            <span>{relUi.btnRequestInfo}</span>
                          </button>
                        )}
                        {rec.status !== 'rejected' && rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-doc-reject-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionDoctor(rec, 'rejected')}
                            className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold flex items-center gap-1"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>{relUi.btnReject}</span>
                          </button>
                        )}
                        {rec.status === 'active' && (
                          <>
                            <button
                              type="button"
                              data-testid={`rel-doc-suspend-${rec.id}`}
                              disabled={isBusy}
                              onClick={() => handleTransitionDoctor(rec, 'suspended')}
                              className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold"
                            >
                              {relUi.btnSuspend}
                            </button>
                            <button
                              type="button"
                              data-testid={`rel-doc-revoke-${rec.id}`}
                              disabled={isBusy}
                              onClick={() => handleTransitionDoctor(rec, 'revoked')}
                              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                            >
                              {relUi.btnRevoke}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Reassign Doctor Bar */}
                    {rec.status === 'active' && approvedDoctors.length > 1 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-700" />
                        <span className="font-bold text-gray-700">{relUi.btnReassignDoctor}:</span>
                        <select
                          value={reassignTargets[rec.id] || ''}
                          onChange={(e) =>
                            setReassignTargets((prev) => ({ ...prev, [rec.id]: e.target.value }))
                          }
                          className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-xs"
                        >
                          <option value="">{relUi.reassignSelectNewDoctor}</option>
                          {approvedDoctors
                            .filter((d) => d.id !== rec.doctorId)
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.specialty || d.licenseNumber})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          data-testid={`rel-doc-reassign-${rec.id}`}
                          disabled={!reassignTargets[rec.id] || isBusy}
                          onClick={() => handleReassignDoctor(rec)}
                          className="px-3 py-1 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold disabled:opacity-50"
                        >
                          {relUi.btnConfirmReassign}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Caregiver-Patient Connections */}
      {subtab === 'caregiver' && (
        <div className="space-y-5">
          {/* Creation Card */}
          <div className="p-4 rounded-2xl border border-teal-200 bg-teal-50/40 space-y-3">
            <h3 className="text-sm font-extrabold text-teal-950">{relUi.createCgConnTitle}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.selectCaregiverLabel}</label>
                <select
                  data-testid="rel-select-caregiver"
                  value={selectedCaregiverId}
                  onChange={(e) => setSelectedCaregiverId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select Caregiver...</option>
                  {caregivers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email || c.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.selectPatientLabel}</label>
                <select
                  data-testid="rel-select-cg-patient"
                  value={selectedCgPatientId}
                  onChange={(e) => setSelectedCgPatientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="">Select Patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.email || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.relTypeLabel}</label>
                <select
                  data-testid="rel-cg-type-select"
                  value={cgRelType}
                  onChange={(e) => setCgRelType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="daughter">Daughter</option>
                  <option value="son">Son</option>
                  <option value="spouse">Spouse</option>
                  <option value="family_member">Family Member</option>
                  <option value="relative">Relative</option>
                  <option value="legal_representative">Legal Representative</option>
                  <option value="professional_caregiver">Professional Caregiver</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.consentBasisLabel}</label>
                <select
                  data-testid="rel-cg-consent-basis"
                  value={cgConsentBasis}
                  onChange={(e) => setCgConsentBasis(e.target.value as ConsentBasis)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                >
                  <option value="patient_informed_consent">{relUi.consentPatientInformed}</option>
                  <option value="legal_representative_authorization">{relUi.consentLegalRep}</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.consentRefLabel}</label>
                <input
                  type="text"
                  data-testid="rel-cg-consent-ref"
                  value={cgConsentRef}
                  onChange={(e) => setCgConsentRef(e.target.value)}
                  placeholder={relUi.consentRefPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">{relUi.reasonLabel}</label>
                <input
                  type="text"
                  data-testid="rel-cg-reason-input"
                  value={cgReason}
                  onChange={(e) => setCgReason(e.target.value)}
                  placeholder={relUi.reasonPlaceholder}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white"
                />
              </div>
            </div>

            {cgConsentBasis === 'legal_representative_authorization' && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                {relUi.legalAuthRequiredWarning}
              </div>
            )}

            {/* Granular Permissions Grid */}
            <div className="p-3 bg-white rounded-xl border border-teal-100 space-y-2">
              <div className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">
                {relUi.permissionsLabel}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(
                  [
                    ['canViewDashboard', 'View Permitted Dashboard'],
                    ['canManageRoutines', 'Manage Routines'],
                    ['canMonitorActivities', 'Monitor Activities'],
                    ['canReceiveAlerts', 'Safe Zone & Reminders'],
                    ['canAssistMemoryCues', 'Family Memory Cues'],
                    ['canCommunicateWithDoctor', 'Doctor Updates'],
                    ['canReadCalendar', 'Read Calendar'],
                    ['canCreateCalendarEvents', 'Create Calendar'],
                    ['canViewRestrictedClinical', 'Restricted Clinical Notes'],
                  ] as [keyof CaregiverRelationshipPermissions, string][]
                ).map(([permKey, permLabel]) => (
                  <label key={permKey} className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(cgPermissions[permKey])}
                      onChange={() => togglePermissionKey(permKey)}
                      className="rounded border-gray-300 text-teal-700"
                    />
                    <span className="text-gray-700">{permLabel}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="rel-cg-create-pending-btn"
                disabled={busyId === 'create-caregiver'}
                onClick={() => handleSubmitCaregiverConnection('pending')}
                className="px-3.5 py-2 rounded-xl border border-teal-300 bg-white hover:bg-teal-50 text-teal-900 text-xs font-bold"
              >
                {relUi.btnCreatePending}
              </button>
              <button
                type="button"
                data-testid="rel-cg-approve-create-btn"
                disabled={busyId === 'create-caregiver'}
                onClick={() => handleSubmitCaregiverConnection('active')}
                className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold"
              >
                {relUi.btnApproveActivate}
              </button>
            </div>
          </div>

          {/* Caregiver Connections List */}
          <div className="space-y-3">
            {filteredCaregiverConnections.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">
                No caregiver–patient connections match this filter.
              </div>
            ) : (
              filteredCaregiverConnections.map((rec) => {
                const isBusy = busyId === rec.id;
                return (
                  <div
                    key={rec.id}
                    data-testid={`rel-cg-card-${rec.id}`}
                    className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-gray-900">
                            {rec.caregiverName || rec.caregiverId} ↔ {rec.patientName || rec.patientId}
                          </span>
                          <span
                            data-testid={`rel-cg-status-${rec.id}`}
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusStyle(
                              rec.status
                            )}`}
                          >
                            {getStatusLabel(rec.status)}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Relationship: <span className="font-semibold capitalize">{rec.relationshipType}</span> • ID:{' '}
                          <span className="font-mono">{rec.id}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-500 text-right">
                        {rec.approvedAt && <div>Approved: {rec.approvedAt.slice(0, 10)}</div>}
                        {rec.approvedByAdminUid && <div>Admin: {rec.approvedByAdminName || rec.approvedByAdminUid}</div>}
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-gray-200 space-y-1 text-[11px] text-gray-700">
                      <div>
                        <strong>Consent Basis:</strong> {rec.consentBasis}
                        {rec.consentReference ? ` (${rec.consentReference})` : ''}
                      </div>
                      {rec.reason && (
                        <div>
                          <strong>Notes / Reason:</strong> {rec.reason}
                        </div>
                      )}
                      <div>
                        <strong>Permissions:</strong>{' '}
                        {rec.permissions.canManageRoutines ? 'Routines • ' : ''}
                        {rec.permissions.canReceiveAlerts ? 'Alerts • ' : ''}
                        {rec.permissions.canReadCalendar ? 'Calendar • ' : ''}
                        {rec.permissions.canCommunicateWithDoctor ? 'Doctor Updates • ' : ''}
                        {rec.permissions.canViewRestrictedClinical
                          ? 'Restricted Clinical'
                          : 'Standard Care Only'}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        data-testid={`rel-cg-note-${rec.id}`}
                        value={decisionNotes[rec.id] || ''}
                        onChange={(e) =>
                          setDecisionNotes((prev) => ({ ...prev, [rec.id]: e.target.value }))
                        }
                        placeholder={relUi.reasonPlaceholder}
                        className="flex-1 px-3 py-1.5 bg-white rounded-xl border border-gray-300 text-xs"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-cg-approve-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionCaregiver(rec, 'active')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                          >
                            {relUi.btnApproveActivate}
                          </button>
                        )}
                        {rec.status !== 'additional_info_required' && rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-cg-inforeq-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionCaregiver(rec, 'additional_info_required')}
                            className="px-3 py-1.5 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-bold"
                          >
                            {relUi.btnRequestInfo}
                          </button>
                        )}
                        {rec.status !== 'rejected' && rec.status !== 'active' && (
                          <button
                            type="button"
                            data-testid={`rel-cg-reject-${rec.id}`}
                            disabled={isBusy}
                            onClick={() => handleTransitionCaregiver(rec, 'rejected')}
                            className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                          >
                            {relUi.btnReject}
                          </button>
                        )}
                        {rec.status === 'active' && (
                          <>
                            <button
                              type="button"
                              data-testid={`rel-cg-suspend-${rec.id}`}
                              disabled={isBusy}
                              onClick={() => handleTransitionCaregiver(rec, 'suspended')}
                              className="px-3 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold"
                            >
                              {relUi.btnSuspend}
                            </button>
                            <button
                              type="button"
                              data-testid={`rel-cg-revoke-${rec.id}`}
                              disabled={isBusy}
                              onClick={() => handleTransitionCaregiver(rec, 'revoked')}
                              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                            >
                              {relUi.btnRevoke}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Subtab 3: Patient Incorrect Connection / Removal Reports */}
      {subtab === 'reports' && (
        <div className="space-y-3">
          {removalRequests.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">
              No patient removal or connection dispute reports recorded.
            </div>
          ) : (
            removalRequests.map((rep) => (
              <div
                key={rep.id}
                data-testid={`rel-report-card-${rep.id}`}
                className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold text-gray-900">
                    Patient: {rep.patientName || rep.patientId} → {rep.counterpartyName || rep.counterpartyId} (
                    {rep.counterpartyRole})
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rep.status === 'pending'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>
                <p className="text-gray-700">
                  <strong>Patient Report:</strong> {rep.reason}
                </p>
                {rep.status === 'pending' ? (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      value={reportResolutionNotes[rep.id] || ''}
                      onChange={(e) =>
                        setReportResolutionNotes((prev) => ({ ...prev, [rep.id]: e.target.value }))
                      }
                      placeholder="Enter Admin resolution note..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs"
                    />
                    <button
                      type="button"
                      disabled={busyId === rep.id}
                      onClick={() => handleResolveReport(rep, 'approve_removal')}
                      className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold"
                    >
                      Approve Removal & Revoke Access
                    </button>
                    <button
                      type="button"
                      disabled={busyId === rep.id}
                      onClick={() => handleResolveReport(rep, 'dismiss')}
                      className="px-3 py-1.5 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-bold"
                    >
                      Dismiss Report
                    </button>
                  </div>
                ) : (
                  rep.adminResolutionNote && (
                    <div className="text-[11px] text-gray-600">
                      <strong>Admin Resolution:</strong> {rep.adminResolutionNote}
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Subtab 4: Immutable Relationship Audit History */}
      {subtab === 'audit' && (
        <div className="space-y-2.5">
          {auditLogs.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500">
              No relationship audit entries recorded yet.
            </div>
          ) : (
            auditLogs.map((entry) => (
              <div
                key={entry.id}
                data-testid={`rel-audit-row-${entry.id}`}
                className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 flex items-start justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-mono font-bold text-slate-900">
                    {entry.action}{' '}
                    <span className="font-sans text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">
                      {entry.previousStatus} → {entry.newStatus}
                    </span>
                  </div>
                  <div className="text-gray-700">
                    {entry.counterpartyName || entry.counterpartyId} ({entry.counterpartyRole}) ↔{' '}
                    {entry.patientName || entry.patientId}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Admin: {entry.actorAdminName || entry.actorAdminUid} • Requested by:{' '}
                    {entry.requestedByUid || 'admin'}
                    {entry.consentReference ? ` • Ref: ${entry.consentReference}` : ''}
                  </div>
                  {entry.reason && <div className="text-[11px] text-gray-700">{entry.reason}</div>}
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">
                  {entry.timestamp.slice(0, 19).replace('T', ' ')}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
};
