import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  CATEGORY_LABELS,
  WORK_MODE_LABELS,
  type CampusEvent,
  type Opportunity,
  type OpportunityCategory,
  type SkillProgram,
} from '../types/campus';

const CHUNK_SIZE = 200;

interface PagedCache<T> {
  items: T[];
  lastDoc: QueryDocumentSnapshot | null;
  exhausted: boolean;
  loadingPromise: Promise<void> | null;
}

const opportunityCache: PagedCache<Opportunity> = {
  items: [],
  lastDoc: null,
  exhausted: false,
  loadingPromise: null,
};

const eventCache: PagedCache<CampusEvent> = {
  items: [],
  lastDoc: null,
  exhausted: false,
  loadingPromise: null,
};

const skillCache: PagedCache<SkillProgram> = {
  items: [],
  lastDoc: null,
  exhausted: false,
  loadingPromise: null,
};

export function invalidateMarketplaceCache() {
  opportunityCache.items = [];
  opportunityCache.lastDoc = null;
  opportunityCache.exhausted = false;
  opportunityCache.loadingPromise = null;

  eventCache.items = [];
  eventCache.lastDoc = null;
  eventCache.exhausted = false;
  eventCache.loadingPromise = null;

  skillCache.items = [];
  skillCache.lastDoc = null;
  skillCache.exhausted = false;
  skillCache.loadingPromise = null;
}

/**
 * Fetches the next chunk of published (verified + demo_approved) opportunities
 * using a single-field query (zero composite indexes required).
 */
export async function fetchNextOpportunityChunk(): Promise<{
  items: Opportunity[];
  exhausted: boolean;
}> {
  if (opportunityCache.exhausted) {
    return { items: opportunityCache.items, exhausted: true };
  }

  if (opportunityCache.loadingPromise) {
    await opportunityCache.loadingPromise;
    return { items: opportunityCache.items, exhausted: opportunityCache.exhausted };
  }

  opportunityCache.loadingPromise = (async () => {
    try {
      const base = query(
        collection(db, 'opportunities'),
        where('status', 'in', ['verified', 'demo_approved']),
        ...(opportunityCache.lastDoc ? [startAfter(opportunityCache.lastDoc)] : []),
        limit(CHUNK_SIZE)
      );
      const snap = await getDocs(base);
      const existingIds = new Set(opportunityCache.items.map((o) => o.opportunityId));
      snap.docs.forEach((d) => {
        const data = d.data() as Opportunity;
        if (!existingIds.has(data.opportunityId)) {
          opportunityCache.items.push(data);
        }
      });
      opportunityCache.lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      if (snap.docs.length < CHUNK_SIZE) {
        opportunityCache.exhausted = true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'opportunities');
    } finally {
      opportunityCache.loadingPromise = null;
    }
  })();

  await opportunityCache.loadingPromise;
  return { items: opportunityCache.items, exhausted: opportunityCache.exhausted };
}

/**
 * Ensures enough chunks are loaded to satisfy active search/filter criteria
 * without restricting search to only the first 10-20 records.
 */
export async function loadMatchingOpportunities(
  predicate: (opp: Opportunity) => boolean,
  targetCount: number,
  scanAll = false
): Promise<{
  matches: Opportunity[];
  loadedTotal: number;
  exhausted: boolean;
}> {
  // Always load at least one chunk first
  if (opportunityCache.items.length === 0 && !opportunityCache.exhausted) {
    await fetchNextOpportunityChunk();
  }

  let matches = opportunityCache.items.filter(predicate);

  while (!opportunityCache.exhausted && (scanAll || matches.length < targetCount)) {
    await fetchNextOpportunityChunk();
    matches = opportunityCache.items.filter(predicate);
  }

  return {
    matches,
    loadedTotal: opportunityCache.items.length,
    exhausted: opportunityCache.exhausted,
  };
}

export async function getPublishedOpportunityCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(
      query(collection(db, 'opportunities'), where('status', 'in', ['verified', 'demo_approved']))
    );
    return snap.data().count;
  } catch {
    return opportunityCache.items.length;
  }
}

export async function fetchNextEventChunk(): Promise<{
  items: CampusEvent[];
  exhausted: boolean;
}> {
  if (eventCache.exhausted) {
    return { items: eventCache.items, exhausted: true };
  }
  if (eventCache.loadingPromise) {
    await eventCache.loadingPromise;
    return { items: eventCache.items, exhausted: eventCache.exhausted };
  }

  eventCache.loadingPromise = (async () => {
    try {
      const q = query(
        collection(db, 'events'),
        where('status', 'in', ['upcoming', 'completed', 'demo_approved']),
        ...(eventCache.lastDoc ? [startAfter(eventCache.lastDoc)] : []),
        limit(CHUNK_SIZE)
      );
      const snap = await getDocs(q);
      const existingIds = new Set(eventCache.items.map((e) => e.eventId));
      snap.docs.forEach((d) => {
        const data = d.data() as CampusEvent;
        if (!existingIds.has(data.eventId)) {
          eventCache.items.push(data);
        }
      });
      eventCache.lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      if (snap.docs.length < CHUNK_SIZE) {
        eventCache.exhausted = true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'events');
    } finally {
      eventCache.loadingPromise = null;
    }
  })();

  await eventCache.loadingPromise;
  return { items: eventCache.items, exhausted: eventCache.exhausted };
}

export async function fetchNextSkillProgramChunk(): Promise<{
  items: SkillProgram[];
  exhausted: boolean;
}> {
  if (skillCache.exhausted) {
    return { items: skillCache.items, exhausted: true };
  }
  if (skillCache.loadingPromise) {
    await skillCache.loadingPromise;
    return { items: skillCache.items, exhausted: skillCache.exhausted };
  }

  skillCache.loadingPromise = (async () => {
    try {
      const q = query(
        collection(db, 'skillDevelopment'),
        where('status', 'in', ['verified', 'demo_approved']),
        ...(skillCache.lastDoc ? [startAfter(skillCache.lastDoc)] : []),
        limit(CHUNK_SIZE)
      );
      const snap = await getDocs(q);
      const existingIds = new Set(skillCache.items.map((s) => s.programId));
      snap.docs.forEach((d) => {
        const data = d.data() as SkillProgram;
        if (!existingIds.has(data.programId)) {
          skillCache.items.push(data);
        }
      });
      skillCache.lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      if (snap.docs.length < CHUNK_SIZE) {
        skillCache.exhausted = true;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'skillDevelopment');
    } finally {
      skillCache.loadingPromise = null;
    }
  })();

  await skillCache.loadingPromise;
  return { items: skillCache.items, exhausted: skillCache.exhausted };
}

export function normalizeSearchText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s₹-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface OpportunitySearchCriteria {
  queryText: string;
  category: string;
  location: string;
  workMode: string;
  payFilter: 'all' | 'paid' | 'unpaid';
  minStipend: number;
  duration: string;
  skill: string;
  education: string;
  opportunityType: string;
  deadlineWindow: 'all' | '7d' | '30d';
}

export type OpportunitySortOption =
  | 'recent'
  | 'deadline_asc'
  | 'stipend_desc'
  | 'stipend_asc';

export function matchesOpportunityCriteria(
  opp: Opportunity,
  criteria: OpportunitySearchCriteria
): boolean {
  if (criteria.category !== 'all' && opp.category !== criteria.category) return false;

  if (criteria.opportunityType !== 'all') {
    const oppTypeNorm = normalizeSearchText(
      opp.opportunityType || CATEGORY_LABELS[opp.category]
    );
    if (!oppTypeNorm.includes(normalizeSearchText(criteria.opportunityType))) return false;
  }

  if (criteria.location !== 'all') {
    const locFilter = normalizeSearchText(criteria.location);
    if (!normalizeSearchText(opp.location).includes(locFilter)) return false;
  }

  if (criteria.workMode !== 'all' && opp.workMode !== criteria.workMode) return false;
  if (criteria.payFilter === 'paid' && !opp.isPaid) return false;
  if (criteria.payFilter === 'unpaid' && opp.isPaid) return false;
  if (criteria.minStipend > 0 && opp.stipendMax < criteria.minStipend) return false;

  if (criteria.duration !== 'all') {
    if (!normalizeSearchText(opp.duration).includes(normalizeSearchText(criteria.duration))) {
      return false;
    }
  }

  if (criteria.skill.trim()) {
    const skillTerms = normalizeSearchText(criteria.skill).split(' ').filter(Boolean);
    const skillPool = normalizeSearchText(
      [...opp.requiredSkills, opp.title, opp.subCategory || '', opp.description].join(' ')
    );
    if (!skillTerms.every((t) => skillPool.includes(t))) return false;
  }

  if (criteria.education.trim()) {
    const eduNorm = normalizeSearchText(criteria.education);
    const eduPool = normalizeSearchText(`${opp.educationQualification} ${opp.eligibility}`);
    if (!eduPool.includes(eduNorm)) return false;
  }

  if (criteria.deadlineWindow !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${opp.deadline}T00:00:00`);
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return false;
    if (criteria.deadlineWindow === '7d' && daysLeft > 7) return false;
    if (criteria.deadlineWindow === '30d' && daysLeft > 30) return false;
  }

  const normalizedQuery = normalizeSearchText(criteria.queryText);
  if (normalizedQuery) {
    const tokens = normalizedQuery.split(' ').filter(Boolean);
    const searchable = normalizeSearchText(
      [
        opp.title,
        opp.companyName,
        opp.industry,
        CATEGORY_LABELS[opp.category as OpportunityCategory] || opp.category,
        opp.subCategory || '',
        opp.opportunityType || '',
        opp.description,
        opp.location,
        WORK_MODE_LABELS[opp.workMode],
        opp.educationQualification,
        ...opp.requiredSkills,
      ].join(' ')
    );
    // Support partial word matching across every space-separated term
    if (!tokens.every((token) => searchable.includes(token))) {
      return false;
    }
  }

  return true;
}

export function sortOpportunities(
  items: Opportunity[],
  sortBy: OpportunitySortOption
): Opportunity[] {
  const copy = [...items];
  switch (sortBy) {
    case 'deadline_asc':
      return copy.sort((a, b) => a.deadline.localeCompare(b.deadline));
    case 'stipend_desc':
      return copy.sort((a, b) => b.stipendMax - a.stipendMax || b.stipendMin - a.stipendMin);
    case 'stipend_asc':
      return copy.sort((a, b) => a.stipendMin - b.stipendMin || a.stipendMax - b.stipendMax);
    case 'recent':
    default:
      return copy.sort((a, b) => {
        // Prioritize genuine verified listings above demo listings when recency is tied
        const realDiff = Number(Boolean(a.isDemo)) - Number(Boolean(b.isDemo));
        if (realDiff !== 0) return realDiff;
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        if (tb !== ta) return tb - ta;
        return a.opportunityId.localeCompare(b.opportunityId);
      });
  }
}
