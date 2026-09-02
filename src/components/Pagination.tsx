export default function Pagination({
  page, pageSize, totalPages, totalElements, onPrev, onNext,
}: {
  page: number; pageSize: number; totalPages: number; totalElements: number;
  onPrev: () => void; onNext: () => void;
}) {
  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, totalElements);
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 text-sm text-gray-600">
      <span>
        {totalElements === 0 ? '0 results' : `${from}–${to} of ${totalElements}`}
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          ← Prev
        </button>
        <span className="px-3 py-1.5 text-gray-500">
          Page {page + 1} / {Math.max(1, totalPages)}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
