import { Fragment } from 'react';
import type { LivestockRecordDto } from '../../types';

interface Props {
  livestock: LivestockRecordDto[] | null;
}

const CATEGORY_ORDER = ['CATTLE', 'PIGS', 'SHEEP'];

function toTitle(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function LivestockTab({ livestock }: Props) {
  if (!livestock || livestock.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 text-sm">
        No livestock records for this report.
      </div>
    );
  }

  // Group by category
  const grouped = new Map<string, LivestockRecordDto[]>();

  // Sort by defined order first, then alphabetically for unknown categories
  const categories = [
    ...CATEGORY_ORDER.filter((c) => livestock.some((l) => l.category === c)),
    ...livestock
      .map((l) => l.category)
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .filter((c, i, arr) => arr.indexOf(c) === i),
  ];

  for (const cat of categories) {
    grouped.set(
      cat,
      livestock.filter((l) => l.category === cat).sort((a, b) => a.type.localeCompare(b.type))
    );
  }

  const grandTotal = livestock.reduce((s, l) => s + l.count, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-green-800 text-white">
            <th className="px-4 py-2 text-left font-medium">Category</th>
            <th className="px-4 py-2 text-left font-medium">Type</th>
            <th className="px-4 py-2 text-right font-medium">Count</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((cat) => {
            const rows = grouped.get(cat)!;
            const catTotal = rows.reduce((s, r) => s + r.count, 0);
            return (
              <Fragment key={cat}>
                {rows.map((lr, idx) => (
                  <tr key={lr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">
                      {idx === 0 ? toTitle(cat) : ''}
                    </td>
                    <td className="px-4 py-2 text-gray-800">{lr.type}</td>
                    <td className="px-4 py-2 text-right text-gray-900">{lr.count}</td>
                  </tr>
                ))}
                <tr key={`subtotal-${cat}`} className="bg-green-50 font-semibold">
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 text-green-800">{toTitle(cat)} Total</td>
                  <td className="px-4 py-2 text-right text-green-900">{catTotal}</td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-bold text-gray-800">
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2">GRAND TOTAL</td>
            <td className="px-4 py-2 text-right">{grandTotal}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
