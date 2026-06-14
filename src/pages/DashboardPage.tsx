import { useEffect, useState } from 'react';
import { getFarmSummaries } from '../api/reports';
import type { FarmSummaryDto } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function FarmCard({ farm }: { farm: FarmSummaryDto }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{farm.farmName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Farm ID #{farm.farmId}</p>
        </div>
        <span className="text-2xl">🌾</span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <dt className="text-xs text-green-700 font-medium">Milk This Month</dt>
          <dd className="text-lg font-bold text-green-900 mt-0.5">
            {farm.totalMilkThisMonth.toFixed(1)} L
          </dd>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <dt className="text-xs text-amber-700 font-medium">Expenses This Month</dt>
          <dd className="text-lg font-bold text-amber-900 mt-0.5">
            ${farm.totalExpensesThisMonth.toFixed(2)}
          </dd>
        </div>
        <div className="col-span-2 bg-gray-50 rounded-lg p-3">
          <dt className="text-xs text-gray-500 font-medium">Reports This Year</dt>
          <dd className="text-base font-semibold text-gray-800 mt-0.5">
            {farm.reportsThisYear} report{farm.reportsThisYear !== 1 ? 's' : ''}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs text-gray-400">Last Submitted</dt>
          <dd className="text-sm text-gray-700 mt-0.5">{formatDate(farm.lastSubmittedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFarmSummaries()
      .then(setFarms)
      .catch(() => setError('Failed to load farm data.'))
      .finally(() => setLoading(false));
  }, []);

  const totalMilk = farms.reduce((sum, f) => sum + f.totalMilkThisMonth, 0);
  const totalExpenses = farms.reduce((sum, f) => sum + f.totalExpensesThisMonth, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Overview for {monthName} {now.getFullYear()}</p>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={`Total Milk This Month (all farms)`}
          value={`${totalMilk.toFixed(1)} L`}
        />
        <StatCard
          label={`Total Expenses This Month (all farms)`}
          value={`$${totalExpenses.toFixed(2)}`}
        />
      </div>

      {/* Farm cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Farms ({farms.length})
        </h2>
        {farms.length === 0 ? (
          <p className="text-gray-400 text-sm">No farms found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {farms.map((farm) => (
              <FarmCard key={farm.farmId} farm={farm} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
