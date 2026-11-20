import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { toggleSavedOpportunity } from '../../lib/firestoreService';
import {
  fetchNextOpportunityChunk,
  getPublishedOpportunityCount,
} from '../../lib/marketplaceStore';
import { useAuth } from '../../context/AuthContext';
import {
  computeRuleBasedMatch,
  formatDeadlineRelative,
  type Application,
  type Opportunity,
  type SavedOpportunity,
} from '../../types/campus';
import { OpportunityCard } from '../../components/OpportunityCard';
import { ApplyModal } from '../../components/ApplyModal';

export function StudentDashboardHome() {
  const { user, studentProfile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [totalAvailableCount, setTotalAvailableCount] = useState<number>(0);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedList, setSavedList] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function loadOpportunities() {
      try {
        const [chunk, count] = await Promise.all([
          fetchNextOpportunityChunk(),
          getPublishedOpportunityCount(),
        ]);
        if (!active) return;
        setOpportunities(chunk.items);
        setTotalAvailableCount(count || chunk.items.length);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadOpportunities();

    const unsubApps = onSnapshot(
      query(collection(db, 'applications'), where('studentUid', '==', user.uid)),
      (snap) => setApplications(snap.docs.map((d) => d.data() as Application)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    const unsubSaved = onSnapshot(
      query(collection(db, 'savedOpportunities'), where('studentUid', '==', user.uid)),
      (snap) => setSavedList(snap.docs.map((d) => d.data() as SavedOpportunity)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'savedOpportunities')
    );

    return () => {
      active = false;
      unsubApps();
      unsubSaved();
    };
  }, [user]);

  const savedIds = useMemo(() => new Set(savedList.map((s) => s.opportunityId)), [savedList]);
  const appliedIds = useMemo(() => new Set(applications.map((a) => a.opportunityId)), [applications]);

  const metrics = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newOpps = opportunities.filter((o) => (o.createdAt?.toMillis?.() ?? 0) >= sevenDaysAgo);
    const shortlisted = applications.filter((a) =>
      ['shortlisted', 'interview_scheduled', 'selected'].includes(a.status)
    );
    const upcomingDeadlines = opportunities.filter((o) => {
      const d = formatDeadlineRelative(o.deadline);
      return !d.isExpired && d.daysLeft <= 10;
    });

    return {
      totalAvailable: totalAvailableCount || opportunities.length,
      newOpportunities: newOpps.length,
      submitted: applications.length,
      shortlisted: shortlisted.length,
      upcomingDeadlinesCount: upcomingDeadlines.length,
      upcomingList: upcomingDeadlines.slice(0, 4),
      saved: savedList.length,
    };
  }, [opportunities, totalAvailableCount, applications, savedList]);

  const recommended = useMemo(() => {
    return opportunities
      .map((opp) => ({
        opp,
        match: computeRuleBasedMatch(opp, studentProfile),
      }))
      .sort((a, b) => b.match.score - a.match.score)
      .slice(0, 4);
  }, [opportunities, studentProfile]);

  const handleToggleSave = async (opp: Opportunity) => {
    if (!user) return;
    await toggleSavedOpportunity(user.uid, opp, savedIds.has(opp.opportunityId));
  };

  const completion = studentProfile?.profileCompletion ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-950">
            Welcome to CampusConnect!
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600">
            Your next opportunity could be one click away.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/student/explore"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            Explore Opportunities
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            Profile {completion}% Complete
          </Link>
        </div>
      </section>

      {/* Profile Completion Strip (when < 100%) */}
      {completion < 100 && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-800">
                Complete your student profile to improve rule-based opportunity matches
              </span>
              <span className="font-mono font-semibold text-blue-700 tabular-nums">
                {completion}%
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 rounded-full transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          <Link
            to="/student/profile"
            className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap shrink-0"
          >
            Update Profile
          </Link>
        </section>
      )}

      {/* 6 Required Dashboard Metric Widgets */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Available Opportunities', value: metrics.totalAvailable, to: '/student/explore' },
          { label: 'New This Week', value: metrics.newOpportunities, to: '/student/explore' },
          { label: 'Applications Submitted', value: metrics.submitted, to: '/student/applications' },
          { label: 'Shortlisted', value: metrics.shortlisted, to: '/student/applications' },
          { label: 'Upcoming Deadlines', value: metrics.upcomingDeadlinesCount, to: '/student/explore' },
          { label: 'Saved Opportunities', value: metrics.saved, to: '/student/saved' },
        ].map((stat) => (
          <Link
            key={stat.label}
            to={stat.to}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors"
          >
            <p className="text-xs text-slate-500 leading-snug">{stat.label}</p>
            <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
              {loading ? '—' : stat.value}
            </p>
          </Link>
        ))}
      </section>

      {/* Recommended Opportunities + Upcoming Deadlines Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-8 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-display font-bold text-slate-950">
                Recommended For Your Profile
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent rule-based matching by skills, academic course, preferred location, and
                opportunity category.
              </p>
            </div>
            <Link
              to="/student/explore"
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-white border border-slate-200 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recommended.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-slate-800">
                No verified opportunities are available yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Check back soon or complete your student profile so matching is ready once listings
                are published.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommended.map(({ opp, match }) => (
                <OpportunityCard
                  key={opp.opportunityId}
                  opportunity={opp}
                  detailHref={`/student/opportunities/${opp.opportunityId}`}
                  isSaved={savedIds.has(opp.opportunityId)}
                  hasApplied={appliedIds.has(opp.opportunityId)}
                  onToggleSave={handleToggleSave}
                  onApplyClick={(o) => setApplyingTo(o)}
                  matchInfo={match.reasons.length > 0 ? match : null}
                />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming Deadlines Sidebar Column */}
        <aside className="xl:col-span-4 space-y-4">
          <h2 className="text-lg font-display font-bold text-slate-950">Upcoming Deadlines</h2>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {metrics.upcomingList.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">
                No deadlines closing within the next 10 days.
              </div>
            ) : (
              metrics.upcomingList.map((opp) => {
                const dl = formatDeadlineRelative(opp.deadline);
                return (
                  <Link
                    key={opp.opportunityId}
                    to={`/student/opportunities/${opp.opportunityId}`}
                    className="block p-4 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{opp.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{opp.companyName}</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700 tabular-nums">
                      <Calendar className="w-3.5 h-3.5" />
                      {dl.label} ({opp.deadline})
                    </p>
                  </Link>
                );
              })
            )}
          </div>
        </aside>
      </div>

      {applyingTo && studentProfile && (
        <ApplyModal
          opportunity={applyingTo}
          profile={studentProfile}
          onClose={() => setApplyingTo(null)}
        />
      )}
    </div>
  );
}
