import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Database, Plus } from 'lucide-react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { seedDehradunStarterCatalog } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type {
  Application,
  CampusEvent,
  Opportunity,
  OpportunityReport,
  StudentProfile,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function AdminOverviewPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<OpportunityReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadCatalog() {
      try {
        const [oppSnap, evtSnap] = await Promise.all([
          getDocs(collection(db, 'opportunities')),
          getDocs(collection(db, 'events')),
        ]);
        if (!active) return;
        setOpportunities(oppSnap.docs.map((d) => d.data() as Opportunity));
        setEvents(evtSnap.docs.map((d) => d.data() as CampusEvent));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'opportunities');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCatalog();

    const unsubStudents = onSnapshot(
      collection(db, 'studentProfiles'),
      (snap) => {
        setStudents(
          snap.docs
            .map((d) => d.data() as StudentProfile)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'studentProfiles')
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
      active = false;
      unsubStudents();
      unsubApps();
      unsubReports();
    };
  }, []);

  const kpis = useMemo(() => {
    const realOpps = opportunities.filter((o) => !o.isDemo && o.status !== 'demo_approved');
    const demoOpps = opportunities.filter((o) => Boolean(o.isDemo || o.status === 'demo_approved'));
    const realEvents = events.filter((e) => !e.isDemo && e.status !== 'demo_approved');
    const demoEvents = events.filter((e) => Boolean(e.isDemo || e.status === 'demo_approved'));

    const realApps = applications.filter((a) => !a.isDemo);
    const demoApps = applications.filter((a) => Boolean(a.isDemo));

    return {
      totalStudents: students.length,
      activeStudents: students.filter((s) => s.accountStatus === 'active').length,
      realVerifiedOpps: realOpps.filter((o) => o.status === 'verified' && o.isVerified).length,
      realPendingOpps: realOpps.filter((o) => o.status === 'pending').length,
      realApplications: realApps.length,
      realShortlisted: realApps.filter((a) =>
        ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)
      ).length,
      realEventsCount: realEvents.length,
      // Category counts across published records (Real + Demo clearly tracked)
      totalPublishedOpps: opportunities.filter((o) =>
        ['verified', 'demo_approved'].includes(o.status)
      ).length,
      demoOppsCount: demoOpps.length,
      demoEventsCount: demoEvents.length,
      demoApplications: demoApps.length,
      internshipsTotal: opportunities.filter((o) => o.category === 'internship').length,
      partTimeTotal: opportunities.filter((o) => o.category === 'part_time').length,
      fullTimeTotal: opportunities.filter((o) => o.category === 'entry_level').length,
      liveProjectsTotal: opportunities.filter((o) => o.category === 'live_project').length,
      skillProgramsTotal: opportunities.filter((o) => o.category === 'skill_building').length,
      eventsTotal: events.length,
    };
  }, [students, opportunities, events, applications]);

  const recentActivities = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      timeMs: number;
      status: string;
      isDemo?: boolean;
    }> = [];

    applications.slice(0, 6).forEach((app) => {
      items.push({
        id: `app_${app.applicationId}`,
        title: `${app.studentName} applied for ${app.opportunityTitle}`,
        subtitle: `${app.companyName} · ${app.applicationCode}${app.isDemo ? ' · DEMO APPLICATION' : ''}`,
        timeMs: app.createdAt?.toMillis?.() ?? 0,
        status: app.status,
        isDemo: app.isDemo,
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
      const [oppSnap, evtSnap] = await Promise.all([
        getDocs(collection(db, 'opportunities')),
        getDocs(collection(db, 'events')),
      ]);
      setOpportunities(oppSnap.docs.map((d) => d.data() as Opportunity));
      setEvents(evtSnap.docs.map((d) => d.data() as CampusEvent));
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
            Live Firestore counts separating real verified platform activity from synthetic demo
            records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {kpis.realVerifiedOpps < 4 && (
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
            to="/admin/demo-data"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-300 rounded-lg hover:bg-amber-100 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            Demo Data Management
          </Link>
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

      {/* Real Platform Metrics (Strictly excludes demo applications from employer counts) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-bold text-slate-950">
            Real Platform Operations (Verified &amp; Live Users)
          </h2>
          <span className="text-[11px] text-slate-500">
            Excludes simulated demo applications from real employer pipeline totals
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Registered Students', value: kpis.totalStudents, to: '/admin/students' },
            { label: 'Active Students', value: kpis.activeStudents, to: '/admin/students' },
            { label: 'Real Verified Opportunities', value: kpis.realVerifiedOpps, to: '/admin/opportunities' },
            { label: 'Pending Verification', value: kpis.realPendingOpps, to: '/admin/opportunities' },
            { label: 'Real Employer Applications', value: kpis.realApplications, to: '/admin/applications' },
            { label: 'Real Shortlisted / Selected', value: kpis.realShortlisted, to: '/admin/applications' },
            { label: 'Real Campus Events', value: kpis.realEventsCount, to: '/admin/events' },
            { label: 'Simulated Demo Applications', value: kpis.demoApplications, to: '/admin/applications' },
          ].map((metric) => (
            <Link
              key={metric.label}
              to={metric.to}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
            >
              <p className="text-xs text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
                {loading ? '—' : metric.value.toLocaleString('en-IN')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Marketplace Inventory (Real + Demo Breakdown) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-bold text-slate-950">
            Marketplace Catalog Inventory (Real + Synthetic Demo)
          </h2>
          <span className="text-xs font-mono text-amber-800">
            Demo Listings: {kpis.demoOppsCount.toLocaleString('en-IN')} · Demo Events:{' '}
            {kpis.demoEventsCount.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Internships', value: kpis.internshipsTotal, to: '/admin/opportunities' },
            { label: 'Part-Time Jobs', value: kpis.partTimeTotal, to: '/admin/opportunities' },
            { label: 'Full-Time Jobs', value: kpis.fullTimeTotal, to: '/admin/opportunities' },
            { label: 'Live Projects', value: kpis.liveProjectsTotal, to: '/admin/opportunities' },
            { label: 'Campus Events', value: kpis.eventsTotal, to: '/admin/events' },
            { label: 'Skill Programs', value: kpis.skillProgramsTotal, to: '/admin/opportunities' },
          ].map((cat) => (
            <Link
              key={cat.label}
              to={cat.to}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors"
            >
              <p className="text-xs text-slate-500">{cat.label}</p>
              <p className="mt-1.5 text-xl font-display font-bold text-slate-950 tabular-nums">
                {loading ? '—' : cat.value.toLocaleString('en-IN')}
              </p>
            </Link>
          ))}
        </div>
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
                    <th className="py-2.5 px-5">College &amp; Course</th>
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
