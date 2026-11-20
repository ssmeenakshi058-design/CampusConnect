import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  deleteOpportunity,
  updateOpportunityStatus,
  updateReportByAdmin,
} from '../../lib/firestoreService';
import {
  REPORT_REASON_LABELS,
  type OpportunityReport,
  type ReportStatus,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function AdminReportsPage() {
  const [reports, setReports] = useState<OpportunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'reports'),
      (snap) => {
        setReports(
          snap.docs
            .map((d) => d.data() as OpportunityReport)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );
    return () => unsub();
  }, []);

  const handleStatusUpdate = async (report: OpportunityReport, nextStatus: ReportStatus) => {
    setBusyId(report.reportId);
    try {
      const note = noteDrafts[report.reportId] ?? report.adminActionNote ?? '';
      await updateReportByAdmin(report.reportId, nextStatus, note);
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectAndResolve = async (report: OpportunityReport) => {
    setBusyId(report.reportId);
    try {
      await updateOpportunityStatus(report.opportunityId, 'rejected', false);
      await updateReportByAdmin(
        report.reportId,
        'resolved',
        noteDrafts[report.reportId] || 'Opportunity rejected and removed from public search.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteListing = async (report: OpportunityReport) => {
    setBusyId(report.reportId);
    try {
      await deleteOpportunity(report.opportunityId).catch(() => undefined);
      await updateReportByAdmin(
        report.reportId,
        'resolved',
        noteDrafts[report.reportId] || 'Fraudulent or misleading listing permanently deleted.'
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Safety Reports & Moderation
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Investigate opportunities flagged by students and reject or delete misleading listings.
        </p>
      </div>

      {loading ? (
        <div className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">No safety reports filed</p>
          <p className="mt-1 text-xs text-slate-500">
            Any suspicious opportunity flagged by students will appear here for investigation.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <article
              key={rep.reportId}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Reported by <strong className="text-slate-800">{rep.reportedByName}</strong> ·{' '}
                    {REPORT_REASON_LABELS[rep.reason]}
                  </p>
                  <h2 className="mt-1 text-base font-display font-bold text-slate-950">
                    {rep.opportunityTitle} — {rep.companyName}
                  </h2>
                </div>
                <StatusTextLabel status={rep.status} />
              </div>

              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                {rep.details}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="Investigation note..."
                  value={noteDrafts[rep.reportId] ?? rep.adminActionNote ?? ''}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({ ...prev, [rep.reportId]: e.target.value }))
                  }
                  className="lg:col-span-5 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
                <div className="lg:col-span-7 flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={busyId === rep.reportId}
                    onClick={() => handleStatusUpdate(rep, 'investigating')}
                    className="px-3 py-1.5 text-xs font-semibold text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-50"
                  >
                    Mark Investigating
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rep.reportId}
                    onClick={() => handleStatusUpdate(rep, 'dismissed')}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rep.reportId}
                    onClick={() => handleRejectAndResolve(rep)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                  >
                    Unpublish Listing
                  </button>
                  <button
                    type="button"
                    disabled={busyId === rep.reportId}
                    onClick={() => handleDeleteListing(rep)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800"
                  >
                    Delete Listing
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
