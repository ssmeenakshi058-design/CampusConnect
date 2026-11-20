import React, { useEffect, useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { updateAdminProfile } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type { AdminProfile } from '../../types/campus';

export function AdminProfilePage() {
  const { user, adminProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('Platform Administrator');
  const [department, setDepartment] = useState('Career Services & Verification');
  const [phone, setPhone] = useState('');
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (adminProfile) {
      setFullName(adminProfile.fullName || '');
      setTitle(adminProfile.title || 'Platform Administrator');
      setDepartment(adminProfile.department || 'Career Services & Verification');
      setPhone(adminProfile.phone || '');
    }
  }, [adminProfile]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'adminProfiles'),
      (snap) => setAdmins(snap.docs.map((d) => d.data() as AdminProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'adminProfiles')
    );
    return () => unsub();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateAdminProfile(user.uid, { fullName, title, department, phone });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Admin Profile
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your administrator account metadata and view authorized CampusConnect operators.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          Administrator profile updated.
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Verified Email
            </label>
            <input
              type="email"
              disabled
              value={adminProfile?.email || user?.email || ''}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Role Title *</label>
            <input
              type="text"
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
            <input
              type="text"
              required
              maxLength={100}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone (Optional)
            </label>
            <input
              type="tel"
              maxLength={24}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-950 rounded-lg hover:bg-slate-800 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Admin Profile'}
          </button>
        </div>
      </form>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-sm font-display font-bold text-slate-950">
            Authorized Administrators ({admins.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {admins.map((a) => (
            <div key={a.uid} className="px-6 py-4 flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold text-slate-950">{a.fullName}</p>
                <p className="text-slate-500">
                  {a.email} · {a.title}
                </p>
              </div>
              <span className="font-mono text-slate-500">{a.department}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
