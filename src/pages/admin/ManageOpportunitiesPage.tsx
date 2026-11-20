import React, { useEffect, useState } from 'react';
import { CheckCircle2, Pencil, Plus, Trash2, X, XCircle } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  deleteOpportunity,
  saveOpportunity,
  updateOpportunityStatus,
} from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import {
  CATEGORY_LABELS,
  OPPORTUNITY_STATUS_LABELS,
  WORK_MODE_LABELS,
  type Company,
  type Opportunity,
  type OpportunityCategory,
  type OpportunityStatus,
  type WorkMode,
} from '../../types/campus';
import { VerifiedInlineStatus } from '../../components/BrandMark';

export function ManageOpportunitiesPage() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [category, setCategory] = useState<OpportunityCategory>('internship');
  const [workMode, setWorkMode] = useState<WorkMode>('hybrid');
  const [location, setLocation] = useState('Dehradun, Uttarakhand');
  const [isPaid, setIsPaid] = useState(true);
  const [stipendMin, setStipendMin] = useState('10000');
  const [stipendMax, setStipendMax] = useState('15000');
  const [stipendLabel, setStipendLabel] = useState('INR 10,000 - 15,000 / month');
  const [duration, setDuration] = useState('3 Months');
  const [openings, setOpenings] = useState('2');
  const [deadline, setDeadline] = useState('');
  const [educationQualification, setEducationQualification] = useState('B.Tech / BCA / MBA');
  const [eligibility, setEligibility] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [documentsText, setDocumentsText] = useState('Updated Resume (PDF)');
  const [questionsText, setQuestionsText] = useState('');
  const [status, setStatus] = useState<OpportunityStatus>('pending');
  const [isVerified, setIsVerified] = useState(false);
  const [allowReapply, setAllowReapply] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsubOpps = onSnapshot(
      collection(db, 'opportunities'),
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

    const unsubComps = onSnapshot(
      collection(db, 'companies'),
      (snap) => setCompanies(snap.docs.map((d) => d.data() as Company)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );

    return () => {
      unsubOpps();
      unsubComps();
    };
  }, []);

  const openCreate = () => {
    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + 21);

    setEditingId(undefined);
    setTitle('');
    setCompanyId(companies[0]?.companyId || '');
    setCategory('internship');
    setWorkMode('hybrid');
    setLocation('Dehradun, Uttarakhand');
    setIsPaid(true);
    setStipendMin('10000');
    setStipendMax('15000');
    setStipendLabel('INR 10,000 - 15,000 / month');
    setDuration('3 Months');
    setOpenings('2');
    setDeadline(defaultDeadline.toISOString().slice(0, 10));
    setEducationQualification('B.Tech / BBA / MBA / BCA');
    setEligibility('');
    setDescription('');
    setResponsibilitiesText('');
    setSkillsText('');
    setDocumentsText('Updated Resume (PDF)');
    setQuestionsText('');
    // Do NOT automatically verify on creation per policy
    setStatus('pending');
    setIsVerified(false);
    setAllowReapply(false);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (opp: Opportunity) => {
    setEditingId(opp.opportunityId);
    setTitle(opp.title);
    setCompanyId(opp.companyId);
    setCategory(opp.category);
    setWorkMode(opp.workMode);
    setLocation(opp.location);
    setIsPaid(opp.isPaid);
    setStipendMin(String(opp.stipendMin));
    setStipendMax(String(opp.stipendMax));
    setStipendLabel(opp.stipendLabel);
    setDuration(opp.duration);
    setOpenings(opp.openings ? String(opp.openings) : '');
    setDeadline(opp.deadline);
    setEducationQualification(opp.educationQualification);
    setEligibility(opp.eligibility);
    setDescription(opp.description);
    setResponsibilitiesText(opp.responsibilities.join('\n'));
    setSkillsText(opp.requiredSkills.join(', '));
    setDocumentsText(opp.requiredDocuments.join(', '));
    setQuestionsText(opp.additionalQuestions.join('\n'));
    setStatus(opp.status);
    setIsVerified(opp.isVerified);
    setAllowReapply(opp.allowReapply);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const selectedCompany = companies.find((c) => c.companyId === companyId);
    if (!selectedCompany) {
      setFormError('Please create and select a partner company first.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await saveOpportunity(user.uid, {
        opportunityId: editingId,
        title,
        companyId: selectedCompany.companyId,
        companyName: selectedCompany.name,
        companyLogoUrl: selectedCompany.logoUrl || '',
        industry: selectedCompany.industry,
        category,
        description,
        responsibilities: responsibilitiesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        requiredSkills: skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        eligibility,
        educationQualification,
        workMode,
        location,
        isPaid,
        stipendMin: isPaid ? Number(stipendMin) || 0 : 0,
        stipendMax: isPaid ? Math.max(Number(stipendMin) || 0, Number(stipendMax) || 0) : 0,
        stipendLabel: isPaid ? stipendLabel : 'Unpaid',
        duration,
        openings: openings ? Number(openings) : undefined,
        deadline,
        requiredDocuments: documentsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        additionalQuestions: questionsText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        allowReapply,
        status,
        isVerified: status === 'verified' ? isVerified : false,
      });
      setModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const filtered =
    statusFilter === 'all'
      ? opportunities
      : opportunities.filter((o) => o.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Manage Opportunities
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Create internships, part-time roles, entry-level jobs, live projects, and skill
            programs. Listings remain hidden from students until verified.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Statuses ({opportunities.length})</option>
            {(Object.entries(OPPORTUNITY_STATUS_LABELS) as [OpportunityStatus, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Opportunity
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading opportunities...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No opportunities found in this status filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Opportunity & Company</th>
                  <th className="py-3 px-5">Category & Mode</th>
                  <th className="py-3 px-5">Deadline</th>
                  <th className="py-3 px-5">Verification</th>
                  <th className="py-3 px-5 text-right">Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((opp) => (
                  <tr key={opp.opportunityId} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-950">{opp.title}</p>
                      <p className="text-slate-500">
                        {opp.companyName} · {opp.stipendLabel}
                      </p>
                    </td>
                    <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                      {CATEGORY_LABELS[opp.category]} · {WORK_MODE_LABELS[opp.workMode]}
                    </td>
                    <td className="py-3.5 px-5 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {opp.deadline}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <VerifiedInlineStatus isVerified={opp.isVerified} status={opp.status} />
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-3">
                      {opp.status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() => updateOpportunityStatus(opp.opportunityId, 'verified', true)}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verify
                        </button>
                      )}
                      {opp.status === 'verified' && (
                        <button
                          type="button"
                          onClick={() => updateOpportunityStatus(opp.opportunityId, 'closed', false)}
                          className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Close
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEdit(opp)}
                        className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteOpportunity(opp.opportunityId)}
                        className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-slate-950">
                {editingId ? 'Edit Opportunity' : 'Create New Opportunity'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={180}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Partner Company *
                  </label>
                  <select
                    required
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">Select company...</option>
                    {companies.map((c) => (
                      <option key={c.companyId} value={c.companyId}>
                        {c.name} ({c.verificationStatus})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.entries(CATEGORY_LABELS) as [OpportunityCategory, string][]).map(
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
                    Work Mode *
                  </label>
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.entries(WORK_MODE_LABELS) as [WorkMode, string][]).map(
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
                    Location *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    placeholder="e.g. 3 Months, 6 Weeks, Full-Time"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                    />
                    Paid Opportunity
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={allowReapply}
                      onChange={(e) => setAllowReapply(e.target.checked)}
                    />
                    Permit Multiple Applications
                  </label>
                </div>

                {isPaid && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Min Monthly Stipend (INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={stipendMin}
                        onChange={(e) => setStipendMin(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Max Monthly Stipend (INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={stipendMax}
                        onChange={(e) => setStipendMax(e.target.value)}
                        className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Stipend / Salary Display Text *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={stipendLabel}
                        onChange={(e) => setStipendLabel(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Educational Qualification
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    value={educationQualification}
                    onChange={(e) => setEducationQualification(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Openings (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    maxLength={4000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsibilities (one per line)
                  </label>
                  <textarea
                    rows={3}
                    value={responsibilitiesText}
                    onChange={(e) => setResponsibilitiesText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Eligibility Criteria
                  </label>
                  <input
                    type="text"
                    maxLength={1000}
                    value={eligibility}
                    onChange={(e) => setEligibility(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Documents (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={documentsText}
                    onChange={(e) => setDocumentsText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication & Verification Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      const next = e.target.value as OpportunityStatus;
                      setStatus(next);
                      setIsVerified(next === 'verified');
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="pending">Pending Verification (Draft)</option>
                    <option value="verified">Verified & Published</option>
                    <option value="rejected">Rejected</option>
                    <option value="expired">Expired</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Additional Screening Questions (optional, one per line, max 5)
                  </label>
                  <textarea
                    rows={2}
                    value={questionsText}
                    onChange={(e) => setQuestionsText(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
