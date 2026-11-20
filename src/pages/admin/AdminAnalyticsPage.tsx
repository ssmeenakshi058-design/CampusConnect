import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  APPLICATION_STATUS_LABELS,
  CATEGORY_LABELS,
  type Application,
  type ApplicationStatus,
  type Opportunity,
  type OpportunityCategory,
  type StudentProfile,
} from '../../types/campus';

export function AdminAnalyticsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);

  useEffect(() => {
    const u1 = onSnapshot(
      collection(db, 'opportunities'),
      (s) => setOpportunities(s.docs.map((d) => d.data() as Opportunity)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'opportunities')
    );
    const u2 = onSnapshot(
      collection(db, 'applications'),
      (s) => setApplications(s.docs.map((d) => d.data() as Application)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );
    const u3 = onSnapshot(
      collection(db, 'studentProfiles'),
      (s) => setStudents(s.docs.map((d) => d.data() as StudentProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'studentProfiles')
    );
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const categoryData = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as OpportunityCategory[]).map((cat) => ({
      name: CATEGORY_LABELS[cat],
      opportunities: opportunities.filter((o) => o.category === cat).length,
      applications: applications.filter((a) => a.category === cat).length,
    }));
  }, [opportunities, applications]);

  const statusFunnelData = useMemo(() => {
    return (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((st) => ({
      name: APPLICATION_STATUS_LABELS[st],
      count: applications.filter((a) => a.status === st).length,
    }));
  }, [applications]);

  const avgProfileCompletion = useMemo(() => {
    if (students.length === 0) return 0;
    const sum = students.reduce((acc, s) => acc + (s.profileCompletion || 0), 0);
    return Math.round(sum / students.length);
  }, [students]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Platform Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Real-time distribution of verified opportunities, student applications, and profile
          readiness computed from Firestore records.
        </p>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Average Student Profile Completion</p>
          <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
            {avgProfileCompletion}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Opportunity Verification Rate</p>
          <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
            {opportunities.length === 0
              ? '0%'
              : `${Math.round(
                  (opportunities.filter((o) => o.status === 'verified' && o.isVerified).length /
                    opportunities.length) *
                    100
                )}%`}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Avg Applications per Verified Listing</p>
          <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
            {opportunities.filter((o) => o.status === 'verified').length === 0
              ? '0.0'
              : (
                  applications.length / opportunities.filter((o) => o.status === 'verified').length
                ).toFixed(1)}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            Opportunities & Applications by Category
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 8, right: 16, left: -12, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="opportunities" name="Opportunities" fill="#0F172A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="applications" name="Applications" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-sm font-display font-bold text-slate-950 mb-4">
            Application Pipeline by Status
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusFunnelData} margin={{ top: 8, right: 16, left: -12, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#475569' }} />
                <Tooltip />
                <Bar dataKey="count" name="Applications" fill="#15803D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
