import React, { useEffect, useMemo, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { toggleSavedOpportunity } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_LABELS,
  computeRuleBasedMatch,
  formatDeadlineRelative,
  WORK_MODE_LABELS,
  type Application,
  type Opportunity,
  type OpportunityCategory,
  type SavedOpportunity,
  type WorkMode,
} from '../../types/campus';
import { OpportunityCard } from '../../components/OpportunityCard';
import { ApplyModal } from '../../components/ApplyModal';

interface Props {
  presetCategory?: OpportunityCategory;
  pageTitle?: string;
  pageSubtitle?: string;
}

export function OpportunityMarketplace({
  presetCategory,
  pageTitle = 'Explore Opportunities',
  pageSubtitle = 'Search verified internships, part-time roles, entry-level jobs, live projects, and skill programs.',
}: Props) {
  const { user, studentProfile } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedList, setSavedList] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(presetCategory || 'all');
  const [workModeFilter, setWorkModeFilter] = useState<string>('all');
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [minStipend, setMinStipend] = useState<number>(0);
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | '7d' | '30d'>('all');
  const [educationFilter, setEducationFilter] = useState('');

  useEffect(() => {
    setCategoryFilter(presetCategory || 'all');
  }, [presetCategory]);

  useEffect(() => {
    if (!user) return;

    const unsubOpps = onSnapshot(
      query(collection(db, 'opportunities'), where('status', '==', 'verified')),
      (snap) => {
        setOpportunities(
          snap.docs
            .map((d) => d.data() as Opportunity)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'opportunities')
    );

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
      unsubOpps();
      unsubApps();
      unsubSaved();
    };
  }, [user]);

  const savedIds = useMemo(() => new Set(savedList.map((s) => s.opportunityId)), [savedList]);
  const appliedIds = useMemo(() => new Set(applications.map((a) => a.opportunityId)), [applications]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const eduQ = educationFilter.trim().toLowerCase();

    return opportunities.filter((opp) => {
      if (categoryFilter !== 'all' && opp.category !== categoryFilter) return false;
      if (workModeFilter !== 'all' && opp.workMode !== workModeFilter) return false;
      if (payFilter === 'paid' && !opp.isPaid) return false;
      if (payFilter === 'unpaid' && opp.isPaid) return false;
      if (minStipend > 0 && opp.stipendMax < minStipend) return false;

      if (deadlineFilter !== 'all') {
        const dl = formatDeadlineRelative(opp.deadline);
        if (dl.isExpired) return false;
        if (deadlineFilter === '7d' && dl.daysLeft > 7) return false;
        if (deadlineFilter === '30d' && dl.daysLeft > 30) return false;
      }

      if (eduQ && !opp.educationQualification.toLowerCase().includes(eduQ) && !opp.eligibility.toLowerCase().includes(eduQ)) {
        return false;
      }

      if (q) {
        const haystack = [
          opp.title,
          opp.companyName,
          opp.industry,
          opp.location,
          CATEGORY_LABELS[opp.category],
          ...opp.requiredSkills,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    opportunities,
    searchQuery,
    categoryFilter,
    workModeFilter,
    payFilter,
    minStipend,
    deadlineFilter,
    educationFilter,
  ]);

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(presetCategory || 'all');
    setWorkModeFilter('all');
    setPayFilter('all');
    setMinStipend(0);
    setDeadlineFilter('all');
    setEducationFilter('');
  };

  const handleToggleSave = async (opp: Opportunity) => {
    if (!user) return;
    await toggleSavedOpportunity(user.uid, opp, savedIds.has(opp.opportunityId));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          {pageTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{pageSubtitle}</p>
      </div>

      {/* Search and Filter Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search by title, company, industry, skill, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          {!presetCategory && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Categories</option>
                {(Object.entries(CATEGORY_LABELS) as [OpportunityCategory, string][]).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Work Mode</label>
            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Modes</option>
              {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Compensation
            </label>
            <select
              value={payFilter}
              onChange={(e) => setPayFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Paid & Unpaid</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Min Stipend (INR)
            </label>
            <select
              value={minStipend}
              onChange={(e) => setMinStipend(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
            >
              <option value={0}>Any Stipend</option>
              <option value={5000}>5,000+</option>
              <option value={10000}>10,000+</option>
              <option value={15000}>15,000+</option>
              <option value={25000}>25,000+</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Deadline</label>
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value as 'all' | '7d' | '30d')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Any Deadline</option>
              <option value="7d">Closing in 7 days</option>
              <option value="30d">Closing in 30 days</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Qualification
            </label>
            <input
              type="text"
              placeholder="e.g. B.Tech, MBA, BCA"
              value={educationFilter}
              onChange={(e) => setEducationFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="tabular-nums">
          Showing <strong className="text-slate-900">{filtered.length}</strong> verified{' '}
          {filtered.length === 1 ? 'opportunity' : 'opportunities'}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-display font-bold text-slate-900">
            No matching opportunities found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try clearing one or more filters or broadening your search query.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map((opp) => {
            const match = computeRuleBasedMatch(opp, studentProfile);
            return (
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
            );
          })}
        </div>
      )}

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
