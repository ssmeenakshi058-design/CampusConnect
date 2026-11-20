import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Database,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  CURRENT_DEMO_SEED_VERSION,
  deleteOnlyDemoDataset,
  fetchDemoDatasetStats,
  generateBulkDemoDataset,
  type DemoDatasetStats,
  type DemoGenerationProgress,
} from '../../lib/demoDataGenerator';
import { invalidateMarketplaceCache } from '../../lib/marketplaceStore';

export function AdminDemoDataPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DemoDatasetStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [runningAction, setRunningAction] = useState<'generate' | 'refresh' | 'delete' | null>(
    null
  );
  const [progress, setProgress] = useState<DemoGenerationProgress | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const loadStats = useCallback(async (showFeedback = false) => {
    setLoadingStats(true);
    try {
      const data = await fetchDemoDatasetStats();
      setStats(data);
      if (showFeedback) {
        setStatusMessage({
          type: 'info',
          text: `Live Firestore statistics refreshed: ${data.totalDemoRecords.toLocaleString('en-IN')} synthetic demo records currently stored.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to fetch demo dataset statistics.',
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    loadStats(false);
  }, [loadStats]);

  const handleGenerateOrRefresh = async (mode: 'generate' | 'refresh') => {
    if (!user || runningAction) return;
    setRunningAction(mode);
    setConfirmDeleteOpen(false);
    setStatusMessage(null);
    setProgress({
      phase: mode === 'refresh' ? 'Preparing dataset refresh...' : 'Starting bulk demo generation...',
      completedOps: 0,
      totalOps: 1,
      insertedRecords: 0,
      errors: [],
    });

    try {
      const result = await generateBulkDemoDataset(user.uid, (prog) => {
        setProgress({ ...prog });
      });
      invalidateMarketplaceCache();
      setStats(result);
      if (result.errors.length > 0) {
        setStatusMessage({
          type: 'error',
          text: `Completed with ${result.errors.length} batch warning(s). ${result.totalDemoRecords.toLocaleString('en-IN')} demo records available.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text:
            mode === 'refresh'
              ? `Demo dataset refreshed idempotently (${CURRENT_DEMO_SEED_VERSION}). ${result.totalDemoRecords.toLocaleString('en-IN')} synthetic records verified in Firestore.`
              : `Successfully generated ${result.totalDemoRecords.toLocaleString('en-IN')} synthetic demo records across internships, jobs, live projects, events, skill programs, and fictional companies.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to generate synthetic demo dataset.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const handleConfirmDeleteDemo = async () => {
    if (runningAction) return;
    setRunningAction('delete');
    setConfirmDeleteOpen(false);
    setStatusMessage(null);
    setProgress({
      phase: 'Scanning for synthetic demo records (isDemo == true)...',
      completedOps: 0,
      totalOps: 1,
      insertedRecords: 0,
      errors: [],
    });

    try {
      const result = await deleteOnlyDemoDataset((prog) => {
        setProgress({ ...prog });
      });
      invalidateMarketplaceCache();
      await loadStats(false);
      if (result.errors.length > 0) {
        setStatusMessage({
          type: 'error',
          text: `Deleted ${result.deletedCount.toLocaleString('en-IN')} demo documents with ${result.errors.length} error(s). Real user data remained untouched.`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Removed ${result.deletedCount.toLocaleString('en-IN')} synthetic demo documents (isDemo == true). All real student accounts, real applications, and verified employer records remain intact.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to delete synthetic demo data.',
      });
    } finally {
      setRunningAction(null);
    }
  };

  const progressPct =
    progress && progress.totalOps > 0
      ? Math.min(100, Math.round((progress.completedOps / progress.totalOps) * 100))
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-slate-950 tracking-tight">
            Demo Data Management
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Populate, inspect, refresh, or remove the 1,000+ record synthetic CampusConnect
            marketplace dataset. Every generated record is tagged with{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              isDemo: true
            </code>{' '}
            and{' '}
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              demoLabel: &quot;DEMO DATA&quot;
            </code>
            .
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          Target Seed Version: <span className="text-slate-900 font-semibold">{CURRENT_DEMO_SEED_VERSION}</span>
        </div>
      </div>

      {/* Primary Action Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-display font-bold text-slate-950">Dataset Operations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Writes run in safe Firestore batches (350 operations per batch) using deterministic IDs
            for idempotency. Clicking Generate or Refresh never duplicates records and never alters
            real user records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleGenerateOrRefresh('generate')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <Database className="w-4 h-4" />
            {runningAction === 'generate' ? 'Generating Demo Data...' : 'Generate Demo Data'}
          </button>

          <button
            type="button"
            disabled={runningAction !== null || loadingStats}
            onClick={() => loadStats(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4" />
            {loadingStats ? 'Loading Stats...' : 'View Dataset Statistics'}
          </button>

          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => handleGenerateOrRefresh('refresh')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${runningAction === 'refresh' ? 'animate-spin' : ''}`} />
            {runningAction === 'refresh' ? 'Refreshing Dataset...' : 'Refresh Demo Dataset'}
          </button>

          <button
            type="button"
            disabled={runningAction !== null}
            onClick={() => setConfirmDeleteOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-60 transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-4 h-4" />
            {runningAction === 'delete' ? 'Deleting Demo Data...' : 'Delete Demo Data'}
          </button>
        </div>

        {/* Inline Delete Confirmation (no browser alert/confirm dialogs) */}
        {confirmDeleteOpen && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
              <div className="text-xs text-red-950">
                <p className="font-bold">Confirm Deletion of Synthetic Demo Records</p>
                <p className="mt-0.5 text-red-900 leading-relaxed">
                  This permanently removes ONLY records marked{' '}
                  <code className="font-mono bg-red-100 px-1 rounded">isDemo: true</code> across
                  opportunities, events, skill programs, and fictional demo companies. Real student
                  profiles, real verified companies, and genuine listings will NOT be affected.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDemo}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800"
              >
                Yes, Delete Demo Records
              </button>
            </div>
          </div>
        )}

        {/* Live Progress Indicator */}
        {progress && (runningAction !== null || progress.completedOps > 0) && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-900">{progress.phase}</span>
              <span className="font-mono font-semibold text-blue-700 tabular-nums">
                {progressPct}% ({progress.completedOps.toLocaleString('en-IN')} /{' '}
                {progress.totalOps.toLocaleString('en-IN')} ops)
              </span>
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  runningAction === 'delete' ? 'bg-red-600' : 'bg-blue-700'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {progress.errors.length > 0 && (
              <div className="mt-2 p-2.5 rounded bg-red-50 border border-red-200 text-[11px] text-red-800 space-y-1">
                {progress.errors.slice(0, 5).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Outcome Notification */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : statusMessage.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{statusMessage.text}</span>
          </div>
        )}
      </section>

      {/* Live Dataset Statistics Breakdown */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-display font-bold text-slate-950">
              Live Synthetic Dataset Statistics
            </h2>
            <p className="text-xs text-slate-500">
              Computed directly from Cloud Firestore documents where <code className="font-mono">isDemo == true</code>.
            </p>
          </div>
          {stats?.seedVersion && (
            <p className="text-xs font-mono text-slate-500">
              Active Seed: <strong className="text-slate-800">{stats.seedVersion}</strong>
              {stats.lastUpdated ? ` · Updated ${stats.lastUpdated}` : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Demo Internships', value: stats?.internshipsCount ?? 0, target: '520 target' },
            { label: 'Total Demo Part-Time Jobs', value: stats?.partTimeCount ?? 0, target: '110 target' },
            { label: 'Total Demo Jobs (Full-Time)', value: stats?.entryLevelCount ?? 0, target: '110 target' },
            { label: 'Total Demo Projects', value: stats?.liveProjectsCount ?? 0, target: '110 target' },
            { label: 'Total Demo Events', value: stats?.eventsCount ?? 0, target: '105 target' },
            { label: 'Total Demo Skill Programs', value: stats?.skillProgramsCount ?? 0, target: '105 target' },
            { label: 'Fictional Demo Companies', value: stats?.companiesCount ?? 0, target: '30 target' },
            { label: 'Total Demo Records', value: stats?.totalDemoRecords ?? 0, target: '1,090 total' },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
            >
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-2 text-2xl font-display font-bold text-slate-950 tabular-nums">
                {loadingStats ? '—' : item.value.toLocaleString('en-IN')}
              </p>
              <p className="mt-1 text-[11px] font-mono text-slate-400">{item.target}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Transparency & Safeguards Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-950">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Data Integrity &amp; Non-Deception Guarantees</span>
        </div>
        <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5 leading-relaxed">
          <li>
            All 30 demo companies are 100% fictional organizations (e.g., ElevateEdge Solutions,
            FinBridge Analytics, GrowthSphere Media) and never impersonate real companies or
            colleges.
          </li>
          <li>
            Demo listings carry <code className="font-mono">status: &quot;demo_approved&quot;</code>{' '}
            and <code className="font-mono">isVerified: false</code> so Firestore rules and UI
            badges never misrepresent synthetic records as verified real vacancies.
          </li>
          <li>
            Every synthetic card and detail page displays{' '}
            <strong>&ldquo;DEMO LISTING — NOT A LIVE VACANCY&rdquo;</strong>, and simulated student
            applications are clearly flagged as <strong>DEMO APPLICATION</strong> and separated from
            real employer analytics.
          </li>
        </ul>
      </section>
    </div>
  );
}
