import React, { useEffect, useState } from 'react';
import { CheckCircle2, FileUp, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  calculateProfileCompletion,
  updateStudentProfile,
  uploadResumeToStorage,
} from '../../lib/firestoreService';
import { CATEGORY_LABELS, type OpportunityCategory } from '../../types/campus';

export function StudentProfilePage() {
  const { user, studentProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [course, setCourse] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [graduationYear, setGraduationYear] = useState('2027');
  const [semester, setSemester] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [preferredIndustry, setPreferredIndustry] = useState('');
  const [preferredLocation, setPreferredLocation] = useState('Dehradun');
  const [preferredOpportunityType, setPreferredOpportunityType] = useState('internship');
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentProfile) return;
    setFullName(studentProfile.fullName || '');
    setPhone(studentProfile.phone || '');
    setCollege(studentProfile.college || '');
    setCourse(studentProfile.course || '');
    setSpecialization(studentProfile.specialization || '');
    setGraduationYear(
      studentProfile.graduationYear ? String(studentProfile.graduationYear) : '2027'
    );
    setSemester(studentProfile.semester || '');
    setAcademicYear(studentProfile.academicYear || '');
    setSkillsText((studentProfile.skills || []).join(', '));
    setInterestsText((studentProfile.interests || []).join(', '));
    setPreferredIndustry(studentProfile.preferredIndustry || '');
    setPreferredLocation(studentProfile.preferredLocation || 'Dehradun');
    setPreferredOpportunityType(studentProfile.preferredOpportunityType || 'internship');
    setResumeUrl(studentProfile.resumeUrl || '');
    setResumeFileName(studentProfile.resumeFileName || '');
    setLinkedInUrl(studentProfile.linkedInUrl || '');
    setPortfolioUrl(studentProfile.portfolioUrl || '');
  }, [studentProfile]);

  const parsedSkills = skillsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const parsedInterests = interestsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const liveCompletion = calculateProfileCompletion({
    fullName,
    email: studentProfile?.email || user?.email || '',
    phone,
    college,
    course,
    specialization,
    graduationYear: Number(graduationYear) || undefined,
    semester,
    skills: parsedSkills,
    interests: parsedInterests,
    preferredLocation,
    resumeUrl,
    linkedInUrl,
  });

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Resume file must be 5 MB or smaller.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await uploadResumeToStorage(user.uid, file);
      setResumeUrl(res.url);
      setResumeFileName(res.fileName);
    } catch {
      setError(
        'Direct file upload could not connect to Storage right now. Paste a Google Drive or portfolio resume URL below instead.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setSavedNotice(null);

    try {
      await updateStudentProfile(user.uid, {
        fullName,
        phone,
        college,
        course,
        specialization,
        graduationYear: Number(graduationYear) || undefined,
        semester,
        academicYear,
        skills: parsedSkills,
        interests: parsedInterests,
        preferredIndustry,
        preferredLocation,
        preferredOpportunityType,
        resumeUrl,
        resumeFileName,
        linkedInUrl,
        portfolioUrl,
      });
      setSavedNotice('Your student profile has been saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const isSuspended = studentProfile?.accountStatus === 'suspended';

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            My Student Profile
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Keep your academic background, skills, and resume current for faster applications and
            accurate opportunity matching.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shrink-0 min-w-[200px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-600">Profile Completion</span>
            <span className="font-mono font-bold text-blue-700 tabular-nums">
              {liveCompletion}%
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-700 rounded-full transition-all"
              style={{ width: `${liveCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Details */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            {studentProfile?.photoUrl || user?.photoURL ? (
              <img
                src={studentProfile?.photoUrl || user?.photoURL || ''}
                alt={fullName || 'Student'}
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-xl object-cover border border-slate-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-blue-700 text-white font-display font-bold text-lg flex items-center justify-center">
                {(fullName || 'S')[0]}
              </div>
            )}
            <div>
              <h2 className="text-base font-display font-bold text-slate-950">Personal Details</h2>
              <p className="text-xs text-slate-500">
                Google account email is verified automatically and cannot be altered.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                disabled={isSuspended}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={studentProfile?.email || user?.email || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                disabled={isSuspended}
                maxLength={24}
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        {/* Academic Details */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-display font-bold text-slate-950 pb-3 border-b border-slate-100">
            Academic Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                College / University
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={160}
                placeholder="e.g. UPES Dehradun, Graphic Era, DIT University"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={120}
                placeholder="e.g. B.Tech, MBA, BBA, BCA, B.Com"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specialization
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={120}
                placeholder="e.g. Computer Science, Finance, Marketing"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Graduation Year
              </label>
              <input
                type="number"
                disabled={isSuspended}
                min={2020}
                max={2035}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Semester
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={40}
                placeholder="e.g. Semester 6"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Current Academic Year
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={40}
                placeholder="e.g. 3rd Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>
          </div>
        </section>

        {/* Professional Details */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-display font-bold text-slate-950 pb-3 border-b border-slate-100">
            Professional Details & Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Skills (comma-separated, up to 25)
              </label>
              <input
                type="text"
                disabled={isSuspended}
                placeholder="React, TypeScript, Python, SQL, Financial Modeling, Figma"
                value={skillsText}
                onChange={(e) => setSkillsText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Areas of Interest (comma-separated, up to 15)
              </label>
              <input
                type="text"
                disabled={isSuspended}
                placeholder="Software Engineering, Product Analytics, FinTech, CleanTech"
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Industry
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={120}
                placeholder="e.g. Software & Cloud Engineering"
                value={preferredIndustry}
                onChange={(e) => setPreferredIndustry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Job Location
              </label>
              <input
                type="text"
                disabled={isSuspended}
                maxLength={120}
                placeholder="e.g. Dehradun, Remote, Delhi NCR"
                value={preferredLocation}
                onChange={(e) => setPreferredLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Opportunity Type
              </label>
              <select
                disabled={isSuspended}
                value={preferredOpportunityType}
                onChange={(e) => setPreferredOpportunityType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
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
                LinkedIn Profile URL
              </label>
              <input
                type="url"
                disabled={isSuspended}
                maxLength={400}
                placeholder="https://linkedin.com/in/your-handle"
                value={linkedInUrl}
                onChange={(e) => setLinkedInUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Portfolio / GitHub URL (Optional)
              </label>
              <input
                type="url"
                disabled={isSuspended}
                maxLength={400}
                placeholder="https://github.com/your-handle"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
            </div>

            <div className="sm:col-span-2 border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-800">
                  Resume (Upload PDF/DOC or paste URL)
                </label>
                {!isSuspended && (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50">
                    <FileUp className="w-3.5 h-3.5" />
                    {uploading ? 'Uploading...' : 'Upload Resume'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleResumeUpload}
                    />
                  </label>
                )}
              </div>
              <input
                type="url"
                disabled={isSuspended}
                maxLength={1000}
                placeholder="https://drive.google.com/file/d/..."
                value={resumeUrl}
                onChange={(e) => setResumeUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg disabled:bg-slate-100"
              />
              {resumeFileName && (
                <p className="text-xs text-slate-500 font-mono">Saved file: {resumeFileName}</p>
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploading || isSuspended}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Profile...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
