import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  APPLICATION_STATUS_LABELS,
  CATEGORY_LABELS,
  type Application,
  type ApplicationStatus,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function StudentApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'applications'), where('studentUid', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Application)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setApplications(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );
    return () => unsub();
  }, [user]);

  const filtered =
    statusFilter === 'all'
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            My Applications
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track the status of every opportunity you have applied for. Application statuses are
            updated exclusively by reviewing administrators.
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white shrink-0"
        >
          <option value="all">All Statuses ({applications.length})</option>
          {(Object.entries(APPLICATION_STATUS_LABELS) as [ApplicationStatus, string][]).map(
            ([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            )
          )}
        </select>
      </div>

      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="text-base font-display font-bold text-slate-900">
            {applications.length === 0
              ? 'You have not applied to any opportunities yet'
              : 'No applications match the selected status'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Explore verified internships, part-time roles, and live projects to submit your first
            application.
          </p>
          <Link
            to="/student/explore"
            className="inline-block mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
          >
            Explore Opportunities
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Reference ID</th>
                  <th className="py-3 px-5">Opportunity & Company</th>
                  <th className="py-3 px-5">Category</th>
                  <th className="py-3 px-5">Submitted</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Resume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((app) => {
                  const dateLabel = app.createdAt?.toDate
                    ? app.createdAt.toDate().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={app.applicationId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        <div>{app.applicationCode}</div>
                        {app.isDemo && (
                          <span className="text-[10px] font-semibold text-amber-800 uppercase">
                            DEMO APPLICATION
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <Link
                          to={`/student/opportunities/${app.opportunityId}`}
                          className="font-semibold text-slate-950 hover:text-blue-700"
                        >
                          {app.opportunityTitle}
                        </Link>
                        <p className="text-xs text-slate-500 mt-0.5">{app.companyName}</p>
                        {app.isDemo && (
                          <p className="text-[11px] text-amber-800 mt-1">
                            Simulated demo application — not sent to a real employer.
                          </p>
                        )}
                        {app.adminNotes && (
                          <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                            Reviewer Note: {app.adminNotes}
                          </p>
                        )}
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-600 whitespace-nowrap">
                        {CATEGORY_LABELS[app.category]}
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {dateLabel}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <StatusTextLabel status={app.status} />
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <a
                          href={app.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                        >
                          View
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
