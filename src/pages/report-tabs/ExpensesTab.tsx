import { useEffect, useState } from 'react';
import Pagination from '../../components/Pagination';
import { formatMoney } from '../../lib/format';
import type { ExpenseRecordDto } from '../../types';

interface Props {
  expenses: ExpenseRecordDto[] | null;
}

const PAGE_SIZE = 10;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export default function ExpensesTab({ expenses }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [search]);

  if (!expenses || expenses.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No expense records for this report.
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => a.entryNo - b.entryNo);
  const total = sorted.reduce((s, e) => s + (Number(e.cost) ?? 0), 0);

  const filtered = search.trim()
    ? sorted.filter((e) => {
        const q = search.trim().toLowerCase();
        return (e.supplierContractor ?? '').toLowerCase().includes(q)
          || (e.description ?? '').toLowerCase().includes(q)
          || (e.receiptNo ?? '').toLowerCase().includes(q);
      })
    : sorted;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const showPagination = sorted.length > PAGE_SIZE;

  return (
    <div className="space-y-3">
      {showPagination && (
        <input
          type="text"
          placeholder="Search supplier, product/service, ref no…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />
      )}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400 text-sm">No expenses match your search.</div>
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="px-4 py-2 text-left font-medium">No.</th>
            <th className="px-4 py-2 text-left font-medium">Date</th>
            <th className="px-4 py-2 text-left font-medium">Supplier / Contractor</th>
            <th className="px-4 py-2 text-left font-medium">Ref No</th>
            <th className="px-4 py-2 text-left font-medium">Product / Service</th>
            <th className="px-4 py-2 text-left font-medium">Category</th>
            <th className="px-4 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {visible.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-500">{e.entryNo}</td>
              <td className="px-4 py-2 text-gray-700">{formatDate(e.date)}</td>
              <td className="px-4 py-2 text-gray-800">{e.supplierContractor ?? '—'}</td>
              <td className="px-4 py-2 text-gray-700">{e.receiptNo ?? '—'}</td>
              <td className="px-4 py-2 text-gray-700">{e.description ?? '—'}</td>
              <td className="px-4 py-2 text-gray-700">{e.categoryName ?? '—'}</td>
              <td className="px-4 py-2 text-right text-gray-900 font-medium">
                {formatMoney(Number(e.cost))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold text-gray-800">
            <td className="px-4 py-2" colSpan={5}></td>
            <td className="px-4 py-2 text-right">TOTAL</td>
            <td className="px-4 py-2 text-right">{formatMoney(total)}</td>
          </tr>
        </tfoot>
      </table>
      </div>
      )}
      {showPagination && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalPages={totalPages}
          totalElements={filtered.length}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
