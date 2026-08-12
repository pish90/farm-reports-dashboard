import { useEffect, useState } from 'react';
import { getPayroll, getPayrollSummary, upsertPayroll } from '../api/payroll';
import { useFarmScope } from '../auth/useFarmScope';
import { formatMoney, MONTH_NAMES, monthName } from '../lib/format';
import type { PayrollEntryRequest, PayrollRecordDto, PayrollSummaryDto } from '../types';

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const EDITABLE_FIELDS: { key: keyof PayrollRecordDto; label: string }[] = [
  { key: 'salaryRate', label: 'Salary rate' },
  { key: 'daysWorked', label: 'Days' },
  { key: 'grossSalary', label: 'Gross' },
  { key: 'loans', label: 'Loans' },
  { key: 'amountPaid', label: 'Paid' },
  { key: 'amountRemaining', label: 'Remaining' },
];

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

export default function PayrollPage() {
  const { farms, farmId, setFarmId, multiFarm } = useFarmScope();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [rows, setRows] = useState<PayrollRecordDto[]>([]);
  const [summary, setSummary] = useState<PayrollSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    setError(null);
    Promise.all([getPayroll(farmId, year, month), getPayrollSummary(farmId, year)])
      .then(([entries, sum]) => {
        setRows(entries);
        setSummary(sum);
      })
      .catch(() => setError('Failed to load payroll.'))
      .finally(() => setLoading(false));
  }, [farmId, year, month]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  function updateRow(employeeId: number, field: keyof PayrollRecordDto, value: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.employeeId !== employeeId) return r;
        if (field === 'notes') return { ...r, notes: value };
        if (field === 'daysWorked') return { ...r, daysWorked: value === '' ? null : Number(value) };
        return { ...r, [field]: value === '' ? null : Number(value) };
      }),
    );
  }

  async function handleSave() {
    if (!farmId) return;
    setSaving(true);
    setError(null);
    try {
      const entries: PayrollEntryRequest[] = rows.map((r) => ({
        employeeId: r.employeeId,
        salaryRate: r.salaryRate,
        daysWorked: r.daysWorked,
        grossSalary: r.grossSalary,
        loans: r.loans,
        amountPaid: r.amountPaid,
        amountRemaining: r.amountRemaining,
        notes: r.notes,
      }));
      await upsertPayroll(farmId, year, month, entries);
      setToast('Payroll saved');
      const sum = await getPayrollSummary(farmId, year);
      setSummary(sum);
    } catch {
      setError('Failed to save payroll.');
    } finally {
      setSaving(false);
    }
  }

  if (!farmId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Your role has no farm assigned.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {multiFarm && (
          <select value={farmId ?? ''} onChange={(e) => setFarmId(Number(e.target.value))} className={selectClass}>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
        )}
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass}>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>

        {toast && <span className="text-sm text-green-700 ml-auto">{toast}</span>}
      </div>

      {/* Payroll table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No payroll entries for this period.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">LS #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Employee</th>
                    {EDITABLE_FIELDS.map((f) => (
                      <th key={f.key} className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">
                        {f.label}
                      </th>
                    ))}
                    <th className="text-left px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td className="px-4 py-2 text-gray-500 font-mono text-xs whitespace-nowrap">{r.lsNumber ?? '—'}</td>
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{r.employeeName}</td>
                      {EDITABLE_FIELDS.map((f) => (
                        <td key={f.key} className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            value={(r[f.key] as number | null) ?? ''}
                            onChange={(e) => updateRow(r.employeeId, f.key, e.target.value)}
                            className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.notes ?? ''}
                          onChange={(e) => updateRow(r.employeeId, 'notes', e.target.value)}
                          className="w-36 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Saving…' : 'Save payroll'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Annual summary */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Annual summary — {year}</h3>
        </div>
        {summary.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No payroll data for this year.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Month</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Gross</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Loans</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((s) => (
                  <tr key={s.month}>
                    <td className="px-4 py-2 text-gray-700">{monthName(s.month)}</td>
                    <td className="px-4 py-2 text-gray-900">{formatMoney(s.totalGross)}</td>
                    <td className="px-4 py-2 text-gray-900">{formatMoney(s.totalLoans)}</td>
                    <td className="px-4 py-2 text-gray-900">{formatMoney(s.totalPaid)}</td>
                    <td className="px-4 py-2 text-gray-900">{formatMoney(s.totalRemaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
