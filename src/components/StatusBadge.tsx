export default function StatusBadge({ status }: { status: string }) {
  const classes =
    status === 'NOT_STARTED'
      ? 'bg-gray-100 text-gray-500 border border-gray-300'
      : 'bg-green-100 text-green-800 border border-green-300';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}
    >
      {status === 'NOT_STARTED' ? 'Not started' : 'Recording'}
    </span>
  );
}
