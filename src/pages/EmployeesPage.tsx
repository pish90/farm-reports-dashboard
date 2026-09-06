import { useEffect, useState } from 'react';
import {
  createEmployee, deactivateEmployee, deleteEmployee, deleteEmployeePayment,
  getEmployeeSummary, getMasterEmployeeRegistry, recordEmployeePayment, updateEmployee,
} from '../api/employees';
import { getDepartments } from '../api/farms';
import { getFarmSummaries } from '../api/reports';
import { useAuth } from '../auth/AuthContext';
import EmployeeLedgerSection from '../components/EmployeeLedgerSection';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import { formatDate, formatMoney } from '../lib/format';
import type {
  DepartmentDto, EmployeeDto, EmployeeSummaryDto, FarmSummaryDto, PageDto,
} from '../types';

const PAGE_SIZE = 10;

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const primaryBtn = 'px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors';
const secondaryBtn = 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors';
const dangerLink = 'text-red-600 hover:text-red-800 text-xs font-medium';
const dangerBtn = 'px-4 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors';

const salariedBadgeClass = 'bg-blue-100 text-blue-800 border border-blue-200';
const casualBadgeClass = 'bg-amber-100 text-amber-800 border border-amber-200';

function EmploymentTypeBadges({ isSalaried, isCasual }: { isSalaried: boolean; isCasual: boolean }) {
  return (
    <span className="inline-flex gap-1">
      {isSalaried && (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${salariedBadgeClass}`}>Salaried</span>
      )}
      {isCasual && (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${casualBadgeClass}`}>Casual</span>
      )}
    </span>
  );
}

function statusBadge(status: string): string {
  return status === 'ACTIVE'
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-gray-100 text-gray-600 border border-gray-200';
}

function PaymentsSection({ farmId, employeeId }: { farmId: number; employeeId: number }) {
  const [summary, setSummary] = useState<EmployeeSummaryDto | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  function load() {
    getEmployeeSummary(farmId, employeeId).then(setSummary).catch(() => setSummary(null));
  }

  useEffect(load, [farmId, employeeId]);

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentAmount) return;
    try {
      await recordEmployeePayment(farmId, employeeId, {
        paymentDate, amount: Number(paymentAmount), note: paymentNote || null,
      });
      setPaymentAmount('');
      setPaymentNote('');
      load();
    } catch {
      setError('Failed to record payment.');
    }
  }

  async function handleDeletePayment(paymentId: number) {
    if (!confirm('Delete this payment?')) return;
    try {
      await deleteEmployeePayment(farmId, employeeId, paymentId);
      load();
    } catch {
      setError('Failed to delete payment.');
    }
  }

  if (!summary) return null;

  return (
    <div className="pt-2 border-t border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Payments</h4>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">All-time earned</div>
          <div className="text-sm font-bold text-gray-900">{formatMoney(summary.allTimeEarned)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">All-time paid</div>
          <div className="text-sm font-bold text-gray-900">{formatMoney(summary.allTimePaid)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500">Outstanding</div>
          <div className="text-sm font-bold text-gray-900">{formatMoney(summary.outstanding)}</div>
        </div>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg mb-3">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Amount</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Note</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Paid by</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.payments.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400 text-xs">No payments recorded</td></tr>
            ) : summary.payments.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">{formatDate(p.paymentDate)}</td>
                <td className="px-3 py-2">{formatMoney(p.amount)}</td>
                <td className="px-3 py-2 text-gray-500">{p.note ?? ''}</td>
                <td className="px-3 py-2 text-gray-500">{p.paidBy ?? ''}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => handleDeletePayment(p.id)} className={dangerLink}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      <form onSubmit={handleRecordPayment} className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Date</label>
          <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Amount</label>
          <input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required className={inputClass} />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Note</label>
          <input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} className={inputClass} />
        </div>
        <div className="col-span-2">
          <button type="submit" className={secondaryBtn}>Record payment</button>
        </div>
      </form>
    </div>
  );
}

function EmployeeModal({
  farmId, employee, onClose, onSaved,
}: {
  farmId: number;
  employee: EmployeeDto | null;
  onClose: () => void;
  onSaved: (message?: string) => void;
}) {
  const isNew = !employee;
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [firstName, setFirstName] = useState(employee?.firstName ?? '');
  const [lastName, setLastName] = useState(employee?.lastName ?? '');
  const [phone, setPhone] = useState(employee?.phone ?? '');
  const [isSalaried, setIsSalaried] = useState(employee?.isSalaried ?? true);
  const [isCasual, setIsCasual] = useState(employee?.isCasual ?? false);
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? '');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState(employee?.startDate ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(employee?.dateOfBirth ?? '');
  const [nationalId, setNationalId] = useState(employee?.nationalId ?? '');
  const [gender, setGender] = useState(employee?.gender ?? '');
  const [defaultDailyRate, setDefaultDailyRate] = useState(employee?.defaultDailyRate?.toString() ?? '');
  const [status, setStatus] = useState(employee?.status ?? 'ACTIVE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDepartments(farmId).then(setDepartments).catch(() => setDepartments([]));
  }, [farmId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSalaried && !isCasual) {
      setError('Employee must be salaried, casual, or both.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        isSalaried,
        isCasual,
        jobTitle: jobTitle || null,
        departmentId: departmentId ? Number(departmentId) : null,
        startDate: startDate || null,
        dateOfBirth: dateOfBirth || null,
        nationalId: nationalId || null,
        gender: gender || null,
        defaultDailyRate: defaultDailyRate ? Number(defaultDailyRate) : null,
        photoBase64: null,
        photoMimeType: null,
        status,
      };
      if (isNew) await createEmployee(farmId, payload);
      else await updateEmployee(farmId, employee.id, payload);
      onSaved();
    } catch {
      setError('Failed to save employee.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!employee) return;
    if (!confirm(`Deactivate ${employee.fullName}? They'll be marked inactive but their history is kept.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deactivateEmployee(farmId, employee.id);
      onSaved('Employee deactivated');
    } catch {
      setError('Failed to deactivate employee.');
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    if (!confirm(`Permanently delete ${employee.fullName}? This cannot be undone.`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteEmployee(farmId, employee.id);
      onSaved('Employee deleted');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to delete employee.');
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Add employee' : employee.fullName} onClose={onClose} maxWidth="max-w-3xl">
      {employee?.lsNumber && <p className="text-xs text-gray-400 font-mono -mt-2">{employee.lsNumber}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Employment type</label>
            <div className="flex items-center gap-4 h-[2.125rem]">
              <label className="flex items-center gap-1.5 text-sm text-gray-700 font-normal">
                <input type="checkbox" checked={isSalaried} onChange={(e) => setIsSalaried(e.target.checked)} /> Salaried
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-700 font-normal">
                <input type="checkbox" checked={isCasual} onChange={(e) => setIsCasual(e.target.checked)} /> Casual
              </label>
            </div>
          </div>
          <div>
            <label className={labelClass}>Job title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Start date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date of birth</label>
            <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>National ID</label>
            <input value={nationalId} onChange={(e) => setNationalId(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Gender</label>
            <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Default daily rate</label>
            <input type="number" step="0.01" value={defaultDailyRate} onChange={(e) => setDefaultDailyRate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {!isNew && employee.status === 'ACTIVE' && (
              <button type="button" onClick={handleDeactivate} disabled={saving} className={dangerBtn}>
                Deactivate
              </button>
            )}
            {!isNew && (
              <button type="button" onClick={handleDelete} disabled={saving} className={dangerBtn}>
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtn}>
              {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>

      {employee && employee.isSalaried && (
        <EmployeeLedgerSection farmId={farmId} employeeId={employee.id} kind="salaried" title="Annual Ledger (Salaried)" />
      )}
      {employee && employee.isSalaried && (
        <PaymentsSection farmId={farmId} employeeId={employee.id} />
      )}
      {employee && employee.isCasual && (
        <EmployeeLedgerSection farmId={farmId} employeeId={employee.id} kind="casual" title="Annual Ledger (Casual)" />
      )}
      {employee && employee.isCasual && (
        <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
          Casual work sessions and payments are managed on the Casual Labour page, not here.
        </div>
      )}
    </Modal>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [farms, setFarms] = useState<FarmSummaryDto[]>([]);
  const [result, setResult] = useState<PageDto<EmployeeDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmFilter, setFarmFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<EmployeeDto | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) getFarmSummaries().then(setFarms).catch(() => null);
  }, [isAdmin]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function load() {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    getMasterEmployeeRegistry({
      farmId: farmFilter ? Number(farmFilter) : undefined,
      // Each filter option is exact (not "at least"), so both flags are sent explicitly
      // whenever a type filter is chosen — otherwise SALARIED would also match BOTH employees.
      isSalaried: typeFilter === 'SALARIED' ? true : typeFilter === 'CASUAL' ? false : typeFilter === 'BOTH' ? true : undefined,
      isCasual: typeFilter === 'CASUAL' ? true : typeFilter === 'SALARIED' ? false : typeFilter === 'BOTH' ? true : undefined,
      search: debouncedSearch || undefined,
      page,
      size: PAGE_SIZE,
    })
      .then(setResult)
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [isAdmin, farmFilter, typeFilter, debouncedSearch, page]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const employees = result?.content ?? [];

  function changePage(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAddEmployee() {
    if (!farmFilter) {
      setToast('Pick a farm filter first');
      return;
    }
    setEditing('new');
  }

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Admin access required to view the employee registry.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <select
          value={farmFilter}
          onChange={(e) => { setFarmFilter(e.target.value); setPage(0); }}
          className={selectClass}
        >
          <option value="">All Farms</option>
          {farms.map((f) => (
            <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="SALARIED">Salaried</option>
          <option value="CASUAL">Casual</option>
          <option value="BOTH">Salaried + Casual</option>
        </select>

        <input
          type="text"
          placeholder="Search name, LS number, job title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        />

        {result && <span className="text-xs text-gray-400">{result.totalElements} employees</span>}

        {toast && <span className="text-sm text-green-700">{toast}</span>}

        <div className="ml-auto flex gap-2">
          <button onClick={handleAddEmployee} className={primaryBtn}>Add employee</button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : employees.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">No employees found.</div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">LS Number</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Farm</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Job Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{e.lsNumber ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.fullName}</td>
                    <td className="px-4 py-3 text-gray-700">{e.farmName}</td>
                    <td className="px-4 py-3">
                      <EmploymentTypeBadges isSalaried={e.isSalaried} isCasual={e.isCasual} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">{e.jobTitle ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{e.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(e.status)}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(e)} className="text-green-700 hover:text-green-900 text-xs font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
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

      {editing && (
        <EmployeeModal
          farmId={editing === 'new' ? Number(farmFilter) : editing.farmId}
          employee={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => { setEditing(null); load(); setToast(message ?? 'Saved'); }}
        />
      )}
    </div>
  );
}
