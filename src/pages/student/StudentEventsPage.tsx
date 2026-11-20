import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ExternalLink, MapPin, RotateCcw, Search, Users } from 'lucide-react';
import { fetchNextEventChunk, normalizeSearchText } from '../../lib/marketplaceStore';
import {
  CAMPUS_ASSETS,
  DEMO_LISTING_NOTICE,
  EVENT_TYPE_LABELS,
  type CampusEvent,
  type EventType,
} from '../../types/campus';
import { ImageWithFallback, StatusTextLabel } from '../../components/BrandMark';

const PAGE_SIZE = 24;

export function StudentEventsPage() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [exhausted, setExhausted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        let res = await fetchNextEventChunk();
        while (!res.exhausted && res.items.length < 200) {
          res = await fetchNextEventChunk();
        }
        if (!active) return;
        setEvents(res.items);
        setExhausted(res.exhausted);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const locations = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.location).filter(Boolean)));
    return unique.sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = normalizeSearchText(searchQuery);
    const tokens = q ? q.split(' ').filter(Boolean) : [];

    return events
      .filter((evt) => {
        if (typeFilter !== 'all' && evt.eventType !== typeFilter) return false;
        if (modeFilter !== 'all' && evt.mode !== modeFilter) return false;
        if (
          locationFilter !== 'all' &&
          !normalizeSearchText(evt.location).includes(normalizeSearchText(locationFilter))
        ) {
          return false;
        }
        if (tokens.length > 0) {
          const pool = normalizeSearchText(
            [
              evt.title,
              evt.organizer,
              evt.venue,
              evt.location,
              evt.description,
              EVENT_TYPE_LABELS[evt.eventType],
            ].join(' ')
          );
          if (!tokens.every((t) => pool.includes(t))) return false;
        }
        return true;
      })
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [events, searchQuery, typeFilter, modeFilter, locationFilter]);

  const visibleEvents = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      if (!exhausted) {
        const res = await fetchNextEventChunk();
        setEvents(res.items);
        setExhausted(res.exhausted);
      }
      setVisibleCount((prev) => prev + PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setModeFilter('all');
    setLocationFilter('all');
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
          Campus Events &amp; Career Workshops
          {!loading && (
            <span className="text-slate-500 font-mono text-lg font-semibold ml-2 tabular-nums">
              — {filtered.length.toLocaleString('en-IN')} Events
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Internship fairs, placement preparation clinics, mock interviews, hackathons, and career
          workshops across Dehradun, Indian educational hubs, and online.
        </p>
      </div>

      {/* Search & Filters */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder="Search events by topic, organizer, city, or workshop theme..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700/20 focus:border-blue-700"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Event Types</option>
            {(Object.entries(EVENT_TYPE_LABELS) as [EventType, string][]).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={modeFilter}
            onChange={(e) => {
              setModeFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Modes</option>
            <option value="on_site">On-Site</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>

          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-base font-display font-bold text-slate-900">
            No matching campus events found
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try resetting filters or check back once administrators publish upcoming workshops.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleEvents.map((evt) => {
              const isDemoEvent = Boolean(evt.isDemo || evt.status === 'demo_approved');
              return (
                <article
                  key={evt.eventId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col"
                >
                  {isDemoEvent && (
                    <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-[11px] font-semibold text-amber-900 flex items-center justify-between gap-2">
                      <span>{DEMO_LISTING_NOTICE}</span>
                      <span className="font-mono text-[10px] text-amber-800 shrink-0">DEMO DATA</span>
                    </div>
                  )}
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
                      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                        {evt.description}
                      </p>
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
                          {evt.feeLabel ? ` · ${evt.feeLabel}` : ''}
                        </span>

                        {evt.registrationLink && !isDemoEvent && (
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
              );
            })}
          </div>

          {(visibleCount < filtered.length || !exhausted) && (
            <div className="pt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60"
              >
                {loadingMore ? 'Loading more events...' : `Load More Events`}
              </button>
              <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                Showing {visibleEvents.length} of {filtered.length.toLocaleString('en-IN')} events
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
