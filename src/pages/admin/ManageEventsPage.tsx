import React, { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { deleteCampusEvent, saveCampusEvent } from '../../lib/firestoreService';
import { useAuth } from '../../context/AuthContext';
import {
  CAMPUS_ASSETS,
  EVENT_TYPE_LABELS,
  type CampusEvent,
  type EventMode,
  type EventStatus,
  type EventType,
} from '../../types/campus';
import { StatusTextLabel } from '../../components/BrandMark';

export function ManageEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [dataScope, setDataScope] = useState<'all' | 'real' | 'demo'>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('career_workshop');
  const [organizer, setOrganizer] = useState('CampusConnect Career Services');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [location, setLocation] = useState('Dehradun, Uttarakhand');
  const [mode, setMode] = useState<EventMode>('hybrid');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('11:00 AM - 1:00 PM IST');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [registrationLink, setRegistrationLink] = useState('');
  const [status, setStatus] = useState<EventStatus>('upcoming');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'events'),
      (snap) => {
        setEvents(
          snap.docs
            .map((d) => d.data() as CampusEvent)
            .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        );
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events')
    );
    return () => unsub();
  }, []);

  const openCreate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    const dl = new Date();
    dl.setDate(dl.getDate() + 11);

    setEditingId(undefined);
    setTitle('');
    setEventType('career_workshop');
    setOrganizer('CampusConnect Career Services');
    setDescription('');
    setVenue('Academic Seminar Hall');
    setLocation('Dehradun, Uttarakhand');
    setMode('hybrid');
    setEventDate(d.toISOString().slice(0, 10));
    setEventTime('11:00 AM - 1:00 PM IST');
    setRegistrationDeadline(dl.toISOString().slice(0, 10));
    setCapacity('100');
    setRegistrationLink('');
    setStatus('upcoming');
    setModalOpen(true);
  };

  const openEdit = (evt: CampusEvent) => {
    setEditingId(evt.eventId);
    setTitle(evt.title);
    setEventType(evt.eventType);
    setOrganizer(evt.organizer);
    setDescription(evt.description);
    setVenue(evt.venue);
    setLocation(evt.location);
    setMode(evt.mode);
    setEventDate(evt.eventDate);
    setEventTime(evt.eventTime);
    setRegistrationDeadline(evt.registrationDeadline);
    setCapacity(evt.capacity ? String(evt.capacity) : '');
    setRegistrationLink(evt.registrationLink || '');
    setStatus(evt.status);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await saveCampusEvent(user.uid, {
        eventId: editingId,
        title,
        eventType,
        organizer,
        description,
        venue,
        location,
        mode,
        eventDate,
        eventTime,
        registrationDeadline,
        capacity: capacity ? Number(capacity) : undefined,
        registrationLink,
        bannerUrl: CAMPUS_ASSETS.eventWorkshop,
        status,
      });
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const isDemoEvt = Boolean(evt.isDemo || evt.status === 'demo_approved');
    if (dataScope === 'real' && isDemoEvt) return false;
    if (dataScope === 'demo' && !isDemoEvt) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedEvents = filteredEvents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Manage Events
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Schedule and publish campus events, career workshops, placement prep sessions, and
            networking meetups.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: 'all', label: `All Events (${events.length})` },
            {
              id: 'real',
              label: `Real Events (${events.filter((e) => !e.isDemo && e.status !== 'demo_approved').length})`,
            },
            {
              id: 'demo',
              label: `Demo Events (${events.filter((e) => Boolean(e.isDemo || e.status === 'demo_approved')).length})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setDataScope(tab.id);
              setPage(1);
            }}
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
          <div className="p-10 text-center text-xs text-slate-500">Loading events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No campus events found in this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-5">Event Title</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Date &amp; Venue</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedEvents.map((evt) => {
                  const isDemoEvt = Boolean(evt.isDemo || evt.status === 'demo_approved');
                  return (
                    <tr key={evt.eventId} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-950">{evt.title}</p>
                        <p className="text-slate-500">{evt.organizer}</p>
                      </td>
                      <td className="py-3.5 px-5 text-slate-700 whitespace-nowrap">
                        {EVENT_TYPE_LABELS[evt.eventType]}
                      </td>
                      <td className="py-3.5 px-5 text-slate-700">
                        <p className="font-mono tabular-nums">
                          {evt.eventDate} · {evt.eventTime}
                        </p>
                        <p className="text-slate-500">{evt.location}</p>
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <StatusTextLabel status={evt.status} />
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-3">
                        {!isDemoEvt && (
                          <button
                            type="button"
                            onClick={() => openEdit(evt)}
                            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteCampusEvent(evt.eventId)}
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

        {filteredEvents.length > PAGE_SIZE && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <span className="font-mono tabular-nums">
              Page {safePage} of {totalPages} ({filteredEvents.length.toLocaleString('en-IN')} events)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-display font-bold text-slate-950">
                {editingId ? 'Edit Event' : 'Create Campus Event'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Title *
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
                    Event Category
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(
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
                    Organizer *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={organizer}
                    onChange={(e) => setOrganizer(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Venue *</label>
                  <input
                    type="text"
                    required
                    maxLength={160}
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as EventMode)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="on_site">On-site</option>
                    <option value="online">Online</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Time *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration Deadline *
                  </label>
                  <input
                    type="date"
                    required
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacity (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50000}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Registration URL (Optional)
                  </label>
                  <input
                    type="url"
                    maxLength={400}
                    value={registrationLink}
                    onChange={(e) => setRegistrationLink(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
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
                    maxLength={3000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  {saving ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
