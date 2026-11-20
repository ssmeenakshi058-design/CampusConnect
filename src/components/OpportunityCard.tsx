import React from 'react';
import { Bookmark, BookmarkCheck, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CATEGORY_LABELS,
  DEMO_LISTING_NOTICE,
  formatDeadlineRelative,
  WORK_MODE_LABELS,
  type Opportunity,
  type RuleBasedMatchResult,
} from '../types/campus';
import { CompanyAvatar, VerifiedInlineStatus } from './BrandMark';

interface OpportunityCardProps {
  opportunity: Opportunity;
  detailHref: string;
  isSaved?: boolean;
  hasApplied?: boolean;
  onToggleSave?: (opportunity: Opportunity) => void;
  onApplyClick?: (opportunity: Opportunity) => void;
  matchInfo?: RuleBasedMatchResult | null;
}

export function OpportunityCard({
  opportunity,
  detailHref,
  isSaved = false,
  hasApplied = false,
  onToggleSave,
  onApplyClick,
  matchInfo,
}: OpportunityCardProps) {
  const deadline = formatDeadlineRelative(opportunity.deadline);
  const isDemoListing = Boolean(opportunity.isDemo || opportunity.status === 'demo_approved');

  return (
    <article className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between transition-colors hover:border-slate-300">
      <div>
        {isDemoListing && (
          <div className="mb-3 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200/90 text-[11px] font-semibold tracking-wide text-amber-900 flex items-center justify-between gap-2">
            <span>{DEMO_LISTING_NOTICE}</span>
            <span className="font-mono text-[10px] text-amber-800 shrink-0">DEMO DATA</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <CompanyAvatar
              name={opportunity.companyName}
              logoUrl={opportunity.companyLogoUrl}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span className="font-medium text-slate-700">{opportunity.companyName}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {opportunity.subCategory || CATEGORY_LABELS[opportunity.category]}
                </span>
                <span aria-hidden="true">·</span>
                <VerifiedInlineStatus
                  isVerified={opportunity.isVerified}
                  status={opportunity.status}
                  isDemo={isDemoListing}
                />
              </div>
              <Link
                to={detailHref}
                className="block mt-1 text-base font-display font-bold text-slate-900 hover:text-blue-700 transition-colors leading-snug"
              >
                {opportunity.title}
              </Link>
            </div>
          </div>

          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(opportunity)}
              aria-label={isSaved ? 'Remove from saved opportunities' : 'Save opportunity'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                isSaved
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {opportunity.description}
        </p>

        <dl className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-slate-500">Location & Mode</dt>
            <dd className="mt-0.5 font-medium text-slate-900 truncate">
              {opportunity.location} · {WORK_MODE_LABELS[opportunity.workMode]}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Stipend / Pay</dt>
            <dd className="mt-0.5 font-mono font-medium text-slate-900 tabular-nums truncate">
              {opportunity.stipendLabel}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Duration</dt>
            <dd className="mt-0.5 font-medium text-slate-900 truncate">{opportunity.duration}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Deadline</dt>
            <dd
              className={`mt-0.5 font-mono font-medium tabular-nums truncate ${
                deadline.isExpired
                  ? 'text-red-700'
                  : deadline.isUrgent
                    ? 'text-amber-700'
                    : 'text-slate-900'
              }`}
            >
              {deadline.label}
            </dd>
          </div>
        </dl>

        {opportunity.requiredSkills.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 truncate">
            <span className="font-medium text-slate-700">Skills:</span>{' '}
            {opportunity.requiredSkills.slice(0, 6).join(' · ')}
          </p>
        )}

        {matchInfo && matchInfo.reasons.length > 0 && (
          <p className="mt-2 text-xs text-blue-800 bg-blue-50/70 px-3 py-1.5 rounded-md">
            Profile match criteria: {matchInfo.reasons.join(' · ')}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          to={detailHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors whitespace-nowrap"
        >
          View Details
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>

        {onApplyClick ? (
          <button
            type="button"
            disabled={deadline.isExpired || (hasApplied && !opportunity.allowReapply)}
            onClick={() => onApplyClick(opportunity)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              hasApplied && !opportunity.allowReapply
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default'
                : deadline.isExpired
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
            }`}
          >
            {hasApplied && !opportunity.allowReapply
              ? 'Applied'
              : deadline.isExpired
                ? 'Deadline Passed'
                : 'Apply Now'}
          </button>
        ) : (
          <Link
            to={detailHref}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-700 text-white hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            Apply Now
          </Link>
        )}
      </div>
    </article>
  );
}
