import React, { useEffect, useState } from 'react';
import { Calendar, ExternalLink, MapPin, Users } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  CAMPUS_ASSETS,
  EVENT_TYPE_LABELS,
  type CampusEvent,
  type EventType,
} from '../../types/campus';
import { ImageWithFallback, StatusTextLabel } from '../../components/BrandMark';

export function StudentEventsPage() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, 'events'), where('status', 'in', ['upcoming', 'completed'])),
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as CampusEvent)
          .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        setEvents(list);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'events')
    );
    return () => unsub();
  }, []);

  const filtered =
    typeFilter === 'all' ? events : events.filter((evt) => evt.eventType === typeFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Campus Events & Career Workshops
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Placement preparation clinics, networking sessions, and skill workshops across Dehradun
            and online.
          </p>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white shrink-0"
        >
          <option value="all">All Event Types</option>
          {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-display font-bold text-slate-900">
            No campus events listed right now
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upcoming workshops and placement preparation sessions added by administrators will
            appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((evt) => (
            <article
              key={evt.eventId}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="h-44 bg-slate-100 border-b border-slate-200">
                <ImageWithFallback
                  src={evt.bannerUrl || CAMPUS_ASSETS.eventWorkshop}
                  alt={evt.title}
                  fallbackTitle={evt.organizer}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {EVENT_TYPE_LABELS[evt.eventType]} · {evt.organizer}
                    </span>
                    <StatusTextLabel status={evt.status} />
                  </div>
                  <h2 className="mt-1.5 text-lg font-display font-bold text-slate-950">
                    {evt.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{evt.description}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {evt.eventDate} · {evt.eventTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {evt.venue}, {evt.location} ({evt.mode.replace('_', '-')})
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="inline-flex items-center gap-1.5 text-slate-500 font-mono tabular-nums">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      Register by {evt.registrationDeadline}
                      {evt.capacity ? ` · ${evt.capacity} seats` : ''}
                    </span>

                    {evt.registrationLink && (
                      <a
                        href={evt.registrationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
                      >
                        Register
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
