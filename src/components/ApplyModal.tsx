import React, { useState } from 'react';
import { CheckCircle2, FileUp, X, AlertCircle } from 'lucide-react';
import {
  submitStudentApplication,
  uploadResumeToStorage,
} from '../lib/firestoreService';
import type { Opportunity, StudentProfile } from '../types/campus';

interface ApplyModalProps {
  opportunity: Opportunity;
  profile: StudentProfile;
  onClose: () => void;
  onSubmitted?: (applicationCode: string) => void;
}

export function ApplyModal({ opportunity, profile, onClose, onSubmitted }: ApplyModalProps) {
  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [studentName, setStudentName] = useState(profile.fullName || '');
  const [studentEmail, setStudentEmail] = useState(profile.email || '');
  const [studentPhone, setStudentPhone] = useState(profile.phone || '');
  const [college, setCollege] = useState(profile.college || '');
  const [course, setCourse] = useState(profile.course || '');
  const [skillsText, setSkillsText] = useState((profile.skills || []).join(', '));
  const [resumeUrl, setResumeUrl] = useState(profile.resumeUrl || '');
  const [resumeFileName, setResumeFileName] = useState(profile.resumeFileName || '');
  const [coverLetter, setCoverLetter] = useState('');
  const [additionalAnswers, setAdditionalAnswers] = useState<string[]>(
    (opportunity.additionalQuestions || []).map(() => '')
  );

  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState('');

  const parsedSkills = skillsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Resume file must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    setError(null);
    setUploadNotice(null);
    try {
      const res = await uploadResumeToStorage(profile.uid, file);
      setResumeUrl(res.url);
      setResumeFileName(res.fileName);
      setUploadNotice(`Uploaded ${res.fileName}`);
    } catch {
      setError(
        'Direct file upload is unavailable right now. Please paste a shareable Google Drive, Dropbox, or portfolio resume link below.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!studentName.trim() || !studentEmail.trim() || !college.trim() || !course.trim()) {
      setError('Please complete your name, email, college, and course before continuing.');
      return;
    }
    if (!resumeUrl.trim()) {
      setError('Please upload your resume or provide a valid resume link.');
      return;
    }
    setStep('review');
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitStudentApplication({
        opportunity,
        studentUid: profile.uid,
        studentName,
        studentEmail,
        studentPhone,
        college,
        course,
        skills: parsedSkills,
        resumeUrl,
        resumeFileName,
        coverLetter,
        additionalAnswers,
      });
      setCreatedCode(result.applicationCode);
      setStep('success');
      onSubmitted?.(result.applicationCode);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'DUPLICATE_APPLICATION') {
        setError('You have already submitted an application for this opportunity.');
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to submit application. Ensure your account is active and try again.'
        );
      }
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl my-8 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{opportunity.companyName}</p>
            <h2 className="text-base font-display font-bold text-slate-950 truncate">
              Apply: {opportunity.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application form"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-bold text-slate-950">
              Your application has been submitted successfully!
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Application Reference ID:{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {createdCode}
              </span>
            </p>
            <p className="mt-3 text-xs text-slate-500 max-w-md mx-auto">
              You can monitor review progress and status updates anytime under My Applications.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : step === 'review' ? (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div>
              <h3 className="text-sm font-display font-bold text-slate-950">
                Review Your Application Before Submitting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm your details below. Once submitted, application status is managed by the
                reviewing team.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border border-slate-200 rounded-lg p-4 bg-slate-50/70">
              <div>
                <dt className="text-xs text-slate-500">Full Name</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{studentName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{studentEmail}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Phone</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{studentPhone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">College & Course</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {college} · {course}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Skills</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {parsedSkills.length > 0 ? parsedSkills.join(' · ') : 'None listed'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Resume</dt>
                <dd className="font-mono text-xs text-blue-700 mt-0.5 break-all">
                  {resumeFileName || resumeUrl}
                </dd>
              </div>
              {coverLetter.trim() && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">Cover Letter</dt>
                  <dd className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{coverLetter}</dd>
                </div>
              )}
              {opportunity.additionalQuestions.map((q, idx) => (
                <div key={q} className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{q}</dt>
                  <dd className="text-xs text-slate-800 mt-0.5">
                    {additionalAnswers[idx] || 'No response'}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep('form')}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Edit Details
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSubmit}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit Application'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleProceedToReview} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  maxLength={24}
                  placeholder="+91 98765 43210"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  College / University *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  placeholder="e.g. Graphic Era University, Dehradun"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course / Degree *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. B.Tech Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="React, TypeScript, SQL"
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Resume (Upload PDF/DOC or paste URL) *
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
                  <FileUp className="w-3.5 h-3.5" />
                  {uploading ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <input
                type="url"
                required
                maxLength={1000}
                placeholder="https://drive.google.com/file/d/..."
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
              {uploadNotice && <p className="text-xs text-emerald-700 font-medium">{uploadNotice}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cover Letter (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={3000}
                placeholder="Briefly describe your interest and relevant project or coursework experience."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
              />
            </div>

            {opportunity.additionalQuestions.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-800">Additional Screening Questions</p>
                {opportunity.additionalQuestions.map((question, idx) => (
                  <div key={question}>
                    <label className="block text-xs text-slate-700 mb-1">{question}</label>
                    <textarea
                      rows={2}
                      required
                      maxLength={200}
                      value={additionalAnswers[idx] || ''}
                      onChange={(e) => {
                        const next = [...additionalAnswers];
                        next[idx] = e.target.value;
                        setAdditionalAnswers(next);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60"
              >
                Review Application
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
