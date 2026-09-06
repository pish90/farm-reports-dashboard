import { useState } from 'react';
import {
  downloadImportTemplate, importEmployeePay, importEmployees, importExpenses, importLivestock, importMilk,
} from '../api/employees';
import type { EmployeeCsvImportResult, ImportResult } from '../types';

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500';

type ImportKind = 'employees' | 'livestock' | 'milk' | 'employeePay' | 'expenses';
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
  { key: 'expenses', label: 'Expenses', accept: '.csv,.xlsx', yearMode: 'none' },
];

function ImportResultBanner({ result }: { result: ImportResult | EmployeeCsvImportResult }) {
  if (result.success) {
    const mergedCount = 'mergedCount' in result ? result.mergedCount : 0;
    return (
      <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        Imported {result.importedCount} of {result.totalRows} row(s) successfully.
        {mergedCount > 0 && ` Updated ${mergedCount} existing employee(s) — filled in any blank fields and merged a new employment type where the row had one.`}
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

export default function BulkImportPage() {
  const [tab, setTab] = useState<ImportKind>('employees');
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(currentYear);
  const [startYear, setStartYear] = useState(currentYear);
  const [startMonth, setStartMonth] = useState(1);
  const [busy, setBusy] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | EmployeeCsvImportResult | null>(null);

  const activeTab = TABS.find((t) => t.key === tab)!;

  function switchTab(key: ImportKind) {
    setTab(key);
    setFile(null);
    setResult(null);
    setError(null);
  }

  async function handleDownloadTemplate() {
    setTemplateBusy(true);
    setError(null);
    try {
      await downloadImportTemplate(tab);
    } catch {
      setError('Could not download the template. Please try again.');
    } finally {
      setTemplateBusy(false);
    }
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
      } else if (tab === 'livestock') {
        res = await importLivestock(file, year);
      } else if (tab === 'milk') {
        res = await importMilk(file, year);
      } else if (tab === 'employeePay') {
        res = await importEmployeePay(file, startYear, startMonth);
      } else {
        res = await importExpenses(file);
      }
      setResult(res);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Import failed. Please check the file and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-3xl">
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

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-gray-500">
            {tab === 'employees' &&
              'Upload the employee_import_template (.csv or .xlsx). Columns: farmName, firstName, lastName, employmentType (SALARIED, CASUAL, or BOTH), phone, NationalID, Gender, DateofBirth, startDate, jobTitle. A row matching an existing employee (by farm + name) never errors — it fills in any of that employee\'s fields that are currently blank (e.g. to restore phone/DOB lost in a data cleanup) and merges in a new employment type if the row has one. It never overwrites a field that already has a value.'}
            {tab === 'livestock' &&
              'Upload the livestock_import_template (.xlsx). The file has no year column, so pick the year these figures belong to.'}
            {tab === 'milk' &&
              'Upload the Milk_import_template (.xlsx). The file has no year column, so pick the year these figures belong to.'}
            {tab === 'employeePay' &&
              'Upload the Employee pay_import sheet (.xlsx) — one row per month, Earned/Paid per employee (by LS number). The file has no year column and month labels repeat, so pick the year and month the FIRST row represents; later rows are assumed to follow in sequence.'}
            {tab === 'expenses' &&
              'Upload the expenses_import_template (.csv or .xlsx). Columns: farm, date, ID, supplier, product/service, category, amount. Each row is added as a new expense on the report for that farm/month — nothing already recorded is touched. ID is your own receipt/voucher number and must be unique per farm; re-uploading a row with an ID already on file is rejected rather than creating a duplicate. An unrecognized category is imported blank rather than erroring.'}
          </p>
          <button
            onClick={handleDownloadTemplate}
            disabled={templateBusy}
            className="shrink-0 text-xs font-medium text-green-700 hover:text-green-900 disabled:opacity-40 whitespace-nowrap"
          >
            {templateBusy ? 'Downloading…' : 'Download example template ↓'}
          </button>
        </div>

        {activeTab.yearMode === 'single' && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Year</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
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
              <select value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))} className={selectClass}>
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
            <select value={startYear} onChange={(e) => setStartYear(Number(e.target.value))} className={selectClass}>
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
          onClick={submit}
          disabled={!file || busy}
          className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors"
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
    </div>
  );
}
