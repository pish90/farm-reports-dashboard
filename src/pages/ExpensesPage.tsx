import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteExpense, getExpenseCategories, getFarmSummaries, listExpenses, updateExpense } from '../api/reports';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { formatMoney } from '../lib/format';
import { useAuth } from '../auth/AuthContext';
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
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const primaryBtn = 'px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors';
const secondaryBtn = 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors';

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

interface EditExpenseModalProps {
  expense: ExpenseListItemDto;
  categories: ExpenseCategoryDto[];
  onClose: () => void;
  onSaved: () => void;
}

function EditExpenseModal({ expense, categories, onClose, onSaved }: EditExpenseModalProps) {
  const [date, setDate] = useState(expense.date);
  const [supplier, setSupplier] = useState(expense.supplierContractor ?? '');
  const [receiptNo, setReceiptNo] = useState(expense.receiptNo ?? '');
  const [cost, setCost] = useState(String(expense.cost));
  const [description, setDescription] = useState(expense.description ?? '');
  const [categoryId, setCategoryId] = useState<string>(
    categories.find((c) => c.accountName === expense.categoryName)?.id.toString() ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateExpense(expense.id, {
        date,
        supplierContractor: supplier.trim() || null,
        receiptNo: receiptNo.trim() || null,
        cost: Number(cost) || 0,
        description: description.trim() || null,
        categoryId: categoryId ? Number(categoryId) : null,
      });
      onSaved();
    } catch {
      setError('Failed to save changes. Please try again.');
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit Expense · ${expense.farmName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input
            type="number" step="0.01" min="0" value={cost}
            onChange={(e) => setCost(e.target.value)} className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ref No</label>
          <input value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.accountName}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Supplier</label>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Product / Service</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} disabled={saving} className={secondaryBtn}>Cancel</button>
        <button onClick={handleSave} disabled={saving} className={primaryBtn}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </Modal>
  );
}

export default function ExpensesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryDto[]>([]);
  const [result, setResult] = useState<PageDto<ExpenseListItemDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItemDto | null>(null);

  const [farmFilter, setFarmFilter] = useState<string>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    getFarmSummaries().catch(() => null).then((data) => { if (data) setFarms(data); });
    getExpenseCategories().catch(() => null).then((data) => { if (data) setCategories(data); });
  }, []);

  function loadExpenses() {
    setLoading(true);
    setError(null);
    const params: Parameters<typeof listExpenses>[0] = { page, size: PAGE_SIZE };
    if (farmFilter) params.farmId = Number(farmFilter);
    if (yearFilter) params.year = Number(yearFilter);
    if (monthFilter) params.month = Number(monthFilter);
    if (categoryFilter) params.categoryId = Number(categoryFilter);

    return listExpenses(params)
      .then(setResult)
      .catch(() => setError('Failed to load expenses.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmFilter, yearFilter, monthFilter, categoryFilter, page]);

  async function handleDelete(expense: ExpenseListItemDto) {
    const label = expense.description || expense.supplierContractor || `#${expense.id}`;
    if (!confirm(`Permanently delete this expense (${label}, ${formatMoney(Number(expense.cost))})? This cannot be undone.`)) return;
    setDeletingId(expense.id);
    try {
      await deleteExpense(expense.id);
      await loadExpenses();
    } catch {
      setError('Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  }

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
                  <th className="px-4 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.farmName}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.receiptNo ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.supplierContractor ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{e.categoryName ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatMoney(Number(e.cost))}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/reports/${e.reportId}`)}
                        className="text-sm text-green-700 hover:text-green-900 font-medium"
                      >
                        View report
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => setEditingExpense(e)}
                            className="ml-3 text-sm text-gray-600 hover:text-gray-900 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(e)}
                            disabled={deletingId === e.id}
                            className="ml-3 text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            {deletingId === e.id ? 'Deleting…' : 'Delete'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-semibold text-gray-800 border-t border-gray-200">
                  <td className="px-4 py-3" colSpan={6}>Total (this page)</td>
                  <td className="px-4 py-3 text-right">{formatMoney(total)}</td>
                  <td className="px-4 py-3" />
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

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => setEditingExpense(null)}
          onSaved={() => { setEditingExpense(null); loadExpenses(); }}
        />
      )}
    </div>
  );
}
