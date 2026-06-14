import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmSummaries, listReports } from '../api/reports';
import StatusBadge from '../components/StatusBadge';
import type { FarmSummaryDto, ReportDto } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
];

export default function ReportsPage() {
  const navigate = useNavigate();

  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [reports, setReports] = useState<ReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [farmFilter, setFarmFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Load farms for the dropdown map
  useEffect(() => {
    getFarmSummaries().catch(() => null).then((data) => {
      if (data) setFarms(data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof listReports>[0] = {};
    if (farmFilter) params.farmId = Number(farmFilter);
    if (yearFilter) params.year = Number(yearFilter);
    if (monthFilter) params.month = Number(monthFilter);
    if (statusFilter) params.status = statusFilter;

    listReports(params)
      .then(setReports)
      .catch(() => setError('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [farmFilter, yearFilter, monthFilter, statusFilter]);

  const farmMap: Record<number, string> = {};
  farms.forEach((f) => { farmMap[f.farmId] = f.farmName; });

  const selectClass =
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <select
          value={farmFilter}
          onChange={(e) => setFarmFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Farms</option>
          {farms.map((f) => (
            <option key={f.farmId} value={f.farmId}>
              {f.farmName}
            </option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className={selectClass}
        >
          <option value="">All Months</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {(farmFilter || yearFilter || monthFilter || statusFilter) && (
          <button
            onClick={() => { setFarmFilter(''); setYearFilter(''); setMonthFilter(''); setStatusFilter(''); }}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Clear filters
          </button>
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
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No reports found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Farm</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/reports/${r.id}`)}
                  className="hover:bg-green-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-gray-500">#{r.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {farmMap[r.farmId] ?? `Farm #${r.farmId}`}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {MONTH_NAMES[r.month - 1]} {r.year}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.submittedAt
                      ? new Date(r.submittedAt).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
