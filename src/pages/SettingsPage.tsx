import { useEffect, useState } from 'react';
import { addDepartment, deleteDepartment, getDepartments, getLivestockTypes } from '../api/farms';
import { useFarmScope } from '../auth/useFarmScope';
import type { DepartmentDto, LivestockTypeDto } from '../types';

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';
const inputClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 flex-1';
const primaryBtn = 'px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors';
const dangerLink = 'text-red-600 hover:text-red-800 text-xs font-medium';

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function SettingsPage() {
  const { farms, farmId, setFarmId, multiFarm } = useFarmScope();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!farmId) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Your role has no farm assigned.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {multiFarm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
          <select value={farmId} onChange={(e) => setFarmId(Number(e.target.value))} className={selectClass}>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
          {toast && <span className="text-sm text-green-700 ml-auto">{toast}</span>}
        </div>
      )}
      {!multiFarm && toast && (
        <div className="text-sm text-green-700">{toast}</div>
      )}

      <DepartmentsCard farmId={farmId} showToast={setToast} />
      <LivestockTypesCard farmId={farmId} />
    </div>
  );
}

function DepartmentsCard({ farmId, showToast }: { farmId: number; showToast: (m: string) => void }) {
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getDepartments(farmId)
      .then(setDepartments)
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [farmId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addDepartment(farmId, newName.trim());
      setNewName('');
      showToast('Department added');
      load();
    } catch {
      showToast('Failed to add department.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this department?')) return;
    try {
      await deleteDepartment(farmId, id);
      showToast('Department deleted');
      load();
    } catch {
      showToast('Failed to delete department.');
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Departments</h3>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {departments.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400 text-sm">No departments configured.</td></tr>
                ) : departments.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(d.id)} className={dangerLink}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form onSubmit={handleAdd} className="px-4 py-3 border-t border-gray-200 flex gap-2">
            <input
              type="text"
              placeholder="New department name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className={inputClass}
            />
            <button type="submit" disabled={adding} className={primaryBtn}>
              {adding ? 'Adding…' : 'Add'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function LivestockTypesCard({ farmId }: { farmId: number }) {
  const [byCategory, setByCategory] = useState<Record<string, LivestockTypeDto[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getLivestockTypes(farmId)
      .then(setByCategory)
      .catch(() => setError('Failed to load livestock types.'))
      .finally(() => setLoading(false));
  }, [farmId]);

  const rows = Object.entries(byCategory).flatMap(([category, types]) =>
    types.map((t) => ({ category, type: t.type, id: t.id })),
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Livestock types</h3>
        <p className="text-xs text-gray-400 mt-0.5">Read-only — adding a new category or type requires a database migration.</p>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      ) : rows.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No livestock types configured.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-gray-700">{r.category}</td>
                  <td className="px-4 py-3 text-gray-900">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
