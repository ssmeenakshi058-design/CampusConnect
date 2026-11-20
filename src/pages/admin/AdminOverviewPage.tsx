import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Plus } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { seedDehradunStarterCatalog } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type {
  Application,
  Opportunity,
  OpportunityReport,
  StudentProfile,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function AdminOverviewPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<OpportunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'studentProfiles'),
      (snap) => {
        setStudents(
          snap.docs
            .map((d) => d.data() as StudentProfile)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'studentProfiles')
    );

    const unsubOpps = onSnapshot(
      collection(db, 'opportunities'),
      (snap) => setOpportunities(snap.docs.map((d) => d.data() as Opportunity)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'opportunities')
    );

    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) =>
        setApplications(
          snap.docs
            .map((d) => d.data() as Application)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        ),
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    const unsubReports = onSnapshot(
      collection(db, 'reports'),
      (snap) => setReports(snap.docs.map((d) => d.data() as OpportunityReport)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'reports')
    );

    return () => {
      unsubStudents();
      unsubOpps();
      unsubApps();
      unsubReports();
    };
  }, []);

  const kpis = useMemo(() => {
    return {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.accountStatus === 'active').length,
      totalOpportunities: opportunities.length,
      pendingOpportunities: opportunities.filter((o) => o.status === 'pending').length,
      verifiedOpportunities: opportunities.filter((o) => o.status === 'verified' && o.isVerified)
        .length,
      totalApplications: applications.length,
      underReview: applications.filter((a) => a.status === 'under_review' || a.status === 'submitted')
        .length,
      shortlisted: applications.filter((a) =>
        ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)
      ).length,
    };
  }, [students, opportunities, applications]);

  const recentActivities = useMemo(() => {
    const items: Array<{ id: string; title: string; subtitle: string; timeMs: number; status: string }> =
      [];

    applications.slice(0, 6).forEach((app) => {
      items.push({
        id: `app_${app.applicationId}`,
        title: `${app.studentName} applied for ${app.opportunityTitle}`,
        subtitle: `${app.companyName} · ${app.applicationCode}`,
        timeMs: app.createdAt?.toMillis?.() ?? 0,
        status: app.status,
      });
    });

    reports.slice(0, 4).forEach((rep) => {
      items.push({
        id: `rep_${rep.reportId}`,
        title: `Safety report filed on ${rep.opportunityTitle}`,
        subtitle: `Reported by ${rep.reportedByName}`,
        timeMs: rep.createdAt?.toMillis?.() ?? 0,
        status: rep.status,
      });
    });

    return items.sort((a, b) => b.timeMs - a.timeMs).slice(0, 8);
  }, [applications, reports]);

  const handleSeedStarterData = async () => {
    if (!user) return;
    setSeeding(true);
    setSeedMessage(null);
    try {
      await seedDehradunStarterCatalog(user.uid);
      setSeedMessage(
        'Loaded starter Dehradun companies, verified & pending opportunities, and campus events into Firestore.'
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Admin Overview
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live platform metrics across registered students, opportunity verification, and
            application pipelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {opportunities.length < 4 && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedStarterData}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              {seeding ? 'Loading Catalog...' : 'Seed Dehradun Starter Catalog'}
            </button>
          )}
          <Link
            to="/admin/opportunities"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Manage Opportunities
          </Link>
        </div>
      </div>

      {seedMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
          {seedMessage}
        </div>
      )}

      {/* 8 Required KPI Metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Registered Students', value: kpis.totalStudents, to: '/admin/students' },
          { label: 'Active Students', value: kpis.activeStudents, to: '/admin/students' },
          { label: 'Total Opportunities', value: kpis.totalOpportunities, to: '/admin/opportunities' },
          { label: 'Pending Opportunities', value: kpis.pendingOpportunities, to: '/admin/opportunities' },
          { label: 'Verified Opportunities', value: kpis.verifiedOpportunities, to: '/admin/opportunities' },
          { label: 'Total Applications', value: kpis.totalApplications, to: '/admin/applications' },
          { label: 'Applications Under Review', value: kpis.underReview, to: '/admin/applications' },
          { label: 'Shortlisted Applications', value: kpis.shortlisted, to: '/admin/applications' },
        ].map((metric) => (
          <Link
            key={metric.label}
            to={metric.to}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
          >
            <p className="text-xs text-slate-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
              {loading ? '—' : metric.value}
            </p>
          </Link>
        ))}
      </section>

      {/* Recently Registered Students & Recent Activities */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-display font-bold text-slate-950">
              Recently Registered Students
            </h2>
            <Link to="/admin/students" className="text-xs font-semibold text-blue-700 hover:underline">
              View All
            </Link>
          </div>
          {students.length === 0 ? (
            <div className="p-8 text-xs text-slate-500 text-center">
              No students have registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 bg-slate-50/70">
                    <th className="py-2.5 px-5">Student</th>
                    <th className="py-2.5 px-5">College & Course</th>
                    <th className="py-2.5 px-5">Profile</th>
                    <th className="py-2.5 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {students.slice(0, 6).map((st) => (
                    <tr key={st.uid} className="hover:bg-slate-50/60">
                      <td className="py-3 px-5">
                        <p className="font-semibold text-slate-900">{st.fullName}</p>
                        <p className="text-slate-500">{st.email}</p>
                      </td>
                      <td className="py-3 px-5 text-slate-700">
                        {st.college || 'College not set'}
                        {st.course ? ` · ${st.course}` : ''}
                      </td>
                      <td className="py-3 px-5 font-mono tabular-nums text-slate-700">
                        {st.profileCompletion}%
                      </td>
                      <td className="py-3 px-5">
                        <StatusTextLabel status={st.accountStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="xl:col-span-5 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-display font-bold text-slate-950">Recent Activities</h2>
            <Link
              to="/admin/applications"
              className="text-xs font-semibold text-blue-700 hover:underline"
            >
              Review Queue
            </Link>
          </div>
          {recentActivities.length === 0 ? (
            <div className="p-8 text-xs text-slate-500 text-center">
              Student applications and safety reports will appear here as activity occurs.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentActivities.map((act) => (
                <div key={act.id} className="px-6 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 leading-snug">{act.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{act.subtitle}</p>
                  </div>
                  <StatusTextLabel status={act.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
