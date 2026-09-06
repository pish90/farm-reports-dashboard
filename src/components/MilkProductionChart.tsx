import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMilkSummaryRange } from '../api/reports';
import { useFarmScope } from '../auth/useFarmScope';
import { MONTH_NAMES } from '../lib/format';
import type { MilkSummaryDto } from '../types';

type ViewMode = 'monthly' | 'yearly';

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).reverse();

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

function monthKey(year: number, month: number): number {
  return year * 100 + month;
}

export default function MilkProductionChart() {
  const { farms, farmId, setFarmId, multiFarm } = useFarmScope();

  const [startYear, setStartYear] = useState(now.getFullYear() - 1);
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1);
  const [endYear, setEndYear] = useState(now.getFullYear());
  const [endMonth, setEndMonth] = useState(now.getMonth() + 1);
  const [view, setView] = useState<ViewMode>('monthly');

  const [data, setData] = useState<MilkSummaryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeInvalid = monthKey(startYear, startMonth) > monthKey(endYear, endMonth);

  useEffect(() => {
    if (!farmId || rangeInvalid) return;
    setLoading(true);
    setError(null);
    getMilkSummaryRange(farmId, startYear, startMonth, endYear, endMonth)
      .then(setData)
      .catch(() => setError('Failed to load milk production data.'))
      .finally(() => setLoading(false));
  }, [farmId, startYear, startMonth, endYear, endMonth, rangeInvalid]);

  const monthlyChartData = useMemo(
    () =>
      data.map((d) => ({
        label: `${MONTH_NAMES[d.month - 1].slice(0, 3)} ${d.year}`,
        litres: Number(d.totalLitres) || 0,
      })),
    [data],
  );

  const yearlyChartData = useMemo(() => {
    const totals = new Map<number, number>();
    data.forEach((d) => {
      totals.set(d.year, (totals.get(d.year) ?? 0) + (Number(d.totalLitres) || 0));
    });
    return Array.from(totals.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, litres]) => ({ label: String(year), litres }));
  }, [data]);

  const chartData = view === 'monthly' ? monthlyChartData : yearlyChartData;

  if (!farmId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Your role has no farm assigned.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap gap-3 items-center">
        <h3 className="text-sm font-semibold text-gray-700 mr-2">Milk Production</h3>

        {multiFarm && (
          <select
            value={farmId ?? ''}
            onChange={(e) => setFarmId(Number(e.target.value))}
            className={selectClass}
          >
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">From</span>
          <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} className={selectClass}>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">To</span>
          <select value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))} className={selectClass}>
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx + 1} value={idx + 1}>{name}</option>
            ))}
          </select>
          <select value={endYear} onChange={(e) => setEndYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          <button
            onClick={() => setView('monthly')}
            className={`px-3 py-1.5 transition-colors ${
              view === 'monthly' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setView('yearly')}
            className={`px-3 py-1.5 transition-colors border-l border-gray-300 ${
              view === 'yearly' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="p-4">
        {rangeInvalid ? (
          <div className="p-6 text-center text-red-600 text-sm">
            Start of range must not be after end of range.
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">{error}</div>
        ) : chartData.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No milk production data for this range.</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {view === 'monthly' ? (
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Litres', angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)} L`, 'Litres']} />
                <Line
                  type="monotone"
                  dataKey="litres"
                  stroke="#166534"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#166534' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{ value: 'Litres', angle: -90, position: 'insideLeft', offset: 10 }}
                />
                <Tooltip formatter={(value: number) => [`${value.toFixed(2)} L`, 'Litres']} />
                <Bar dataKey="litres" fill="#166534" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
