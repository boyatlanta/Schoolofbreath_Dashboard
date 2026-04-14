import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  downloadMembershipAuditCsv,
  fetchMembershipAuditReport,
  MembershipAuditData,
  MembershipAuditParams,
  MembershipAuditRow,
} from '../services/membershipAuditService';

const DEFAULT_PARAMS: MembershipAuditParams = {
  limit: 50,
  skip: 0,
  concurrency: 2,
  delayMs: 150,
  storeFocus: true,
  onlyMismatches: true,
};

const CLASSIFICATION_BADGE: Record<string, string> = {
  MISSING_STORE_TAG: 'bg-amber-100 text-amber-700',
  FALSE_CANCEL_RISK: 'bg-rose-100 text-rose-700',
  STORE_INACTIVE_VERIFY_CANCEL: 'bg-orange-100 text-orange-700',
  RC_UNAVAILABLE: 'bg-slate-100 text-slate-700',
  ERROR: 'bg-rose-100 text-rose-700',
  OK_ACTIVE: 'bg-emerald-100 text-emerald-700',
  OK_INACTIVE: 'bg-sky-100 text-sky-700',
  WEB_ONLY_OK: 'bg-indigo-100 text-indigo-700',
  SYSTEME_NOT_CONFIGURED: 'bg-slate-200 text-slate-700',
};

const formatBool = (value: boolean | null | undefined): string => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return '-';
};

const SummaryPill: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const colorClass = CLASSIFICATION_BADGE[label] || 'bg-slate-100 text-slate-700';
  return (
    <div className="px-3 py-2 rounded-xl bg-white border border-slate-200">
      <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{label}</div>
      <div className={`inline-flex px-2 py-1 rounded-md text-xs font-bold ${colorClass}`}>{value}</div>
    </div>
  );
};

const ErrorCell: React.FC<{ row: MembershipAuditRow }> = ({ row }) => {
  const message = row.rcError || row.systemeError;
  if (!message) return <span className="text-slate-300">-</span>;
  return <span className="text-rose-600 text-xs">{message}</span>;
};

export const MembershipAuditReport: React.FC = () => {
  const [filters, setFilters] = useState<MembershipAuditParams>(DEFAULT_PARAMS);
  const [report, setReport] = useState<MembershipAuditData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runReport = useCallback(async (params: MembershipAuditParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMembershipAuditReport(params);
      setReport(response);
      setFilters(response.options);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load membership audit report';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runReport(DEFAULT_PARAMS);
  }, [runReport]);

  const orderedSummary = useMemo(() => {
    if (!report?.summary) return [];
    return Object.entries(report.summary).sort((a, b) => b[1] - a[1]);
  }, [report?.summary]);

  const goNextPage = () => {
    if (!report?.hasMore) return;
    runReport({ ...filters, skip: report.nextSkip });
  };

  const goPreviousPage = () => {
    const currentSkip = report?.options?.skip || 0;
    const pageSize = report?.options?.limit || filters.limit || 50;
    const previousSkip = Math.max(0, currentSkip - pageSize);
    runReport({ ...filters, skip: previousSkip });
  };

  const handleExportCsv = () => {
    if (!report?.rows?.length) return;
    downloadMembershipAuditCsv(report.rows);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-deep-teal mb-1">Membership Audit Report</h1>
          <p className="text-slate-500 font-medium">
            Read-only comparison of Mongo snapshot vs RevenueCat vs Systeme tags.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => runReport(filters)}
            disabled={loading}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:bg-slate-50 transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Report'}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={!report?.rows?.length}
            className="px-5 py-2.5 bg-teal-primary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </header>

      <section className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <h2 className="font-serif text-xl font-bold text-deep-teal mb-4">Query Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Limit
            <input
              type="number"
              min={1}
              max={200}
              value={filters.limit ?? 50}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, limit: Number(event.target.value) || 50 }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-light"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Skip
            <input
              type="number"
              min={0}
              value={filters.skip ?? 0}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, skip: Math.max(0, Number(event.target.value) || 0) }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-light"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Concurrency
            <input
              type="number"
              min={1}
              max={6}
              value={filters.concurrency ?? 2}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, concurrency: Number(event.target.value) || 2 }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-light"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Delay (ms)
            <input
              type="number"
              min={0}
              max={3000}
              value={filters.delayMs ?? 150}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, delayMs: Number(event.target.value) || 0 }))
              }
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-light"
            />
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-end">
            <input
              type="checkbox"
              checked={Boolean(filters.storeFocus)}
              onChange={(event) => setFilters((prev) => ({ ...prev, storeFocus: event.target.checked }))}
              className="mr-2 accent-teal-primary"
            />
            Store Focus
          </label>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-end">
            <input
              type="checkbox"
              checked={Boolean(filters.onlyMismatches)}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, onlyMismatches: event.target.checked }))
              }
              className="mr-2 accent-teal-primary"
            />
            Only Mismatches
          </label>
        </div>
      </section>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
          {error}
        </div>
      )}

      <section className="bg-gradient-to-r from-teal-primary/5 to-lavender/10 border border-teal-light/10 p-4 rounded-xl mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-primary font-bold mb-1">Total Candidates</p>
            <p className="font-serif text-xl font-bold text-deep-teal">{report?.totalCandidates ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-primary font-bold mb-1">Scanned</p>
            <p className="font-serif text-xl font-bold text-deep-teal">{report?.scannedCount ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-primary font-bold mb-1">Returned</p>
            <p className="font-serif text-xl font-bold text-deep-teal">{report?.returnedCount ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-primary font-bold mb-1">Duration</p>
            <p className="font-serif text-xl font-bold text-deep-teal">{report?.durationMs ? `${report.durationMs}ms` : '-'}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-primary font-bold mb-1">Has More</p>
            <p className="font-serif text-xl font-bold text-deep-teal">{report?.hasMore ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
        <h2 className="font-serif text-xl font-bold text-deep-teal mb-4">Classification Summary</h2>
        {orderedSummary.length === 0 ? (
          <p className="text-sm text-slate-500">No summary data yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {orderedSummary.map(([label, value]) => (
              <SummaryPill key={label} label={label} value={value} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden mb-10 border border-slate-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="font-serif text-xl font-bold text-deep-teal">Audit Rows</h2>
          <div className="flex gap-2">
            <button
              onClick={goPreviousPage}
              disabled={loading || (report?.options?.skip || 0) === 0}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={goNextPage}
              disabled={loading || !report?.hasMore}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1300px]">
            <thead>
              <tr className="bg-sand/30 border-b border-slate-100">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Email</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Classification</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">DB Active</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">RC Active</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">RC Kind</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Store Tag</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Canceled Tag</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Systeme Tags</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-teal-primary">Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {!report?.rows?.length && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    {loading ? 'Loading report...' : 'No rows returned for current filters.'}
                  </td>
                </tr>
              )}
              {report?.rows?.map((row) => (
                <tr key={row.userId} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-700">{row.email || row.userId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        CLASSIFICATION_BADGE[row.classification] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {row.classification}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatBool(row.dbStoreActive)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatBool(row.rcActive)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.rcKind || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatBool(row.systemeHasStoreTag)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatBool(row.systemeHasCanceledTag)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{row.systemeTags?.join(', ') || '-'}</td>
                  <td className="px-4 py-3">
                    <ErrorCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
