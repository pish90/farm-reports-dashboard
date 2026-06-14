import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadExport, getReport } from '../api/reports';
import StatusBadge from '../components/StatusBadge';
import type { ReportDto } from '../types';
import AttendanceTab from './report-tabs/AttendanceTab';
import ExpensesTab from './report-tabs/ExpensesTab';
import LivestockTab from './report-tabs/LivestockTab';
import MilkTab from './report-tabs/MilkTab';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TABS = ['Attendance', 'Livestock', 'Milk', 'Expenses'] as const;
type Tab = (typeof TABS)[number];

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const reportId = Number(id);

  const [report, setReport] = useState<ReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Attendance');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    getReport(reportId)
      .then(setReport)
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await downloadExport(report.id, report.year, report.month);
    } catch {
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
        {error ?? 'Report not found.'}
      </div>
    );
  }

  const monthName = MONTH_NAMES[report.month - 1];

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-1">
        <Link to="/reports" className="hover:text-green-700 transition-colors">
          Reports
        </Link>
        <span>/</span>
        <span>Farm #{report.farmId}</span>
        <span>/</span>
        <span className="text-gray-800 font-medium">
          {monthName} {report.year}
        </span>
      </nav>

      {/* Header card */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              {monthName} {report.year}
            </h2>
            <StatusBadge status={report.status} />
          </div>
          <p className="text-sm text-gray-500">Farm #{report.farmId} &middot; Report #{report.id}</p>
          {report.submittedAt && (
            <p className="text-xs text-gray-400">
              Submitted: {new Date(report.submittedAt).toLocaleString()}
            </p>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {exporting ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>⬇</span>
          )}
          Export to Excel
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-green-700 text-green-700'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'Attendance' && (
            <AttendanceTab report={report} />
          )}
          {activeTab === 'Livestock' && (
            <LivestockTab livestock={report.livestock} />
          )}
          {activeTab === 'Milk' && (
            <MilkTab report={report} />
          )}
          {activeTab === 'Expenses' && (
            <ExpensesTab expenses={report.expenses} />
          )}
        </div>
      </div>
    </div>
  );
}
