import type { ExpenseRecordDto } from '../../types';

interface Props {
  expenses: ExpenseRecordDto[] | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

export default function ExpensesTab({ expenses }: Props) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No expense records for this report.
      </div>
    );
  }

  const sorted = [...expenses].sort((a, b) => a.entryNo - b.entryNo);
  const total = sorted.reduce((s, e) => s + (Number(e.cost) ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="px-4 py-2 text-left font-medium">No.</th>
            <th className="px-4 py-2 text-left font-medium">Date</th>
            <th className="px-4 py-2 text-left font-medium">Supplier / Contractor</th>
            <th className="px-4 py-2 text-left font-medium">Ref No</th>
            <th className="px-4 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-gray-500">{e.entryNo}</td>
              <td className="px-4 py-2 text-gray-700">{formatDate(e.date)}</td>
              <td className="px-4 py-2 text-gray-800">{e.supplierContractor ?? '—'}</td>
              <td className="px-4 py-2 text-gray-700">{e.receiptNo ?? '—'}</td>
              <td className="px-4 py-2 text-right text-gray-900 font-medium">
                {Number(e.cost).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold text-gray-800">
            <td className="px-4 py-2" colSpan={3}></td>
            <td className="px-4 py-2 text-right">TOTAL</td>
            <td className="px-4 py-2 text-right">{total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
