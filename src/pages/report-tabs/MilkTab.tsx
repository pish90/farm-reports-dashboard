import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MilkRecordDto, ReportDto } from '../../types';

interface Props {
  report: ReportDto;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export default function MilkTab({ report }: Props) {
  const milk = report.milk ?? [];

  if (milk.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No milk production records for this report.
      </div>
    );
  }

  const sorted: MilkRecordDto[] = [...milk].sort((a, b) => a.dayOfMonth - b.dayOfMonth);

  let running = 0;
  const tableRows = sorted.map((m) => {
    running += Number(m.litres) ?? 0;
    return { ...m, running };
  });

  const grandTotal = running;

  const chartData = tableRows.map((r) => ({
    day: r.dayOfMonth,
    litres: Number(r.litres) ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Chart */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-3">
          Daily Production — {MONTH_NAMES[report.month - 1]} {report.year}
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="day"
              label={{ value: 'Day', position: 'insideBottom', offset: -4 }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{ value: 'Litres', angle: -90, position: 'insideLeft', offset: 10 }}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(2)} L`, 'Litres']}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Line
              type="monotone"
              dataKey="litres"
              stroke="#166534"
              strokeWidth={2}
              dot={{ r: 3, fill: '#166534' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-green-800 text-white">
              <th className="px-4 py-2 text-left font-medium">Day</th>
              <th className="px-4 py-2 text-left font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Litres</th>
              <th className="px-4 py-2 text-right font-medium">Running Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tableRows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{r.dayOfMonth}</td>
                <td className="px-4 py-2 text-gray-700">
                  {formatDate(report.year, report.month, r.dayOfMonth)}
                </td>
                <td className="px-4 py-2 text-right text-gray-900">
                  {Number(r.litres).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {r.running.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-50 font-semibold">
              <td className="px-4 py-2" colSpan={2}></td>
              <td className="px-4 py-2 text-right text-green-800">Total Litres</td>
              <td className="px-4 py-2 text-right text-green-900 font-bold">
                {grandTotal.toFixed(2)}
              </td>
            </tr>
            <tr className="bg-green-100 font-semibold">
              <td className="px-4 py-2" colSpan={2}></td>
              <td className="px-4 py-2 text-right text-green-800">Value (×40)</td>
              <td className="px-4 py-2 text-right text-green-900 font-bold">
                {(grandTotal * 40).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
