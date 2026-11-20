import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { updateApplicationStatusByAdmin } from '../../lib/firestoreService';
import {
  APPLICATION_STATUS_LABELS,
  CATEGORY_LABELS,
  type Application,
  type ApplicationStatus,
  type Opportunity,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function ManageApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const [oppFilter, setOppFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [reviewing, setReviewing] = useState<Application | null>(null);
  const [nextStatus, setNextStatus] = useState<ApplicationStatus>('under_review');
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) => {
        setApplications(
          snap.docs
            .map((d) => d.data() as Application)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    const unsubOpps = onSnapshot(
      collection(db, 'opportunities'),
      (snap) => setOpportunities(snap.docs.map((d) => d.data() as Opportunity)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'opportunities')
    );

    return () => {
      unsubApps();
      unsubOpps();
    };
  }, []);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      if (oppFilter !== 'all' && a.opportunityId !== oppFilter) return false;
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      return true;
    });
  }, [applications, oppFilter, statusFilter]);

  const openReview = (app: Application) => {
    setReviewing(app);
    setNextStatus(app.status);
    setAdminNotes(app.adminNotes || '');
  };

  const handleSaveDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewing) return;
    setSaving(true);
    try {
      await updateApplicationStatusByAdmin(reviewing, nextStatus, adminNotes);
      setReviewing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Manage Applications
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Filter applications by opportunity or pipeline stage, review candidate resumes, and record
          administrative status decisions.
        </p>
      </div>

      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Filter by Opportunity
          </label>
          <select
            value={oppFilter}
            onChange={(e) => setOppFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Opportunities ({applications.length})</option>
            {opportunities.map((o) => (
              <option key={o.opportunityId} value={o.opportunityId}>
                {o.title} — {o.companyName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Statuses</option>
            {(Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
      </section>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading applications...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No applications match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Code</th>
                  <th className="py-3 px-5">Candidate</th>
                  <th className="py-3 px-5">Opportunity</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((app) => (
                  <tr key={app.applicationId} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {app.applicationCode}
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-950">{app.studentName}</p>
                      <p className="text-slate-500">
                        {app.college} · {app.course}
                      </p>
                    </td>
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{app.opportunityTitle}</p>
                      <p className="text-slate-500">
                        {app.companyName} · {CATEGORY_LABELS[app.category]}
                      </p>
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <StatusTextLabel status={app.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openReview(app)}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Review & Decide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Drawer */}
      {reviewing && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-slate-500">{reviewing.applicationCode}</p>
                <h2 className="text-base font-display font-bold text-slate-950">
                  {reviewing.studentName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReviewing(null)}
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <dl className="grid grid-cols-2 gap-4 text-xs border border-slate-200 rounded-lg p-4 bg-slate-50/70">
                <div className="col-span-2">
                  <dt className="text-slate-500">Opportunity</dt>
                  <dd className="font-semibold text-slate-950 mt-0.5">
                    {reviewing.opportunityTitle} ({reviewing.companyName})
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">{reviewing.studentEmail}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-mono text-slate-900 mt-0.5">
                    {reviewing.studentPhone || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">College</dt>
                  <dd className="text-slate-900 mt-0.5">{reviewing.college}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Course</dt>
                  <dd className="text-slate-900 mt-0.5">{reviewing.course}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Skills</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {reviewing.skills.length > 0 ? reviewing.skills.join(' · ') : 'None'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Resume</dt>
                  <dd className="mt-0.5">
                    <a
                      href={reviewing.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline break-all"
                    >
                      Open Resume ({reviewing.resumeFileName || 'Link'})
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </dd>
                </div>
              </dl>

              {reviewing.coverLetter && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1">Cover Letter</h3>
                  <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5 whitespace-pre-wrap">
                    {reviewing.coverLetter}
                  </p>
                </div>
              )}

              {reviewing.additionalAnswers && reviewing.additionalAnswers.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 mb-1">
                    Screening Responses
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5 list-disc pl-6">
                    {reviewing.additionalAnswers.map((ans, idx) => (
                      <li key={idx}>{ans}</li>
                    ))}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSaveDecision} className="pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-sm font-display font-bold text-slate-950">
                  Record Administrative Decision
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Status
                  </label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reviewer Notes (visible to applicant)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1500}
                    placeholder="e.g. Shortlisted for technical round on Friday at 3 PM IST."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewing(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
                  >
                    {saving ? 'Updating...' : 'Update Status & Notify Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
