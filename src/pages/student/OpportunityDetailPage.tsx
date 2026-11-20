import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Check,
  ExternalLink,
  Flag,
  Share2,
} from 'lucide-react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, sanitizeId } from '../../lib/firebase';
import { toggleSavedOpportunity } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_LABELS,
  DEMO_LISTING_NOTICE,
  formatDeadlineRelative,
  PLATFORM_DISCLAIMER,
  WORK_MODE_LABELS,
  type Company,
  type Opportunity,
} from '../../types/campus';
import { CompanyAvatar, VerifiedInlineStatus } from '../../components/BrandMark';
import { ApplyModal } from '../../components/ApplyModal';
import { ReportModal } from '../../components/ReportModal';

export function OpportunityDetailPage({ isPublicView = false }: { isPublicView?: boolean }) {
  const { opportunityId } = useParams<{ opportunityId: string }>();
  const { user, studentProfile } = useAuth();
  const navigate = useNavigate();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!opportunityId) return;
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const oppSnap = await getDoc(doc(db, 'opportunities', sanitizeId(opportunityId!)));
        if (!active) return;
        if (!oppSnap.exists()) {
          setOpportunity(null);
          setLoading(false);
          return;
        }
        const oppData = oppSnap.data() as Opportunity;
        setOpportunity(oppData);

        const compSnap = await getDoc(doc(db, 'companies', sanitizeId(oppData.companyId))).catch(
          () => null
        );
        if (active && compSnap && compSnap.exists()) {
          setCompany(compSnap.data() as Company);
        }
      } catch {
        setOpportunity(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [opportunityId]);

  useEffect(() => {
    if (!user || !opportunityId) return;
    const savedId = sanitizeId(`${user.uid}__${opportunityId}`);
    const unsubSaved = onSnapshot(
      doc(db, 'savedOpportunities', savedId),
      (snap) => setIsSaved(snap.exists()),
      () => undefined
    );

    const appId = sanitizeId(`${opportunityId}__${user.uid}`);
    const unsubApp = onSnapshot(
      doc(db, 'applications', appId),
      (snap) => setHasApplied(snap.exists()),
      () => undefined
    );

    return () => {
      unsubSaved();
      unsubApp();
    };
  }, [user, opportunityId]);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/opportunities/${opportunityId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const handleSave = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!opportunity) return;
    await toggleSavedOpportunity(user.uid, opportunity, isSaved);
  };

  const handleApply = () => {
    if (!user || !studentProfile) {
      navigate('/login');
      return;
    }
    setShowApply(true);
  };

  if (loading) {
    return (
      <div className={isPublicView ? 'max-w-5xl mx-auto px-6 py-12' : ''}>
        <div className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className={isPublicView ? 'max-w-5xl mx-auto px-6 py-12' : ''}>
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <h1 className="text-xl font-display font-bold text-slate-950">Opportunity not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            This listing may have expired, been closed, or is pending administrator verification.
          </p>
          <Link
            to={isPublicView ? '/' : '/student/explore'}
            className="inline-block mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
          >
            Browse Opportunities
          </Link>
        </div>
      </div>
    );
  }

  const deadline = formatDeadlineRelative(opportunity.deadline);
  const isDemoListing = Boolean(opportunity.isDemo || opportunity.status === 'demo_approved');

  const content = (
    <div className="space-y-6">
      <div>
        <Link
          to={isPublicView ? '/' : '/student/explore'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-950"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Opportunities
        </Link>
      </div>

      {isDemoListing && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-amber-950">
              {DEMO_LISTING_NOTICE}
            </p>
            <p className="text-xs text-amber-900 mt-0.5">
              This is a synthetic demonstration listing created to showcase CampusConnect search,
              filtering, and application workflows. It does not represent a live external employer
              opening.
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-amber-900 shrink-0">DEMO DATA</span>
        </div>
      )}

      {/* Primary Header Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <CompanyAvatar
              name={opportunity.companyName}
              logoUrl={opportunity.companyLogoUrl || company?.logoUrl}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-800">{opportunity.companyName}</span>
                <span aria-hidden="true">·</span>
                <span>{opportunity.subCategory || CATEGORY_LABELS[opportunity.category]}</span>
                <span aria-hidden="true">·</span>
                <span>{opportunity.industry}</span>
                <span aria-hidden="true">·</span>
                <VerifiedInlineStatus
                  isVerified={opportunity.isVerified}
                  status={opportunity.status}
                  isDemo={isDemoListing}
                />
              </div>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-display font-extrabold text-slate-950 tracking-tight leading-tight">
                {opportunity.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={deadline.isExpired || (hasApplied && !opportunity.allowReapply)}
              onClick={handleApply}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                hasApplied && !opportunity.allowReapply
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : deadline.isExpired
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {hasApplied && !opportunity.allowReapply
                ? 'Application Submitted'
                : deadline.isExpired
                  ? 'Deadline Passed'
                  : 'Apply Now'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                isSaved
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              {isSaved ? 'Saved' : 'Save Opportunity'}
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? 'Link Copied' : 'Share Opportunity'}
            </button>
          </div>
        </div>

        {/* Key Facts Strip */}
        <dl className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <dt className="text-slate-500">Stipend / Salary</dt>
            <dd className="mt-1 font-mono font-semibold text-slate-950 tabular-nums">
              {opportunity.stipendLabel}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Duration</dt>
            <dd className="mt-1 font-semibold text-slate-950">{opportunity.duration}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Work Mode</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {WORK_MODE_LABELS[opportunity.workMode]}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Location</dt>
            <dd className="mt-1 font-semibold text-slate-950">{opportunity.location}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Application Deadline</dt>
            <dd
              className={`mt-1 font-mono font-semibold tabular-nums ${
                deadline.isExpired ? 'text-red-700' : deadline.isUrgent ? 'text-amber-700' : 'text-slate-950'
              }`}
            >
              {opportunity.deadline}
            </dd>
          </div>
          {opportunity.openings !== undefined && (
            <div>
              <dt className="text-slate-500">Openings</dt>
              <dd className="mt-1 font-mono font-semibold text-slate-950 tabular-nums">
                {opportunity.openings}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {/* Main Details + Company Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-display font-bold text-slate-950">
                Opportunity Description
              </h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {opportunity.description}
              </p>
            </div>

            {opportunity.responsibilities.length > 0 && (
              <div className="pt-5 border-t border-slate-100">
                <h2 className="text-base font-display font-bold text-slate-950">Responsibilities</h2>
                <ul className="mt-2.5 space-y-2 text-sm text-slate-700 list-disc pl-5">
                  {opportunity.responsibilities.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-5 border-t border-slate-100">
              <h2 className="text-base font-display font-bold text-slate-950">Required Skills</h2>
              <p className="mt-2 text-sm text-slate-700">
                {opportunity.requiredSkills.length > 0
                  ? opportunity.requiredSkills.join(' · ')
                  : 'No specific skills listed by the organization.'}
              </p>
            </div>

            <div className="pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <h2 className="text-sm font-display font-bold text-slate-950">
                  Eligibility Criteria
                </h2>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                  {opportunity.eligibility || 'Not specified by the organization.'}
                </p>
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-slate-950">
                  Educational Qualifications
                </h2>
                <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">
                  {opportunity.educationQualification || 'Not specified by the organization.'}
                </p>
              </div>
            </div>

            {opportunity.requiredDocuments.length > 0 && (
              <div className="pt-5 border-t border-slate-100">
                <h2 className="text-sm font-display font-bold text-slate-950">
                  Required Documents
                </h2>
                <p className="mt-1.5 text-sm text-slate-700">
                  {opportunity.requiredDocuments.join(' · ')}
                </p>
              </div>
            )}
          </section>
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-base font-display font-bold text-slate-950">About the Company</h2>
            <p className="text-sm font-semibold text-slate-900">
              {company?.name || opportunity.companyName}
            </p>
            <p className="text-xs text-slate-500">
              {company?.industry || opportunity.industry} · {company?.location || opportunity.location}
              {company?.companySize ? ` · ${company.companySize}` : ''}
            </p>
            {company?.description ? (
              <p className="text-xs text-slate-600 leading-relaxed">{company.description}</p>
            ) : (
              <p className="text-xs text-slate-500">
                {isDemoListing
                  ? 'Fictional demo organization created for CampusConnect demonstration data.'
                  : 'Verified partner organization listed on CampusConnect.'}
              </p>
            )}
            {company?.website && !isDemoListing && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline pt-1"
              >
                Visit Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h2 className="text-sm font-display font-bold text-slate-950">
              Safety & Verification Notice
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">{PLATFORM_DISCLAIMER}</p>
            {user && studentProfile && (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 hover:underline pt-1"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Suspicious Opportunity
              </button>
            )}
          </section>
        </aside>
      </div>

      {showApply && studentProfile && (
        <ApplyModal
          opportunity={opportunity}
          profile={studentProfile}
          onClose={() => setShowApply(false)}
          onSubmitted={() => setHasApplied(true)}
        />
      )}

      {showReport && studentProfile && (
        <ReportModal
          opportunity={opportunity}
          profile={studentProfile}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );

  if (isPublicView) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="text-lg font-display font-extrabold text-slate-950">
              CampusConnect
            </Link>
            <Link
              to={user ? '/student/dashboard' : '/login'}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              {user ? 'Student Dashboard' : 'Student Login'}
            </Link>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{content}</main>
      </div>
    );
  }

  return content;
}
