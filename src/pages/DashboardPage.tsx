import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFarmEmployees, getMasterEmployeeRegistry } from '../api/employees';
import { getFarmSummaries, getLiveStatus } from '../api/reports';
import { useAuth } from '../auth/AuthContext';
import EmployeeLedgerSection from '../components/EmployeeLedgerSection';
import StatusBadge from '../components/StatusBadge';
import { formatMoney } from '../lib/format';
import type { EmployeeDto, FarmLiveStatusDto, FarmSummaryDto } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function FarmCard({
  farm, employeeCount,
}: {
  farm: FarmSummaryDto;
  employeeCount?: { active: number; total: number };
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{farm.farmName}</h3>
          <p className="text-xs text-gray-400 mt-0.5">Farm ID #{farm.farmId}</p>
        </div>
        <span className="text-2xl">🌾</span>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-3">
          <dt className="text-xs text-green-700 font-medium">Milk This Month</dt>
          <dd className="text-lg font-bold text-green-900 mt-0.5">
            {farm.totalMilkThisMonth.toFixed(1)} L
          </dd>
        </div>
        <div className="bg-amber-50 rounded-lg p-3">
          <dt className="text-xs text-amber-700 font-medium">Expenses This Month</dt>
          <dd className="text-lg font-bold text-amber-900 mt-0.5">
            {formatMoney(farm.totalExpensesThisMonth)}
          </dd>
        </div>
        <div className="col-span-2 bg-gray-50 rounded-lg p-3">
          <dt className="text-xs text-gray-500 font-medium">Reports This Year</dt>
          <dd className="text-base font-semibold text-gray-800 mt-0.5">
            {farm.reportsThisYear} report{farm.reportsThisYear !== 1 ? 's' : ''}
          </dd>
        </div>
        {employeeCount && (
          <div className="col-span-2">
            <dt className="text-xs text-gray-400">Employees</dt>
            <dd className="text-sm text-gray-700 mt-0.5">
              <strong>{employeeCount.active}</strong> active of {employeeCount.total}
            </dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-xs text-gray-400">Last Submitted</dt>
          <dd className="text-sm text-gray-700 mt-0.5">{formatDate(farm.lastSubmittedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-6 py-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function LiveStatusTable({ rows }: { rows: FarmLiveStatusDto[] }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">
          Live status — {MONTH_NAMES[rows[0]?.month - 1] ?? ''} {rows[0]?.year ?? ''}
        </h3>
      </div>
      {rows.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No farms found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Farm</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Report</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Active workers</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Attendance days</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Livestock</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Milk</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Expense rows</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Expense total</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((f) => (
                <tr key={f.farmId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{f.farmName}</td>
                  <td className="px-4 py-3"><StatusBadge status={f.reportStatus} /></td>
                  <td className="px-4 py-3 text-gray-700">{f.activeWorkers}</td>
                  <td className="px-4 py-3 text-gray-700">{f.attendanceDaysRecorded}</td>
                  <td className="px-4 py-3 text-gray-700">{f.livestockEntered ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{f.milkTotalLitres.toFixed(1)} L</td>
                  <td className="px-4 py-3 text-gray-700">{f.expenseCount}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatMoney(f.expenseTotal)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {f.reportId ? (
                      <button
                        onClick={() => navigate(`/reports/${f.reportId}`)}
                        className="text-green-700 hover:text-green-900 text-xs font-medium"
                      >
                        Open
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmployeeLedgerLookup({
  farms, employees, isAdmin, fixedFarmId,
}: {
  farms: FarmSummaryDto[];
  employees: EmployeeDto[];
  isAdmin: boolean;
  fixedFarmId: number | null;
}) {
  const [farmId, setFarmId] = useState<number | null>(isAdmin ? null : fixedFarmId);
  const [employeeId, setEmployeeId] = useState<number | null>(null);

  const salariedOptions = employees.filter(
    (e) => e.employmentType === 'SALARIED' && (!isAdmin || e.farmId === farmId),
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Employee Ledger</h3>
      <div className="flex flex-wrap gap-3 items-center mb-4">
        {isAdmin && (
          <select
            value={farmId ?? ''}
            onChange={(e) => {
              setFarmId(e.target.value ? Number(e.target.value) : null);
              setEmployeeId(null);
            }}
            className={selectClass}
          >
            <option value="">Select farm…</option>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
        )}
        <select
          value={employeeId ?? ''}
          onChange={(e) => setEmployeeId(e.target.value ? Number(e.target.value) : null)}
          disabled={isAdmin && !farmId}
          className={selectClass}
        >
          <option value="">Select employee…</option>
          {salariedOptions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}{e.lsNumber ? ` (${e.lsNumber})` : ''}
            </option>
          ))}
        </select>
      </div>
      {farmId && employeeId ? (
        <EmployeeLedgerSection farmId={farmId} employeeId={employeeId} bordered={false} />
      ) : (
        <p className="text-xs text-gray-400">
          {isAdmin
            ? 'Pick a farm and a salaried employee to view their annual ledger.'
            : 'Pick a salaried employee to view their annual ledger.'}
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [liveStatus, setLiveStatus] = useState<FarmLiveStatusDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const employeesRequest: Promise<EmployeeDto[]> = isAdmin
      ? getMasterEmployeeRegistry()
      : user?.farmId
      ? getFarmEmployees(user.farmId)
      : Promise.resolve([]);

    Promise.all([
      getFarmSummaries(),
      getLiveStatus(now.getFullYear(), now.getMonth() + 1),
      employeesRequest.catch(() => []),
    ])
      .then(([farmData, liveStatusData, employeeData]) => {
        setFarms(farmData);
        setLiveStatus(liveStatusData);
        setEmployees(employeeData);
      })
      .catch(() => setError('Failed to load farm data.'))
      .finally(() => setLoading(false));
  }, [isAdmin, user?.farmId]);

  const totalMilk = farms.reduce((sum, f) => sum + f.totalMilkThisMonth, 0);
  const totalExpenses = farms.reduce((sum, f) => sum + f.totalExpensesThisMonth, 0);

  const employeesByFarm = useMemo(() => {
    const map = new Map<number, { active: number; total: number }>();
    employees.forEach((e) => {
      const bucket = map.get(e.farmId) ?? { active: 0, total: 0 };
      bucket.total += 1;
      if (e.status === 'ACTIVE') bucket.active += 1;
      map.set(e.farmId, bucket);
    });
    return map;
  }, [employees]);

  const totalActiveEmployees = employees.filter((e) => e.status === 'ACTIVE').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  const now = new Date();
  const monthName = MONTH_NAMES[now.getMonth()];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Overview for {monthName} {now.getFullYear()}</p>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label={`Total Milk This Month (all farms)`}
          value={`${totalMilk.toFixed(1)} L`}
        />
        <StatCard
          label={`Total Expenses This Month (all farms)`}
          value={formatMoney(totalExpenses)}
        />
        {employees.length > 0 && (
          <StatCard
            label="Employees"
            value={String(totalActiveEmployees)}
            sub={`active of ${employees.length} total`}
          />
        )}
      </div>

      {/* Farm cards */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Farms ({farms.length})
        </h2>
        {farms.length === 0 ? (
          <p className="text-gray-400 text-sm">No farms found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {farms.map((farm) => (
              <FarmCard key={farm.farmId} farm={farm} employeeCount={employeesByFarm.get(farm.farmId)} />
            ))}
          </div>
        )}
      </div>

      {/* Live status */}
      <LiveStatusTable rows={liveStatus} />

      {/* Employee ledger lookup */}
      {employees.length > 0 && (
        <EmployeeLedgerLookup
          farms={farms}
          employees={employees}
          isAdmin={isAdmin}
          fixedFarmId={user?.farmId ?? null}
        />
      )}
    </div>
  );
}
