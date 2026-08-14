import { useEffect, useState } from 'react';
import { getEmployeeLedger } from '../api/employees';
import { formatMoney, monthName } from '../lib/format';
import type { EmployeeLedgerDto } from '../types';

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

const LEDGER_YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

export default function EmployeeLedgerSection({
  farmId, employeeId, bordered = true,
}: {
  farmId: number;
  employeeId: number;
  bordered?: boolean;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [ledger, setLedger] = useState<EmployeeLedgerDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getEmployeeLedger(farmId, employeeId, year)
      .then(setLedger)
      .catch(() => setLedger(null))
      .finally(() => setLoading(false));
  }, [farmId, employeeId, year]);

  return (
    <div className={bordered ? 'pt-2 border-t border-gray-200' : ''}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Annual Ledger</h4>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
          {LEDGER_YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="text-xs text-gray-400 py-4 text-center">Loading…</div>
      ) : !ledger ? (
        <div className="text-xs text-gray-400 py-4 text-center">Failed to load ledger</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Opening balance</div>
              <div className="text-sm font-bold text-gray-900">{formatMoney(ledger.openingBalance)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Earned this year</div>
              <div className="text-sm font-bold text-gray-900">{formatMoney(ledger.totalEarned)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Paid this year</div>
              <div className="text-sm font-bold text-gray-900">{formatMoney(ledger.totalPaid)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Closing balance</div>
              <div className="text-sm font-bold text-gray-900">{formatMoney(ledger.closingBalance)}</div>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Month</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Earned</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Paid</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ledger.months.map((m) => (
                  <tr key={m.month}>
                    <td className="px-3 py-2">{monthName(m.month)}</td>
                    <td className="px-3 py-2">{formatMoney(m.earned)}</td>
                    <td className="px-3 py-2">{formatMoney(m.paid)}</td>
                    <td className="px-3 py-2">{formatMoney(m.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
