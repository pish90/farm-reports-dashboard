import { Fragment, useEffect, useState } from 'react';
import { getFarmAnnualPayroll } from '../../api/payroll';
import { formatMoney, monthName } from '../../lib/format';
import type { EmployeeAnnualPayrollDto, ReportDto } from '../../types';

interface Props {
  report: ReportDto;
}

export default function PayrollTab({ report }: Props) {
  const [rows, setRows] = useState<EmployeeAnnualPayrollDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getFarmAnnualPayroll(report.farmId, report.year)
      .then(setRows)
      .catch(() => setError('Failed to load payroll.'))
      .finally(() => setLoading(false));
  }, [report.farmId, report.year]);

  if (loading) {
    return <div className="py-12 text-center text-gray-400 text-sm">Loading payroll…</div>;
  }

  if (error) {
    return <div className="py-12 text-center text-red-600 text-sm">{error}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No salaried employees on this farm.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Each employee's payroll for {report.year} — not just this report's month.
      </p>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">LS #</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Employee</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Opening</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Earned YTD</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Paid YTD</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Closing</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r) => (
              <Fragment key={r.employeeId}>
                <tr className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">{r.lsNumber ?? '—'}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.employeeName}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatMoney(r.ledger.openingBalance)}</td>
                  <td className="px-3 py-2">{formatMoney(r.ledger.totalEarned)}</td>
                  <td className="px-3 py-2">{formatMoney(r.ledger.totalPaid)}</td>
                  <td className="px-3 py-2 font-medium">{formatMoney(r.ledger.closingBalance)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setExpanded(expanded === r.employeeId ? null : r.employeeId)}
                      className="text-green-700 hover:text-green-900 text-xs font-medium"
                    >
                      {expanded === r.employeeId ? 'Hide months' : 'Show months'}
                    </button>
                  </td>
                </tr>
                {expanded === r.employeeId && (
                  <tr>
                    <td colSpan={8} className="px-3 py-3 bg-gray-50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="text-left px-2 py-1 font-medium text-gray-500">Month</th>
                            <th className="text-left px-2 py-1 font-medium text-gray-500">Earned</th>
                            <th className="text-left px-2 py-1 font-medium text-gray-500">Paid</th>
                            <th className="text-left px-2 py-1 font-medium text-gray-500">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {r.ledger.months.map((m) => (
                            <tr key={m.month}>
                              <td className="px-2 py-1">{monthName(m.month)}</td>
                              <td className="px-2 py-1">{formatMoney(m.earned)}</td>
                              <td className="px-2 py-1">{formatMoney(m.paid)}</td>
                              <td className="px-2 py-1">{formatMoney(m.balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
