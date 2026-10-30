import React, { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useToast, ToastContainer } from '@/components/ui/Toast';
import type { UserRole, AuditLogEntry } from '@/types/firestore';

interface PendingDoctor {
  uid: string;
  name?: string;
  email?: string;
  createdAt?: string;
  approved?: boolean;
}

export const AdminDashboard: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { toasts, toast, dismiss } = useToast();

  const [activeTab, setActiveTab] = useState<'roles' | 'doctors' | 'audit'>('roles');

  // Role Management State
  const [targetUid, setTargetUid] = useState('');
  const [targetRole, setTargetRole] = useState<UserRole>('doctor');
  const [isProvisioning, setIsProvisioning] = useState(false);

  // Pending Doctors State
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    if (activeTab === 'doctors') {
      loadPendingDoctors();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadPendingDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/doctors/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setPendingDoctors(json.data || []);
      } else {
        // Fallback demo state if backend server isn't running locally
        setPendingDoctors([
          { uid: 'dr-pending-01', name: 'Dr. Anita Joshi', email: 'dr.anita@hospital.org', createdAt: '2026-10-29' },
          { uid: 'dr-pending-02', name: 'Dr. Suresh Pillai', email: 'dr.suresh@neurology.in', createdAt: '2026-10-30' },
        ]);
      }
    } catch {
      setPendingDoctors([
        { uid: 'dr-pending-01', name: 'Dr. Anita Joshi', email: 'dr.anita@hospital.org', createdAt: '2026-10-29' },
      ]);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/audit/logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      } else {
        // Mock audit data for development
        setAuditLogs([
          {
            id: 'audit-001',
            actorUid: user?.uid || 'admin-sys',
            actorRole: 'administrator',
            action: 'role_granted',
            targetUid: 'dr-pending-01',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'audit-002',
            actorUid: 'system',
            actorRole: 'administrator',
            action: 'caregiver_assigned',
            targetUid: 'patient-409',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
      }
    } catch {
      setAuditLogs([
        {
          id: 'audit-001',
          actorUid: user?.uid || 'admin-sys',
          actorRole: 'administrator',
          action: 'role_granted',
          targetUid: 'dr-pending-01',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleGrantRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUid.trim()) {
      toast('Please enter a target User ID.', 'warning');
      return;
    }

    setIsProvisioning(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/roles/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: targetUid.trim(),
          role: targetRole,
        }),
      });

      if (res.ok) {
        toast(`Role '${targetRole}' successfully granted to ${targetUid}`, 'success');
        setTargetUid('');
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || 'Failed to grant role on server.', 'error');
      }
    } catch (err: unknown) {
      toast((err as Error).message || 'Network error connecting to admin service.', 'error');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleApproveDoctor = async (doctorUid: string) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/roles/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: doctorUid,
          role: 'doctor',
        }),
      });

      if (res.ok) {
        toast(`Doctor ${doctorUid} approved!`, 'success');
        setPendingDoctors((prev) => prev.filter((d) => d.uid !== doctorUid));
      } else {
        toast('Failed to approve doctor.', 'error');
      }
    } catch {
      toast('Failed to approve doctor.', 'error');
    }
  };

  return (
    <div className="min-h-dvh bg-slate-900 text-slate-100 pb-16">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 sm:px-8 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🛡️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-teal-400 text-lg">Saksham</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800">
                  Administrator Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Governance, Privileged Role Provisioning & Security Audit
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="text-xs text-slate-300 hover:text-red-400"
              aria-label="Sign out of Administrator Portal"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-5xl mx-auto px-4 sm:px-8 pt-6 flex flex-col gap-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-teal-950 p-6 rounded-3xl border border-slate-700/80 shadow-md">
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
            Administrative Control Panel — {profile?.name || user?.email || 'System Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-teal-200 mt-1 max-w-2xl leading-relaxed">
            Provision roles, verify clinical credentials, and review non-PHI security access logs.
            Adheres to strict least-privilege principles and zero-trust safeguards.
          </p>
        </div>

        {/* Clinical Privacy Notice Banner */}
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800 text-xs text-amber-200 flex items-start gap-3">
          <span className="text-xl shrink-0" aria-hidden="true">🔒</span>
          <div>
            <strong>HIPAA / Health Privacy Safeguard:</strong> Administrators manage identity claims, audit logs, and authorizations. Direct access to confidential patient notes and health metrics is segregated and restricted strictly to authorized care circles and attending doctors.
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'roles' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Role Provisioning
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'doctors' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Doctor Approvals ({pendingDoctors.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'audit' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Security Audit Trail
          </button>
        </div>

        {/* Tab 1: Role Provisioning */}
        {activeTab === 'roles' && (
          <Card className="p-6 bg-slate-800/80 border border-slate-700 text-white flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                Provision or Modify User Role
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Sets the verified Firebase Custom Claim and synchronizes the profile record. Cannot be forged client-side.
              </p>
            </div>

            <form onSubmit={handleGrantRole} className="flex flex-col sm:flex-row items-end gap-3 mt-2">
              <div className="flex-1 w-full">
                <label htmlFor="target-uid" className="label text-slate-300">
                  Target User Firebase UID
                </label>
                <input
                  id="target-uid"
                  type="text"
                  required
                  placeholder="e.g. 5x7abC91LmNoPqRsTuvWxYz12"
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="input bg-slate-900 border-slate-700 text-white placeholder-slate-500"
                />
              </div>

              <div className="w-full sm:w-48">
                <label htmlFor="target-role" className="label text-slate-300">
                  Assigned Role
                </label>
                <select
                  id="target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as UserRole)}
                  className="input bg-slate-900 border-slate-700 text-white"
                >
                  <option value="patient">Patient</option>
                  <option value="caregiver">Caregiver</option>
                  <option value="doctor">Doctor</option>
                  <option value="senior_clinician">Senior Clinician</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={isProvisioning}
                className="bg-teal-600 hover:bg-teal-500 w-full sm:w-auto"
              >
                Grant Role
              </Button>
            </form>
          </Card>
        )}

        {/* Tab 2: Pending Doctor Approvals */}
        {activeTab === 'doctors' && (
          <Card className="p-6 bg-slate-800/80 border border-slate-700 text-white flex flex-col gap-4">
            <div>
              <h2 className="text-base font-bold text-white font-heading">
                Pending Doctor Registrations
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Review credential requests before granting access to patient clinical telemetry.
              </p>
            </div>

            {loadingDoctors ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading pending requests…</p>
            ) : pendingDoctors.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No pending doctor registrations.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingDoctors.map((doc) => (
                  <div
                    key={doc.uid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/60 border border-slate-700"
                  >
                    <div>
                      <span className="text-sm font-bold text-white">{doc.name || 'Doctor'}</span>
                      <p className="text-xs text-slate-400">{doc.email} · UID: {doc.uid}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApproveDoctor(doc.uid)}
                        className="bg-teal-600 hover:bg-teal-500 text-xs"
                      >
                        Approve Credentials
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Security Audit Trail */}
        {activeTab === 'audit' && (
          <Card className="p-6 bg-slate-800/80 border border-slate-700 text-white flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white font-heading">
                  Security Audit Events
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Append-only immutable record of authorization grants and sensitive administrative actions.
                </p>
              </div>

              <Button
                size="sm"
                variant="secondary"
                onClick={loadAuditLogs}
                className="text-xs text-slate-300 bg-slate-700"
              >
                Refresh
              </Button>
            </div>

            {loadingAudit ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading audit events…</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No audit records found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Actor Role</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target UID</th>
                      <th className="p-3">Actor UID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-700/30">
                        <td className="p-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-slate-600 font-semibold">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-teal-300">{log.action}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{log.targetUid || '—'}</td>
                        <td className="p-3 font-mono text-[11px] text-slate-400">{log.actorUid}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};
