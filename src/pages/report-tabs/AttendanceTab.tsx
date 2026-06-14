import type { ReportDto } from '../../types';

interface Props {
  report: ReportDto;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function AttendanceTab({ report }: Props) {
  const records = report.attendance ?? [];
  const daysInMonth = getDaysInMonth(report.year, report.month);

  if (records.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No attendance records for this report.
      </div>
    );
  }

  // Build worker list (preserve insertion order, unique by workerId)
  const workerMap = new Map<number, string>();
  const grid = new Map<number, Map<number, boolean>>(); // workerId → dayOfMonth → present

  for (const rec of records) {
    if (!workerMap.has(rec.workerId)) {
      workerMap.set(rec.workerId, rec.workerName);
      grid.set(rec.workerId, new Map());
    }
    grid.get(rec.workerId)!.set(rec.dayOfMonth, rec.present);
  }

  const workerIds = Array.from(workerMap.keys());
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Column totals (present per day)
  const dayTotals: number[] = days.map((day) => {
    return workerIds.filter((wid) => grid.get(wid)?.get(day) === true).length;
  });

  const grandTotal = dayTotals.reduce((s, v) => s + v, 0);

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse min-w-full">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="sticky left-0 z-10 bg-green-800 px-3 py-2 text-left font-medium min-w-[140px]">
              Worker
            </th>
            {days.map((d) => (
              <th key={d} className="px-1.5 py-2 text-center font-medium w-8">
                {d}
              </th>
            ))}
            <th className="px-2 py-2 text-center font-medium min-w-[56px]">Present</th>
            <th className="px-2 py-2 text-center font-medium min-w-[48px]">Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {workerIds.map((wid) => {
            const dayMap = grid.get(wid)!;
            const presentCount = Array.from(dayMap.values()).filter(Boolean).length;
            return (
              <tr key={wid} className="hover:bg-gray-50">
                <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-2 font-medium text-gray-800 border-r border-gray-200">
                  {workerMap.get(wid)}
                </td>
                {days.map((d) => {
                  const val = dayMap.get(d);
                  return (
                    <td key={d} className="px-1 py-2 text-center">
                      {val === true ? (
                        <span className="text-green-600 font-bold">✓</span>
                      ) : val === false ? (
                        <span className="text-red-400">–</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-semibold text-green-700">
                  {presentCount}
                </td>
                <td className="px-2 py-2 text-center text-gray-500">{daysInMonth}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold text-gray-700">
            <td className="sticky left-0 z-10 bg-gray-100 px-3 py-2 border-r border-gray-200">
              TOTAL
            </td>
            {dayTotals.map((total, i) => (
              <td key={i} className="px-1 py-2 text-center text-green-800">
                {total > 0 ? total : ''}
              </td>
            ))}
            <td className="px-2 py-2 text-center text-green-800 font-bold">{grandTotal}</td>
            <td className="px-2 py-2 text-center text-gray-500">
              {daysInMonth * workerIds.length}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
