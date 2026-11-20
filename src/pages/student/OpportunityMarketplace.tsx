import React, { useEffect, useMemo, useState } from 'react';
import { Search, RotateCcw, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { toggleSavedOpportunity } from '../../lib/firestoreService';
import {
  getPublishedOpportunityCount,
  loadMatchingOpportunities,
  matchesOpportunityCriteria,
  sortOpportunities,
  type OpportunitySearchCriteria,
  type OpportunitySortOption,
} from '../../lib/marketplaceStore';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_LABELS,
  computeRuleBasedMatch,
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
  unitLabel?: string;
}

const PAGE_SIZE = 24;

const LOCATION_OPTIONS = [
  'Dehradun',
  'Delhi',
  'Noida',
  'Gurugram',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Jaipur',
  'Chandigarh',
  'Lucknow',
  'Remote',
];

const DURATION_OPTIONS = [
  { value: 'all', label: 'Any Duration' },
  { value: 'week', label: 'Short-Term (Weeks)' },
  { value: '1 month', label: '1 Month' },
  { value: '2 month', label: '2 Months' },
  { value: '3 month', label: '3 Months' },
  { value: '4 month', label: '4 Months' },
  { value: '6 month', label: '6 Months' },
  { value: 'full-time', label: 'Full-Time' },
];

export function OpportunityMarketplace({
  presetCategory,
  pageTitle = 'Explore Opportunities',
  pageSubtitle = 'Search internships, part-time roles, full-time entry-level jobs, live projects, and skill programs.',
  unitLabel = 'Opportunities',
}: Props) {
  const { user, studentProfile } = useAuth();
  const [matchedOpportunities, setMatchedOpportunities] = useState<Opportunity[]>([]);
  const [totalPublishedCount, setTotalPublishedCount] = useState<number | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [applications, setApplications] = useState<Application[]>([]);
  const [savedList, setSavedList] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(presetCategory || 'all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [workModeFilter, setWorkModeFilter] = useState<string>('all');
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [minStipend, setMinStipend] = useState<number>(0);
  const [durationFilter, setDurationFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [opportunityTypeFilter, setOpportunityTypeFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState<'all' | '7d' | '30d'>('all');
  const [sortBy, setSortBy] = useState<OpportunitySortOption>('recent');

  useEffect(() => {
    setCategoryFilter(presetCategory || 'all');
    setVisibleCount(PAGE_SIZE);
  }, [presetCategory]);

  // Student personal applications & saved list stay real-time (small user-scoped collections)
  useEffect(() => {
    if (!user) return;

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

    getPublishedOpportunityCount()
      .then((count) => setTotalPublishedCount(count))
      .catch(() => undefined);

    return () => {
      unsubApps();
      unsubSaved();
    };
  }, [user]);

  const criteria: OpportunitySearchCriteria = useMemo(
    () => ({
      queryText: searchQuery,
      category: categoryFilter,
      location: locationFilter,
      workMode: workModeFilter,
      payFilter,
      minStipend,
      duration: durationFilter,
      skill: skillFilter,
      education: educationFilter,
      opportunityType: opportunityTypeFilter,
      deadlineWindow: deadlineFilter,
    }),
    [
      searchQuery,
      categoryFilter,
      locationFilter,
      workModeFilter,
      payFilter,
      minStipend,
      durationFilter,
      skillFilter,
      educationFilter,
      opportunityTypeFilter,
      deadlineFilter,
    ]
  );

  // Determine whether we should scan all chunks for accurate totals & full-dataset search/sort
  const needsFullScan = useMemo(() => {
    return Boolean(
      searchQuery.trim() ||
        categoryFilter !== 'all' ||
        locationFilter !== 'all' ||
        workModeFilter !== 'all' ||
        payFilter !== 'all' ||
        minStipend > 0 ||
        durationFilter !== 'all' ||
        skillFilter.trim() ||
        educationFilter.trim() ||
        opportunityTypeFilter !== 'all' ||
        deadlineFilter !== 'all' ||
        sortBy !== 'recent'
    );
  }, [
    searchQuery,
    categoryFilter,
    locationFilter,
    workModeFilter,
    payFilter,
    minStipend,
    durationFilter,
    skillFilter,
    educationFilter,
    opportunityTypeFilter,
    deadlineFilter,
    sortBy,
  ]);

  // Paginated chunk loader — automatically searches full dataset when filtering/searching
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await loadMatchingOpportunities(
          (opp) => matchesOpportunityCriteria(opp, criteria),
          visibleCount,
          needsFullScan
        );
        if (!active) return;
        setMatchedOpportunities(res.matches);
        setExhausted(res.exhausted);
      } finally {
        if (active) setLoading(false);
      }
    }, searchQuery.trim() || skillFilter.trim() || educationFilter.trim() ? 180 : 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [criteria, needsFullScan, visibleCount, searchQuery, skillFilter, educationFilter]);

  const savedIds = useMemo(() => new Set(savedList.map((s) => s.opportunityId)), [savedList]);
  const appliedIds = useMemo(() => new Set(applications.map((a) => a.opportunityId)), [applications]);

  const sortedMatches = useMemo(
    () => sortOpportunities(matchedOpportunities, sortBy),
    [matchedOpportunities, sortBy]
  );

  const visibleOpportunities = useMemo(
    () => sortedMatches.slice(0, visibleCount),
    [sortedMatches, visibleCount]
  );

  const hasMoreToShow = visibleCount < sortedMatches.length || !exhausted;

  const handleLoadMore = async () => {
    const nextVisible = visibleCount + PAGE_SIZE;
    setLoadingMore(true);
    try {
      const res = await loadMatchingOpportunities(
        (opp) => matchesOpportunityCriteria(opp, criteria),
        nextVisible,
        needsFullScan
      );
      setMatchedOpportunities(res.matches);
      setExhausted(res.exhausted);
      setVisibleCount(nextVisible);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter(presetCategory || 'all');
    setLocationFilter('all');
    setWorkModeFilter('all');
    setPayFilter('all');
    setMinStipend(0);
    setDurationFilter('all');
    setSkillFilter('');
    setEducationFilter('');
    setOpportunityTypeFilter('all');
    setDeadlineFilter('all');
    setSortBy('recent');
    setVisibleCount(PAGE_SIZE);
  };

  const handleToggleSave = async (opp: Opportunity) => {
    if (!user) return;
    await toggleSavedOpportunity(user.uid, opp, savedIds.has(opp.opportunityId));
  };

  const headerCount =
    !needsFullScan && totalPublishedCount !== null
      ? totalPublishedCount
      : matchedOpportunities.length;

  const activeFilterCount = [
    !presetCategory && categoryFilter !== 'all',
    locationFilter !== 'all',
    workModeFilter !== 'all',
    payFilter !== 'all',
    minStipend > 0,
    durationFilter !== 'all',
    Boolean(skillFilter.trim()),
    Boolean(educationFilter.trim()),
    opportunityTypeFilter !== 'all',
    deadlineFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            {pageTitle}
            {!loading && (
              <span className="text-slate-500 font-mono text-lg font-semibold ml-2 tabular-nums">
                — {headerCount.toLocaleString('en-IN')} {unitLabel}
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{pageSubtitle}</p>
        </div>
      </div>

      {/* Search, Sort & Filter Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search title, company, skill, location (e.g. Finance, Marketing, Dehradun, Excel, Remote)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex items-center gap-1.5 border border-slate-300 rounded-lg px-3 py-2 bg-white">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                aria-label="Sort opportunities"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as OpportunitySortOption);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="text-xs font-medium text-slate-800 bg-transparent focus:outline-none"
              >
                <option value="recent">Sort: Recently Added</option>
                <option value="deadline_asc">Sort: Deadline Approaching</option>
                <option value="stipend_desc">Sort: Highest Stipend</option>
                <option value="stipend_asc">Sort: Lowest Stipend</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              More Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>

            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Primary Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {!presetCategory && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Categories</option>
                {(Object.entries(CATEGORY_LABELS) as [OpportunityCategory, string][])
                  .filter(([key]) => key !== 'campus_event')
                  .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Locations</option>
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === 'Remote' ? 'Remote — India' : loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Work Mode</label>
            <select
              value={workModeFilter}
              onChange={(e) => {
                setWorkModeFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
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
              Paid / Unpaid
            </label>
            <select
              value={payFilter}
              onChange={(e) => {
                setPayFilter(e.target.value as 'all' | 'paid' | 'unpaid');
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">Paid & Unpaid</option>
              <option value="paid">Paid Only</option>
              <option value="unpaid">Unpaid / Free Only</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Min Stipend (INR)
            </label>
            <select
              value={minStipend}
              onChange={(e) => {
                setMinStipend(Number(e.target.value));
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white font-mono"
            >
              <option value={0}>Any Stipend</option>
              <option value={3000}>₹3,000+</option>
              <option value={5000}>₹5,000+</option>
              <option value={10000}>₹10,000+</option>
              <option value={15000}>₹15,000+</option>
              <option value={20000}>₹20,000+</option>
              <option value={30000}>₹30,000+</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Duration</label>
            <select
              value={durationFilter}
              onChange={(e) => {
                setDurationFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filter Row (Skills, Education, Opportunity Type, Deadline) */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Skills</label>
              <input
                type="text"
                placeholder="e.g. Excel, Power BI, SQL, React"
                value={skillFilter}
                onChange={(e) => {
                  setSkillFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Education / Course
              </label>
              <input
                type="text"
                placeholder="e.g. MBA, B.Tech, BBA, B.Com"
                value={educationFilter}
                onChange={(e) => {
                  setEducationFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Opportunity Type
              </label>
              <select
                value={opportunityTypeFilter}
                onChange={(e) => {
                  setOpportunityTypeFilter(e.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Types</option>
                <option value="Internship">Internship</option>
                <option value="Part-Time">Part-Time Job</option>
                <option value="Full-Time">Full-Time / Entry-Level</option>
                <option value="Live Project">Live Project</option>
                <option value="Skill Development">Skill Development</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Deadline Window
              </label>
              <select
                value={deadlineFilter}
                onChange={(e) => {
                  setDeadlineFilter(e.target.value as 'all' | '7d' | '30d');
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">Any Deadline</option>
                <option value="7d">Closing within 7 days</option>
                <option value="30d">Closing within 30 days</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Result Counter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="tabular-nums">
          Showing <strong className="text-slate-900">{visibleOpportunities.length}</strong> of{' '}
          <strong className="text-slate-900">{headerCount.toLocaleString('en-IN')}</strong>{' '}
          matching {unitLabel.toLowerCase()}
        </span>
        {searchQuery.trim() && (
          <span>
            Active query: <strong className="text-slate-800">&ldquo;{searchQuery.trim()}&rdquo;</strong>
          </span>
        )}
      </div>

      {/* Results Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleOpportunities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-display font-bold text-slate-900">
            No matching opportunities found
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
            Try clearing one or more filters or broadening your search query. If the catalog is empty,
            an administrator can populate listings from the Admin Portal.
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
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {visibleOpportunities.map((opp) => {
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

          {hasMoreToShow && (
            <div className="pt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors"
              >
                {loadingMore ? 'Loading more opportunities...' : `Load More (${PAGE_SIZE} per page)`}
              </button>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                Displaying {visibleOpportunities.length} of {headerCount.toLocaleString('en-IN')}
              </p>
            </div>
          )}
        </>
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
