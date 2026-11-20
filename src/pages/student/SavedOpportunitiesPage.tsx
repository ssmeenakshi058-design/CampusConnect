import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ArrowUpRight } from 'lucide-react';
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sanitizeId } from '../../lib/firebase';
import { removeSavedById } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_LABELS,
  formatDeadlineRelative,
  type Opportunity,
  type OpportunityCategory,
  type SavedOpportunity,
} from '../../types/campus';
import { ApplyModal } from '../../components/ApplyModal';

export function SavedOpportunitiesPage() {
  const { user, studentProfile } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingTo, setApplyingTo] = useState<Opportunity | null>(null);
  const [loadingOppId, setLoadingOppId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, 'savedOpportunities'), where('studentUid', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as SavedOpportunity)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setSavedItems(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'savedOpportunities')
    );
    return () => unsub();
  }, [user]);

  const handleDirectApply = async (opportunityId: string) => {
    setLoadingOppId(opportunityId);
    try {
      const snap = await getDoc(doc(db, 'opportunities', sanitizeId(opportunityId)));
      if (snap.exists()) {
        setApplyingTo(snap.data() as Opportunity);
      }
    } finally {
      setLoadingOppId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Saved Opportunities
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review bookmarked listings, monitor upcoming deadlines, and apply directly.
        </p>
      </div>

      {loading ? (
        <div className="h-56 bg-white border border-slate-200 rounded-xl animate-pulse" />
      ) : savedItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h2 className="text-base font-display font-bold text-slate-900">
            No saved opportunities yet
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Bookmark internships, jobs, or live projects while browsing to compare deadlines later.
          </p>
          <Link
            to="/student/explore"
            className="inline-block mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
          >
            Explore Opportunities
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {savedItems.map((item) => {
            const dl = formatDeadlineRelative(item.deadline);
            const categoryLabel =
              CATEGORY_LABELS[item.category as OpportunityCategory] || item.category;

            return (
              <article
                key={item.savedId}
                className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{item.companyName}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{categoryLabel}</span>
                      </p>
                      <Link
                        to={`/student/opportunities/${item.opportunityId}`}
                        className="mt-1 block text-base font-display font-bold text-slate-950 hover:text-blue-700"
                      >
                        {item.opportunityTitle}
                      </Link>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSavedById(item.savedId)}
                      aria-label="Remove bookmark"
                      className="p-2 text-slate-400 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600">{item.location}</span>
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        dl.isExpired ? 'text-red-700' : dl.isUrgent ? 'text-amber-700' : 'text-slate-800'
                      }`}
                    >
                      Deadline: {dl.label} ({item.deadline})
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Link
                    to={`/student/opportunities/${item.opportunityId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950"
                  >
                    View Details
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    disabled={dl.isExpired || loadingOppId === item.opportunityId}
                    onClick={() => handleDirectApply(item.opportunityId)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                  >
                    {dl.isExpired
                      ? 'Closed'
                      : loadingOppId === item.opportunityId
                        ? 'Opening...'
                        : 'Apply Now'}
                  </button>
                </div>
              </article>
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
