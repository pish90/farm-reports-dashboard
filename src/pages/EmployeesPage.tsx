import { useEffect, useMemo, useState } from 'react';
import {
  getMasterEmployeeRegistry, importEmployeePay, importEmployees, importLivestock, importMilk,
} from '../api/employees';
import { useAuth } from '../auth/AuthContext';
import type { EmployeeCsvImportResult, EmployeeDto, ImportResult } from '../types';

type ImportKind = 'employees' | 'livestock' | 'milk' | 'employeePay';
type YearMode = 'none' | 'single' | 'startYearMonth';

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TABS: { key: ImportKind; label: string; accept: string; yearMode: YearMode }[] = [
  { key: 'employees', label: 'Employees', accept: '.csv,.xlsx', yearMode: 'none' },
  { key: 'livestock', label: 'Livestock', accept: '.xlsx', yearMode: 'single' },
  { key: 'milk', label: 'Milk Production', accept: '.xlsx', yearMode: 'single' },
  { key: 'employeePay', label: 'Employee Pay', accept: '.xlsx', yearMode: 'startYearMonth' },
];

function employmentTypeBadge(type: string): string {
  return type === 'SALARIED'
    ? 'bg-blue-100 text-blue-800 border border-blue-200'
    : 'bg-amber-100 text-amber-800 border border-amber-200';
}

function statusBadge(status: string): string {
  return status === 'ACTIVE'
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-gray-100 text-gray-600 border border-gray-200';
}

function ImportResultBanner({ result }: { result: ImportResult | EmployeeCsvImportResult }) {
  if (result.success) {
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        Imported {result.importedCount} of {result.totalRows} row(s) successfully.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
        Nothing was imported — {result.errors.length} of {result.totalRows} row(s) had errors. Fix
        them in the file and re-upload.
      </div>
      <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">Row</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Summary</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.errors.map((e, idx) => (
              <tr key={idx}>
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{e.row}</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{e.rowSummary}</td>
                <td className="px-3 py-2 text-red-700">{e.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ImportModal({ onClose, onEmployeesImported }: { onClose: () => void; onEmployeesImported: () => void }) {
  const [tab, setTab] = useState<ImportKind>('employees');
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(currentYear);
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | EmployeeCsvImportResult | null>(null);

  const activeTab = TABS.find((t) => t.key === tab)!;

  function switchTab(key: ImportKind) {
    setTab(key);
    setFile(null);
    setResult(null);
    setError(null);
  }

  async function submit() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let res: ImportResult | EmployeeCsvImportResult;
      if (tab === 'employees') {
        res = await importEmployees(file);
        if (res.success) onEmployeesImported();
      } else if (tab === 'livestock') {
        res = await importLivestock(file, year);
      } else if (tab === 'milk') {
        res = await importMilk(file, year);
      } else {
        res = await importEmployeePay(file, startYear, startMonth);
      }
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Import failed. Please check the file and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Bulk Import</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 flex gap-1 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-green-700 text-green-800'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-500">
            {tab === 'employees' &&
              'Upload the employee_import_template (.csv or .xlsx). Columns: farmName, firstName, lastName, employmentType, phone, NationalID, Gender, DateofBirth, startDate, jobTitle.'}
            {tab === 'livestock' &&
              'Upload the livestock_import_template (.xlsx). The file has no year column, so pick the year these figures belong to.'}
            {tab === 'milk' &&
              'Upload the Milk_import_template (.xlsx). The file has no year column, so pick the year these figures belong to.'}
            {tab === 'employeePay' &&
              'Upload the Employee pay_import sheet (.xlsx) — one row per month, Earned/Paid per employee (by LS number). The file has no year column and month labels repeat, so pick the year and month the FIRST row represents; later rows are assumed to follow in sequence.'}
          </p>

          {activeTab.yearMode === 'single' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab.yearMode === 'startYearMonth' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">First row is</label>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx + 1} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}

          <input
            type="file"
            accept={activeTab.accept}
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-green-700 file:text-white file:text-sm hover:file:bg-green-800 file:cursor-pointer"
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
          )}
          {result && <ImportResultBanner result={result} />}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={submit}
            disabled={!file || busy}
            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors"
          >
            {busy ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmFilter, setFarmFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getMasterEmployeeRegistry()
      .then(setEmployees)
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const farms = useMemo(() => {
    const map = new Map<number, string>();
    employees.forEach((e) => map.set(e.farmId, e.farmName));
    return Array.from(map.entries()).map(([farmId, farmName]) => ({ farmId, farmName }));
  }, [employees]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (farmFilter && String(e.farmId) !== farmFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${e.fullName} ${e.lsNumber ?? ''} ${e.employeeId ?? ''} ${e.jobTitle ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [employees, farmFilter, search]);

  const selectClass =
    'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Admin access required to view the employee registry.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <select value={farmFilter} onChange={(e) => setFarmFilter(e.target.value)} className={selectClass}>
          <option value="">All Farms</option>
          {farms.map((f) => (
            <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search name, LS number, job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />

        <span className="text-xs text-gray-400">{filtered.length} of {employees.length} employees</span>

        <button
          onClick={() => setShowImport(true)}
          className="ml-auto px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors"
        >
          Import…
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">LS Number</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Farm</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{e.lsNumber ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.fullName}</td>
                    <td className="px-4 py-3 text-gray-700">{e.farmName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${employmentTypeBadge(e.employmentType)}`}>
                        {e.employmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onEmployeesImported={load} />
      )}
    </div>
  );
}
