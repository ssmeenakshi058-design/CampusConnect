import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ExternalLink } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { toggleStudentAccountStatus } from '../../lib/firestoreService';
import type { Application, StudentProfile } from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function ManageStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubStudents = onSnapshot(
      collection(db, 'studentProfiles'),
      (snap) => {
        setStudents(
          snap.docs
            .map((d) => d.data() as StudentProfile)
            .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'studentProfiles')
    );

    const unsubApps = onSnapshot(
      collection(db, 'applications'),
      (snap) => setApplications(snap.docs.map((d) => d.data() as Application)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'applications')
    );

    return () => {
      unsubStudents();
      unsubApps();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const col = collegeFilter.trim().toLowerCase();
    const crs = courseFilter.trim().toLowerCase();
    const skl = skillFilter.trim().toLowerCase();

    return students.filter((st) => {
      if (q && !`${st.fullName} ${st.email} ${st.college}`.toLowerCase().includes(q)) return false;
      if (col && !st.college.toLowerCase().includes(col)) return false;
      if (crs && !st.course.toLowerCase().includes(crs)) return false;
      if (skl && !st.skills.some((s) => s.toLowerCase().includes(skl))) return false;
      return true;
    });
  }, [students, searchText, collegeFilter, courseFilter, skillFilter]);

  const handleToggleSuspension = async (st: StudentProfile) => {
    setUpdatingUid(st.uid);
    try {
      const nextStatus = st.accountStatus === 'active' ? 'suspended' : 'active';
      await toggleStudentAccountStatus(st.uid, nextStatus);
      if (selectedStudent?.uid === st.uid) {
        setSelectedStudent({ ...st, accountStatus: nextStatus });
      }
    } finally {
      setUpdatingUid(null);
    }
  };

  const selectedStudentApps = useMemo(() => {
    if (!selectedStudent) return [];
    return applications.filter((a) => a.studentUid === selectedStudent.uid);
  }, [selectedStudent, applications]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Manage Students
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Search registered students, filter by college, course, or skills, inspect application
          histories, and manage account status.
        </p>
      </div>

      {/* Filters */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search name or email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by college..."
          value={collegeFilter}
          onChange={(e) => setCollegeFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
        />
        <input
          type="text"
          placeholder="Filter by course (B.Tech, MBA...)"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
        />
        <input
          type="text"
          placeholder="Filter by skill (React, SQL...)"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
        />
      </section>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading students...</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No registered students match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Student</th>
                  <th className="py-3 px-5">College & Course</th>
                  <th className="py-3 px-5">Skills</th>
                  <th className="py-3 px-5">Applications</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((st) => {
                  const appCount = applications.filter((a) => a.studentUid === st.uid).length;
                  return (
                    <tr key={st.uid} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-950">{st.fullName}</p>
                        <p className="text-slate-500">{st.email}</p>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700">
                        <p>{st.college || '—'}</p>
                        <p className="text-slate-500">{st.course || '—'}</p>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 max-w-[200px] truncate">
                        {st.skills.length > 0 ? st.skills.slice(0, 4).join(' · ') : '—'}
                      </td>
                      <td className="py-3.5 px-5 font-mono tabular-nums text-slate-800">
                        {appCount}
                      </td>
                      <td className="py-3.5 px-5">
                        <StatusTextLabel status={st.accountStatus} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-3">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(st)}
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          Inspect
                        </button>
                        <button
                          type="button"
                          disabled={updatingUid === st.uid}
                          onClick={() => handleToggleSuspension(st)}
                          className={`font-semibold hover:underline disabled:opacity-50 ${
                            st.accountStatus === 'active' ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {st.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Profile + Application History Drawer */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-bold text-slate-950">
                  {selectedStudent.fullName}
                </h2>
                <p className="text-xs text-slate-500">{selectedStudent.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                aria-label="Close drawer"
                className="p-2 text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs">
                  <span className="text-slate-500">Account Status: </span>
                  <StatusTextLabel status={selectedStudent.accountStatus} />
                </div>
                <button
                  type="button"
                  disabled={updatingUid === selectedStudent.uid}
                  onClick={() => handleToggleSuspension(selectedStudent)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md text-white ${
                    selectedStudent.accountStatus === 'active'
                      ? 'bg-red-700 hover:bg-red-800'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {selectedStudent.accountStatus === 'active'
                    ? 'Suspend Account'
                    : 'Reactivate Account'}
                </button>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <dt className="text-slate-500">College</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.college || 'Not provided'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Course & Specialization</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.course || '—'}{' '}
                    {selectedStudent.specialization ? `(${selectedStudent.specialization})` : ''}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Graduation / Semester</dt>
                  <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                    {selectedStudent.graduationYear || '—'} · {selectedStudent.semester || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-mono text-slate-900 mt-0.5">
                    {selectedStudent.phone || 'Not provided'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-slate-500">Skills</dt>
                  <dd className="text-slate-900 mt-0.5">
                    {selectedStudent.skills.length > 0 ? selectedStudent.skills.join(' · ') : 'None'}
                  </dd>
                </div>
                <div className="col-span-2 flex flex-wrap gap-4">
                  {selectedStudent.resumeUrl && (
                    <a
                      href={selectedStudent.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      Resume <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedStudent.linkedInUrl && (
                    <a
                      href={selectedStudent.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      LinkedIn <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedStudent.portfolioUrl && (
                    <a
                      href={selectedStudent.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                    >
                      Portfolio <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </dl>

              <div className="pt-4 border-t border-slate-200">
                <h3 className="text-sm font-display font-bold text-slate-950 mb-3">
                  Application History ({selectedStudentApps.length})
                </h3>
                {selectedStudentApps.length === 0 ? (
                  <p className="text-xs text-slate-500">No applications submitted yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {selectedStudentApps.map((app) => (
                      <div key={app.applicationId} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {app.opportunityTitle}
                          </p>
                          <p className="text-slate-500">
                            {app.companyName} · <span className="font-mono">{app.applicationCode}</span>
                          </p>
                        </div>
                        <StatusTextLabel status={app.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
