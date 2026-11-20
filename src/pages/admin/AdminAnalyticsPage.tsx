import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  APPLICATION_STATUS_LABELS,
  CATEGORY_LABELS,
  WORK_MODE_LABELS,
  type Application,
  type ApplicationStatus,
  type CampusEvent,
  type Opportunity,
  type OpportunityCategory,
  type StudentProfile,
  type WorkMode,
} from '../../types/campus';

type DatasetScope = 'all' | 'real' | 'demo';

export function AdminAnalyticsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<DatasetScope>('all');

  useEffect(() => {
    let active = true;
    async function loadAll() {
      setLoading(true);
      try {
        const [oppSnap, evtSnap, appSnap, stuSnap] = await Promise.all([
          getDocs(collection(db, 'opportunities')),
          getDocs(collection(db, 'events')),
          getDocs(collection(db, 'applications')),
          getDocs(collection(db, 'studentProfiles')),
        ]);
        if (!active) return;
        setOpportunities(oppSnap.docs.map((d) => d.data() as Opportunity));
        setEvents(evtSnap.docs.map((d) => d.data() as CampusEvent));
        setApplications(appSnap.docs.map((d) => d.data() as Application));
        setStudents(stuSnap.docs.map((d) => d.data() as StudentProfile));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'analytics');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  const scopedOpportunities = useMemo(() => {
    if (scope === 'real') {
      return opportunities.filter((o) => !o.isDemo && o.status !== 'demo_approved');
    }
    if (scope === 'demo') {
      return opportunities.filter((o) => Boolean(o.isDemo || o.status === 'demo_approved'));
    }
    return opportunities;
  }, [opportunities, scope]);

  const scopedEvents = useMemo(() => {
    if (scope === 'real') return events.filter((e) => !e.isDemo && e.status !== 'demo_approved');
    if (scope === 'demo') return events.filter((e) => Boolean(e.isDemo || e.status === 'demo_approved'));
    return events;
  }, [events, scope]);

  // Chart 1: Opportunities by Category (Real vs Demo stacked)
  const categoryData = useMemo(() => {
    const categories: OpportunityCategory[] = [
      'internship',
      'part_time',
      'entry_level',
      'live_project',
      'skill_building',
    ];
    const base = categories.map((cat) => {
      const catOpps = scopedOpportunities.filter((o) => o.category === cat);
      return {
        name: CATEGORY_LABELS[cat],
        real: catOpps.filter((o) => !o.isDemo && o.status !== 'demo_approved').length,
        demo: catOpps.filter((o) => Boolean(o.isDemo || o.status === 'demo_approved')).length,
      };
    });
    base.push({
      name: 'Campus Events',
      real: scopedEvents.filter((e) => !e.isDemo && e.status !== 'demo_approved').length,
      demo: scopedEvents.filter((e) => Boolean(e.isDemo || e.status === 'demo_approved')).length,
    });
    return base;
  }, [scopedOpportunities, scopedEvents]);

  // Chart 2: Opportunities by Location (Top 12)
  const locationData = useMemo(() => {
    const counts = new Map<string, { real: number; demo: number }>();
    scopedOpportunities.forEach((o) => {
      const city = o.location.split(',')[0].trim() || 'Other';
      const cur = counts.get(city) || { real: 0, demo: 0 };
      if (o.isDemo || o.status === 'demo_approved') cur.demo += 1;
      else cur.real += 1;
      counts.set(city, cur);
    });
    return Array.from(counts.entries())
      .map(([name, val]) => ({ name, real: val.real, demo: val.demo, total: val.real + val.demo }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [scopedOpportunities]);

  // Chart 3: Opportunities by Work Mode
  const workModeData = useMemo(() => {
    return (Object.keys(WORK_MODE_LABELS) as WorkMode[]).map((mode) => {
      const subset = scopedOpportunities.filter((o) => o.workMode === mode);
      return {
        name: WORK_MODE_LABELS[mode],
        real: subset.filter((o) => !o.isDemo && o.status !== 'demo_approved').length,
        demo: subset.filter((o) => Boolean(o.isDemo || o.status === 'demo_approved')).length,
      };
    });
  }, [scopedOpportunities]);

  // Chart 4: Listings by Month
  const monthlyData = useMemo(() => {
    const counts = new Map<string, { real: number; demo: number }>();
    scopedOpportunities.forEach((o) => {
      let monthKey = o.createdMonth;
      if (!monthKey && o.createdAt?.toDate) {
        const d = o.createdAt.toDate();
        monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!monthKey) monthKey = '2026-11';
      const cur = counts.get(monthKey) || { real: 0, demo: 0 };
      if (o.isDemo || o.status === 'demo_approved') cur.demo += 1;
      else cur.real += 1;
      counts.set(monthKey, cur);
    });
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, val]) => ({ name: month, real: val.real, demo: val.demo }));
  }, [scopedOpportunities]);

  // Chart 5: Applications by Status (Strictly separates Real Employer vs Simulated Demo apps)
  const applicationStatusData = useMemo(() => {
    return (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((st) => ({
      name: APPLICATION_STATUS_LABELS[st],
      realApplications: applications.filter((a) => !a.isDemo && a.status === st).length,
      demoApplications: applications.filter((a) => Boolean(a.isDemo) && a.status === st).length,
    }));
  }, [applications]);

  const summary = useMemo(() => {
    const realOpps = opportunities.filter((o) => !o.isDemo && o.status !== 'demo_approved');
    const demoOpps = opportunities.filter((o) => Boolean(o.isDemo || o.status === 'demo_approved'));
    const realApps = applications.filter((a) => !a.isDemo);
    const demoApps = applications.filter((a) => Boolean(a.isDemo));
    const avgCompletion =
      students.length === 0
        ? 0
        : Math.round(
            students.reduce((sum, s) => sum + (s.profileCompletion || 0), 0) / students.length
          );

    return {
      realOppsCount: realOpps.length,
      demoOppsCount: demoOpps.length,
      realAppsCount: realApps.length,
      demoAppsCount: demoApps.length,
      avgCompletion,
    };
  }, [opportunities, applications, students]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Live Firestore analytics separating real verified records from synthetic demo data.
          </p>
        </div>

        <div className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-1 shrink-0">
          {(
            [
              { id: 'all', label: 'All Data' },
              { id: 'real', label: 'Real Records Only' },
              { id: 'demo', label: 'Demo Records Only' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                scope === tab.id
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real vs Demo Summary Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Real Opportunities</p>
          <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
            {loading ? '—' : summary.realOppsCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Synthetic Demo Listings</p>
          <p className="mt-2 text-2xl font-display font-bold text-amber-800 tabular-nums">
            {loading ? '—' : summary.demoOppsCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Real Employer Applications</p>
          <p className="mt-2 text-2xl font-display font-bold text-blue-700 tabular-nums">
            {loading ? '—' : summary.realAppsCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Demo Applications (Simulated)</p>
          <p className="mt-2 text-2xl font-display font-bold text-amber-800 tabular-nums">
            {loading ? '—' : summary.demoAppsCount.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 col-span-2 lg:col-span-1">
          <p className="text-xs text-slate-500">Avg Profile Completion</p>
          <p className="mt-2 text-2xl font-display font-bold text-emerald-700 tabular-nums">
            {loading ? '—' : `${summary.avgCompletion}%`}
          </p>
        </div>
      </section>

      {/* 5 Required Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Chart 1: Opportunities by Category */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            1. Opportunities &amp; Events by Category
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 16, left: -8, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="real" name="Real Records" stackId="a" fill="#1D4ED8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="demo" name="Demo Records" stackId="a" fill="#D97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Opportunities by Location */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            2. Opportunities by Location
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} margin={{ top: 8, right: 16, left: -8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} interval={0} angle={-20} textAnchor="end" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="real" name="Real Records" stackId="loc" fill="#0F172A" />
                <Bar dataKey="demo" name="Demo Records" stackId="loc" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 3: Opportunities by Work Mode */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            3. Opportunities by Work Mode
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workModeData} margin={{ top: 8, right: 16, left: -8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="real" name="Real Records" fill="#15803D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="demo" name="Demo Records" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 4: Listings by Month */}
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            4. Listings by Month
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 8, right: 16, left: -8, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="real" name="Real Listings" stackId="m" fill="#0F172A" />
                <Bar dataKey="demo" name="Demo Listings" stackId="m" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 5: Applications by Status (Real vs Demo separated) */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 xl:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h2 className="text-sm font-display font-bold text-slate-950">
              5. Applications by Status (Real Employer vs. Simulated Demo)
            </h2>
            <span className="text-xs text-slate-500">
              Demo applications are tracked separately and never counted as real employer submissions.
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={applicationStatusData}
                margin={{ top: 8, right: 16, left: -8, bottom: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="realApplications"
                  name="Real Employer Applications"
                  fill="#15803D"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="demoApplications"
                  name="Simulated Demo Applications"
                  fill="#D97706"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
