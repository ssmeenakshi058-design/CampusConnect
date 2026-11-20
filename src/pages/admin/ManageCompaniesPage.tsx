import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  deleteCompany,
  getCompanyPrivateContact,
  saveCompany,
} from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import type { Company } from '../../types/campus';
import { CompanyAvatar, StatusTextLabel } from '../../components/BrandMark';

export function ManageCompaniesPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('Dehradun, Uttarakhand');
  const [logoUrl, setLogoUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>(
    'verified'
  );
  const [dataScope, setDataScope] = useState<'all' | 'real' | 'demo'>('all');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'companies'),
      (snap) => {
        setCompanies(
          snap.docs
            .map((d) => d.data() as Company)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'companies')
    );
    return () => unsub();
  }, []);

  const openCreate = () => {
    setEditingId(undefined);
    setName('');
    setIndustry('');
    setDescription('');
    setWebsite('');
    setLocation('Dehradun, Uttarakhand');
    setLogoUrl('');
    setVerificationStatus('pending');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setModalOpen(true);
  };

  const openEdit = async (comp: Company) => {
    setEditingId(comp.companyId);
    setName(comp.name);
    setIndustry(comp.industry);
    setDescription(comp.description);
    setWebsite(comp.website || '');
    setLocation(comp.location);
    setLogoUrl(comp.logoUrl || '');
    setVerificationStatus(
      comp.verificationStatus === 'demo' ? 'pending' : comp.verificationStatus
    );
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setModalOpen(true);

    const contact = await getCompanyPrivateContact(comp.companyId).catch(() => null);
    if (contact) {
      setContactName(contact.contactName || '');
      setContactEmail(contact.contactEmail || '');
      setContactPhone(contact.contactPhone || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveCompany(user.uid, {
        companyId: editingId,
        name,
        industry,
        description,
        website,
        location,
        logoUrl,
        verificationStatus,
        contactName,
        contactEmail,
        contactPhone,
      });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Manage Companies
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Maintain verified partner organizations. HR contact details are isolated in an
            admin-only Firestore subcollection.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `All Companies (${companies.length})` },
            {
              id: 'real',
              label: `Real Partners (${companies.filter((c) => !c.isDemo && c.verificationStatus !== 'demo').length})`,
            },
            {
              id: 'demo',
              label: `Fictional Demo Companies (${companies.filter((c) => Boolean(c.isDemo || c.verificationStatus === 'demo')).length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setDataScope(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              dataScope === tab.id
                ? 'bg-slate-950 text-white border-slate-950'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">Loading companies...</div>
        ) : companies.filter((c) => {
            const isDemoComp = Boolean(c.isDemo || c.verificationStatus === 'demo');
            if (dataScope === 'real' && isDemoComp) return false;
            if (dataScope === 'demo' && !isDemoComp) return false;
            return true;
          }).length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No companies found in this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Company</th>
                  <th className="py-3 px-5">Industry</th>
                  <th className="py-3 px-5">Location</th>
                  <th className="py-3 px-5">Verification</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {companies
                  .filter((c) => {
                    const isDemoComp = Boolean(c.isDemo || c.verificationStatus === 'demo');
                    if (dataScope === 'real' && isDemoComp) return false;
                    if (dataScope === 'demo' && !isDemoComp) return false;
                    return true;
                  })
                  .map((comp) => {
                    const isDemoComp = Boolean(comp.isDemo || comp.verificationStatus === 'demo');
                    return (
                      <tr key={comp.companyId} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <CompanyAvatar name={comp.name} logoUrl={comp.logoUrl} size="sm" />
                            <div>
                              <p className="font-semibold text-slate-950">{comp.name}</p>
                              {comp.companySize ? (
                                <p className="text-slate-500">{comp.companySize}</p>
                              ) : comp.website ? (
                                <p className="text-slate-500 truncate max-w-[220px]">
                                  {comp.website}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-700">{comp.industry}</td>
                        <td className="py-3.5 px-5 text-slate-700">{comp.location}</td>
                        <td className="py-3.5 px-5">
                          <StatusTextLabel status={comp.verificationStatus} />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-3">
                          {!isDemoComp && (
                            <button
                              type="button"
                              onClick={() => openEdit(comp)}
                              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteCompany(comp.companyId)}
                            className="inline-flex items-center gap-1 font-semibold text-red-700 hover:underline"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-slate-950">
                {editingId ? 'Edit Partner Company' : 'Add Partner Company'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Industry *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
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
                    Verification Status
                  </label>
                  <select
                    value={verificationStatus}
                    onChange={(e) =>
                      setVerificationStatus(e.target.value as 'pending' | 'verified' | 'rejected')
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                  <input
                    type="url"
                    maxLength={400}
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    maxLength={1000}
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Description *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={2500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 space-y-3">
                <p className="text-xs font-semibold text-slate-800">
                  Private HR Contact Information (Admin-Only)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Contact Person"
                    maxLength={120}
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="email"
                    placeholder="Contact Email"
                    maxLength={254}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Contact Phone"
                    maxLength={30}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg"
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
                  {saving ? 'Saving...' : 'Save Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
