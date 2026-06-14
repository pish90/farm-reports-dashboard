import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api/audit';
import { getFarmSummaries } from '../api/reports';
import { useAuth } from '../auth/AuthContext';
import type { AuditAction, AuditLogDto, AuditLogPageDto, FarmSummaryDto } from '../types';

const PAGE_SIZE = 50;

const ALL_ACTIONS: AuditAction[] = [
  'LOGIN', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'PASSWORD_RESET',
  'REPORT_CREATED', 'REPORT_SUBMITTED', 'REPORT_REOPENED',
  'ATTENDANCE_UPDATED', 'LIVESTOCK_UPDATED', 'MILK_UPDATED',
  'EXPENSES_UPDATED', 'ATTENDANCE_NOTES_UPDATED', 'LIVESTOCK_NOTES_UPDATED',
  'WORKER_ADDED', 'WORKER_DEACTIVATED', 'EXCEL_EXPORTED',
];

function formatAction(action: AuditAction): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionBadge(action: AuditAction): string {
  const auth   = 'bg-blue-100 text-blue-800';
  const danger = 'bg-red-100 text-red-800';
  const green  = 'bg-green-100 text-green-800';
  const amber  = 'bg-amber-100 text-amber-800';
  const gray   = 'bg-gray-100 text-gray-700';
  const purple = 'bg-purple-100 text-purple-800';

  switch (action) {
    case 'LOGIN':               return green;
    case 'LOGIN_FAILED':        return danger;
    case 'PASSWORD_CHANGED':    return auth;
    case 'PASSWORD_RESET':      return amber;
    case 'REPORT_CREATED':      return green;
    case 'REPORT_SUBMITTED':    return green;
    case 'REPORT_REOPENED':     return amber;
    case 'WORKER_ADDED':        return auth;
    case 'WORKER_DEACTIVATED':  return danger;
    case 'EXCEL_EXPORTED':      return purple;
    default:                    return gray;
  }
}

function roleBadge(role: string | null): string {
  switch (role) {
    case 'ADMIN':               return 'bg-red-100 text-red-800 border border-red-200';
    case 'MANAGER':             return 'bg-blue-100 text-blue-800 border border-blue-200';
    case 'OPERATIONS_MANAGER':  return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    default:                    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
}

function Pagination({
  page, totalPages, totalElements, onPrev, onNext,
}: {
  page: number; totalPages: number; totalElements: number;
  onPrev: () => void; onNext: () => void;
}) {
  const from = page * PAGE_SIZE + 1;
  const to   = Math.min((page + 1) * PAGE_SIZE, totalElements);
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 text-sm text-gray-600">
      <span>
        {totalElements === 0 ? '0 results' : `${from}–${to} of ${totalElements}`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-gray-500">
          Page {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function AuditRow({ log }: { log: AuditLogDto }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
        {new Date(log.timestamp).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{log.userName ?? '—'}</div>
        {log.userRole && (
          <span className={`inline-flex mt-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${roleBadge(log.userRole)}`}>
            {log.userRole.replace('_', ' ')}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{log.farmName ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${actionBadge(log.action)}`}>
          {formatAction(log.action)}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
        {log.description ?? '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
        {log.entityType && log.entityId ? `${log.entityType} #${log.entityId}` : '—'}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ipAddress ?? '—'}</td>
    </tr>
  );
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const canFilterFarm = isAdmin || user?.role === 'OPERATIONS_MANAGER';

  const [farms, setFarms]   = useState<FarmSummaryDto[]>([]);
  const [result, setResult] = useState<AuditLogPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [farmFilter,   setFarmFilter]   = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate,    setStartDate]    = useState('');
  const [endDate,      setEndDate]      = useState('');
  const [page,         setPage]         = useState(0);

  useEffect(() => {
    if (canFilterFarm) {
      getFarmSummaries().then(setFarms).catch(() => null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [farmFilter, actionFilter, startDate, endDate, page]);

  function load() {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof getAuditLogs>[0] = { page, size: PAGE_SIZE };
    if (farmFilter)   params.farmId    = Number(farmFilter);
    if (actionFilter) params.action    = actionFilter;
    if (startDate)    params.startDate = startDate;
    if (endDate)      params.endDate   = endDate;

    getAuditLogs(params)
      .then(setResult)
      .catch(() => setError('Failed to load audit logs.'))
      .finally(() => setLoading(false));
  }

  function clearFilters() {
    setFarmFilter('');
    setActionFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  }

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const hasFilters = !!(farmFilter || actionFilter || startDate || endDate);
  const selectClass =
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';
  const inputClass =
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white w-36';

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {canFilterFarm && (
          <select
            value={farmFilter}
            onChange={(e) => { setFarmFilter(e.target.value); setPage(0); }}
            className={selectClass}
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
        )}

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
          className={selectClass}
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{formatAction(a)}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
            className={inputClass}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        {result && (
          <span className="ml-auto text-xs text-gray-400">
            {result.totalElements.toLocaleString()} events
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : !result || result.content.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No audit events found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Farm</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {result.content.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              totalElements={result.totalElements}
              onPrev={() => changePage(page - 1)}
              onNext={() => changePage(page + 1)}
            />
          </>
        )}
      </div>
    </div>
  );
}
