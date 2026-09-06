import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExpenseCategories, getFarmSummaries, listExpenses } from '../api/reports';
import Pagination from '../components/Pagination';
import { formatMoney } from '../lib/format';
import type { ExpenseCategoryDto, ExpenseListItemDto, FarmSummaryDto, PageDto } from '../types';

const PAGE_SIZE = 10;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export default function ExpensesPage() {
  const navigate = useNavigate();

  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [result, setResult] = useState<PageDto<ExpenseListItemDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [farmFilter, setFarmFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    getFarmSummaries().catch(() => null).then((data) => { if (data) setFarms(data); });
    getExpenseCategories().catch(() => null).then((data) => { if (data) setCategories(data); });
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof listExpenses>[0] = { page, size: PAGE_SIZE };
    if (farmFilter) params.farmId = Number(farmFilter);
    if (yearFilter) params.year = Number(yearFilter);
    if (monthFilter) params.month = Number(monthFilter);
    if (categoryFilter) params.categoryId = Number(categoryFilter);

    listExpenses(params)
      .then(setResult)
      .catch(() => setError('Failed to load expenses.'))
      .finally(() => setLoading(false));
  }, [farmFilter, yearFilter, monthFilter, categoryFilter, page]);

  function updateFilter(setter: (v: string) => void) {
    return (v: string) => { setter(v); setPage(0); };
  }

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const expenses = result?.content ?? [];
  const total = expenses.reduce((s, e) => s + Number(e.cost), 0);

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <select value={farmFilter} onChange={(e) => updateFilter(setFarmFilter)(e.target.value)} className={selectClass}>
          <option value="">All Farms</option>
          {farms.map((f) => (
            <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
          ))}
        </select>

        <select value={yearFilter} onChange={(e) => updateFilter(setYearFilter)(e.target.value)} className={selectClass}>
          <option value="">All Years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select value={monthFilter} onChange={(e) => updateFilter(setMonthFilter)(e.target.value)} className={selectClass}>
          <option value="">All Months</option>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx + 1} value={idx + 1}>{name}</option>
          ))}
        </select>

        <select value={categoryFilter} onChange={(e) => updateFilter(setCategoryFilter)(e.target.value)} className={selectClass}>
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.accountName}</option>
          ))}
        </select>

        {(farmFilter || yearFilter || monthFilter || categoryFilter) && (
          <button
            onClick={() => { setFarmFilter(''); setYearFilter(''); setMonthFilter(''); setCategoryFilter(''); setPage(0); }}
            className="text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Clear filters
          </button>
        )}

        {result && <span className="ml-auto text-xs text-gray-400">{result.totalElements} expenses</span>}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : expenses.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No expenses found.</div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Farm</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Ref No</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Supplier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Product / Service</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => navigate(`/reports/${e.reportId}`)}
                    className="hover:bg-green-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.farmName}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.receiptNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.supplierContractor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.categoryName ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatMoney(Number(e.cost))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-800 border-t border-gray-200">
                  <td className="px-4 py-3" colSpan={6}>Total (this page)</td>
                  <td className="px-4 py-3 text-right">{formatMoney(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {result && (
            <Pagination
              page={result.page}
              pageSize={PAGE_SIZE}
              totalPages={result.totalPages}
              totalElements={result.totalElements}
              onPrev={() => changePage(page - 1)}
              onNext={() => changePage(page + 1)}
            />
          )}
          </>
        )}
      </div>
    </div>
  );
}
