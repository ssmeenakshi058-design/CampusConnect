import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MapPin, ShieldCheck } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  CAMPUS_ASSETS,
  EVENT_TYPE_LABELS,
  PLATFORM_DISCLAIMER,
  type CampusEvent,
  type Opportunity,
} from '../types/campus';
import { useAuth } from '../context/AuthContext';
import { ImageWithFallback } from '../components/BrandMark';
import { OpportunityCard } from '../components/OpportunityCard';

export function LandingPage() {
  const { user, isAdmin } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const oppQ = query(collection(db, 'opportunities'), where('status', '==', 'verified'));
    const evtQ = query(collection(db, 'events'), where('status', 'in', ['upcoming', 'completed']));

    const unsubOpps = onSnapshot(
      oppQ,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as Opportunity)
          .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setOpportunities(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    const unsubEvents = onSnapshot(
      evtQ,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as CampusEvent)
          .filter((e) => e.status === 'upcoming')
          .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
        setEvents(list);
      },
      () => undefined
    );

    return () => {
      unsubOpps();
      unsubEvents();
    };
  }, []);

  const primaryCtaHref = user ? (isAdmin ? '/admin/dashboard' : '/student/dashboard') : '/login';
  const primaryCtaLabel = user
    ? isAdmin
      ? 'Open Admin Console'
      : 'Open Student Dashboard'
    : 'Student Login';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-display font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            CampusConnect
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#opportunities" className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0">
              Opportunities
            </a>
            <a href="#events" className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0">
              Campus Events
            </a>
            <a href="#how-it-works" className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0">
              Verification
            </a>
            <Link to="/admin/login" className="hover:text-slate-950 transition-colors whitespace-nowrap shrink-0">
              Admin Portal
            </Link>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to={primaryCtaHref}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              {primaryCtaLabel}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split Section */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-blue-700">
                Dehradun & Uttarakhand Student Career Platform
              </p>
              <h1
                className="mt-3 font-display font-extrabold tracking-tight text-slate-950 leading-[1.1]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', textWrap: 'balance' }}
              >
                Discover Opportunities. Build Your Career.
              </h1>
              <p className="mt-5 text-base text-slate-600 leading-relaxed max-w-xl">
                CampusConnect brings verified internships, student-friendly part-time roles,
                mentored live projects, and Dehradun campus career events into one structured
                platform—replacing scattered WhatsApp forwards and unverified listings.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
                >
                  Continue to Student Portal
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#opportunities"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                >
                  Browse Verified Listings
                </a>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Admin-verified opportunities before publication
                </span>
                <span>Built for UG, MBA & PG students (18–25)</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] lg:min-h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                <ImageWithFallback
                  src={CAMPUS_ASSETS.heroCampus}
                  alt="College students collaborating on laptops in a sunlit Dehradun university campus courtyard"
                  fallbackTitle="Dehradun University Campus"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Full-width 4-Column Live Platform Strip */}
          <div className="border-t border-slate-200 bg-slate-50/70">
            <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500">Verified Listings Live</p>
                <p className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                  {loading ? '—' : opportunities.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Upcoming Campus Events</p>
                <p className="mt-1 text-2xl font-display font-bold text-slate-900 tabular-nums">
                  {loading ? '—' : events.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Launch Region</p>
                <p className="mt-1 text-lg font-display font-bold text-slate-900">
                  Dehradun, Uttarakhand
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Opportunity Screening</p>
                <p className="mt-1 text-lg font-display font-bold text-slate-900">
                  Manual Admin Review
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Verified Opportunities Preview */}
        <section id="opportunities" className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-950 tracking-tight">
                Verified Opportunities
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Only opportunities approved and verified by CampusConnect administrators appear here.
              </p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Sign in to filter & apply
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-56 bg-white border border-slate-200 rounded-xl p-6 animate-pulse" />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <h3 className="text-base font-display font-bold text-slate-900">
                No verified opportunities published yet
              </h3>
              <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto">
                Administrators can sign in to the Admin Portal to add companies, seed Dehradun
                opportunities, and verify listings for students.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Link
                  to="/admin/login"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Open Admin Portal
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Student Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {opportunities.slice(0, 6).map((opp) => (
                <OpportunityCard
                  key={opp.opportunityId}
                  opportunity={opp}
                  detailHref={`/opportunities/${opp.opportunityId}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* How CampusConnect Works */}
        <section id="how-it-works" className="bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-display font-bold text-slate-950 tracking-tight">
                Structured for Trust and Student Career Readiness
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Every workflow in CampusConnect separates administrative verification from student
                applications so college learners can evaluate real roles with clear criteria.
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 border-t border-slate-200">
              <div>
                <h3 className="text-base font-display font-bold text-slate-950">
                  01. Verified Listings Only
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Opportunities remain pending until reviewed by an authorized CampusConnect
                  administrator. Students can flag suspicious listings for immediate investigation.
                </p>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-950">
                  02. Transparent Profile Matching
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Recommendations match your declared skills, academic course, preferred city, and
                  opportunity category using clear, inspectable rule-based criteria.
                </p>
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-slate-950">
                  03. End-to-End Application Tracking
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Review your details before submitting, prevent accidental duplicate applications,
                  and track status transitions from submission to selection in real time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Campus Events */}
        <section id="events" className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-950 tracking-tight">
                Upcoming Campus Events & Workshops
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Career preparation clinics, skill sessions, and networking meetups across Dehradun.
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm font-semibold text-blue-700 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              View all in Student Portal
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-sm text-slate-600">
              Upcoming campus workshops and placement sessions will be announced here once published by administrators.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.slice(0, 4).map((evt) => (
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
                      <p className="text-xs text-slate-500">
                        <span>{EVENT_TYPE_LABELS[evt.eventType]}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{evt.organizer}</span>
                      </p>
                      <h3 className="mt-1.5 text-lg font-display font-bold text-slate-950">
                        {evt.title}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-2">{evt.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {evt.eventDate} · {evt.eventTime}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {evt.location}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-display font-bold text-slate-900">CampusConnect</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xl leading-relaxed">
              {PLATFORM_DISCLAIMER}
            </p>
          </div>
          <div className="flex items-center gap-6 text-xs font-medium text-slate-600">
            <Link to="/login" className="hover:text-slate-950 whitespace-nowrap">
              Student Login
            </Link>
            <Link to="/admin/login" className="hover:text-slate-950 whitespace-nowrap">
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
