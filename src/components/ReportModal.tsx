import React, { useState } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
import { submitOpportunityReport } from '../lib/firestoreService';
import {
  REPORT_REASON_LABELS,
  type Opportunity,
  type ReportReason,
  type StudentProfile,
} from '../types/campus';

interface Props {
  opportunity: Opportunity;
  profile: StudentProfile;
  onClose: () => void;
}

export function ReportModal({ opportunity, profile, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>('misleading_info');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 10) {
      setError('Please provide at least 10 characters explaining your concern.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitOpportunityReport({
        opportunity,
        studentUid: profile.uid,
        studentName: profile.fullName,
        reason,
        details,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-700" />
            <h2 className="text-base font-display font-bold text-slate-950">
              Report Suspicious Opportunity
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-700 mx-auto mb-3" />
            <h3 className="text-base font-display font-bold text-slate-950">
              Report Submitted for Review
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              CampusConnect administrators have been alerted to investigate{' '}
              <strong>{opportunity.title}</strong> and remove misleading listings if confirmed.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-xs text-slate-600">
              Flagging <strong className="text-slate-900">{opportunity.title}</strong> by{' '}
              {opportunity.companyName}. Reports are reviewed privately by CampusConnect
              administrators.
            </p>

            {error && (
              <p className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {error}
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Report
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
              >
                {(Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Details *
              </label>
              <textarea
                rows={4}
                required
                minLength={10}
                maxLength={1500}
                placeholder="Describe what appears suspicious, inaccurate, or misleading..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
