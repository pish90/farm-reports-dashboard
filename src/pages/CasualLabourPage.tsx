import { useEffect, useState } from 'react';
import {
  addCasualLabourer, createWorkSession, deactivateCasualLabourer, deleteCasualPayment,
  deleteWorkSession, downloadCasualExport, getCasualLabourerSummary, getCasualLabourers,
  getMonthlyCasualPayroll, getWorkSessions, recordCasualPayment, updateCasualLabourer, updateWorkSession,
} from '../api/casual';
import { getDepartments } from '../api/farms';
import { useFarmScope } from '../auth/useFarmScope';
import Modal from '../components/Modal';
import { formatDate, formatMoney, MONTH_NAMES } from '../lib/format';
import type {
  CasualLabourerDto, CasualLabourerSummaryDto, CasualPayrollEntryDto, CasualWorkSessionDto, DepartmentDto,
} from '../types';

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const primaryBtn = 'px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors';
const secondaryBtn = 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors';
const dangerLink = 'text-red-600 hover:text-red-800 text-xs font-medium';

const TABS = [
  { key: 'labourers', label: 'Labourers' },
  { key: 'sessions', label: 'Work sessions' },
  { key: 'monthly', label: 'Monthly payroll' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-green-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function CasualLabourPage() {
  const { farms, farmId, setFarmId, multiFarm } = useFarmScope();
  const [tab, setTab] = useState<TabKey>('labourers');
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
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        {multiFarm && (
          <select value={farmId} onChange={(e) => setFarmId(Number(e.target.value))} className={selectClass}>
            {farms.map((f) => (
              <option key={f.farmId} value={f.farmId}>{f.farmName}</option>
            ))}
          </select>
        )}
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                tab === t.key ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {toast && <span className="text-sm text-green-700 ml-auto">{toast}</span>}
      </div>

      {tab === 'labourers' && <LabourersTab farmId={farmId} showToast={setToast} />}
      {tab === 'sessions' && <SessionsTab farmId={farmId} showToast={setToast} />}
      {tab === 'monthly' && <MonthlyTab farmId={farmId} showToast={setToast} />}
    </div>
  );
}

// ── Labourers ────────────────────────────────────────────────────────────

function LabourersTab({ farmId, showToast }: { farmId: number; showToast: (m: string) => void }) {
  const [labourers, setLabourers] = useState<CasualLabourerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CasualLabourerDto | 'new' | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getCasualLabourers(farmId)
      .then(setLabourers)
      .catch(() => setError('Failed to load labourers.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [farmId]);

  async function handleDeactivate(id: number) {
    if (!confirm('Deactivate this labourer?')) return;
    try {
      await deactivateCasualLabourer(farmId, id);
      showToast('Labourer deactivated');
      load();
    } catch {
      showToast('Failed to deactivate labourer.');
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Active casual labourers</h3>
        <button onClick={() => setEditing('new')} className={primaryBtn}>Add labourer</button>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      ) : labourers.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No active casual labourers.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">LS #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Job title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {labourers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{l.lsNumber ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{l.name}</td>
                  <td className="px-4 py-3 text-gray-500">{l.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{l.jobTitle ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{l.departmentName ?? '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(l)} className="text-green-700 hover:text-green-900 text-xs font-medium mr-3">
                      View
                    </button>
                    <button onClick={() => handleDeactivate(l.id)} className={dangerLink}>
                      Deactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <LabourerModal
          farmId={farmId}
          labourer={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); showToast('Saved'); }}
        />
      )}
    </div>
  );
}

function LabourerModal({
  farmId, labourer, onClose, onSaved,
}: {
  farmId: number;
  labourer: CasualLabourerDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !labourer;
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [summary, setSummary] = useState<CasualLabourerSummaryDto | null>(null);
  const [firstName, setFirstName] = useState(labourer?.firstName ?? '');
  const [lastName, setLastName] = useState(labourer?.lastName ?? '');
  const [phone, setPhone] = useState(labourer?.phone ?? '');
  const [jobTitle, setJobTitle] = useState(labourer?.jobTitle ?? '');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  useEffect(() => {
    getDepartments(farmId).then(setDepartments).catch(() => setDepartments([]));
    if (labourer) {
      getCasualLabourerSummary(farmId, labourer.id).then(setSummary).catch(() => setSummary(null));
    }
  }, [farmId, labourer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        jobTitle: jobTitle || null,
        departmentId: departmentId ? Number(departmentId) : null,
      };
      if (isNew) await addCasualLabourer(farmId, payload);
      else await updateCasualLabourer(farmId, labourer.id, payload);
      onSaved();
    } catch {
      setError('Failed to save labourer.');
    } finally {
      setSaving(false);
    }
  }

  async function refreshSummary() {
    if (!labourer) return;
    getCasualLabourerSummary(farmId, labourer.id).then(setSummary).catch(() => null);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!labourer || !paymentAmount) return;
    try {
      await recordCasualPayment(farmId, labourer.id, {
        paymentDate, amount: Number(paymentAmount), note: paymentNote || null,
      });
      setPaymentAmount('');
      setPaymentNote('');
      refreshSummary();
    } catch {
      setError('Failed to record payment.');
    }
  }

  async function handleDeletePayment(paymentId: number) {
    if (!labourer || !confirm('Delete this payment?')) return;
    try {
      await deleteCasualPayment(farmId, labourer.id, paymentId);
      refreshSummary();
    } catch {
      setError('Failed to delete payment.');
    }
  }

  return (
    <Modal title={isNew ? 'Add labourer' : labourer.name} onClose={onClose}>
      {labourer?.lsNumber && <p className="text-xs text-gray-400 font-mono -mt-2">{labourer.lsNumber}</p>}
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
            <label className={labelClass}>Job title</label>
            <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Department</label>
            <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </form>

      {summary && (
        <>
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
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.payments.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-400 text-xs">No payments recorded</td></tr>
                  ) : summary.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{formatDate(p.paymentDate)}</td>
                      <td className="px-3 py-2">{formatMoney(p.amount)}</td>
                      <td className="px-3 py-2 text-gray-500">{p.note ?? ''}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleDeletePayment(p.id)} className={dangerLink}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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
        </>
      )}
    </Modal>
  );
}

// ── Work sessions ────────────────────────────────────────────────────────

function SessionsTab({ farmId, showToast }: { farmId: number; showToast: (m: string) => void }) {
  const [sessions, setSessions] = useState<CasualWorkSessionDto[]>([]);
  const [labourers, setLabourers] = useState<CasualLabourerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CasualWorkSessionDto | 'new' | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    Promise.all([getWorkSessions(farmId), getCasualLabourers(farmId)])
      .then(([s, l]) => { setSessions(s); setLabourers(l); })
      .catch(() => setError('Failed to load work sessions.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [farmId]);

  async function handleDelete(id: number) {
    if (!confirm('Delete this work session?')) return;
    try {
      await deleteWorkSession(farmId, id);
      showToast('Session deleted');
      load();
    } catch {
      showToast('Failed to delete session.');
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Work sessions</h3>
        <button onClick={() => setEditing('new')} className={primaryBtn}>New session</button>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      ) : sessions.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No work sessions recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Default rate</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Labourers</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(s.sessionDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{s.activity}</td>
                  <td className="px-4 py-3">{formatMoney(s.defaultDailyRate)}</td>
                  <td className="px-4 py-3">{s.entries.length}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(s)} className="text-green-700 hover:text-green-900 text-xs font-medium mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id)} className={dangerLink}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SessionModal
          farmId={farmId}
          session={editing === 'new' ? null : editing}
          labourers={labourers}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); showToast('Session saved'); }}
        />
      )}
    </div>
  );
}

function SessionModal({
  farmId, session, labourers, onClose, onSaved,
}: {
  farmId: number;
  session: CasualWorkSessionDto | null;
  labourers: CasualLabourerDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !session;
  const [sessionDate, setSessionDate] = useState(session?.sessionDate ?? '');
  const [activity, setActivity] = useState(session?.activity ?? '');
  const [defaultDailyRate, setDefaultDailyRate] = useState(session?.defaultDailyRate?.toString() ?? '');
  const [selected, setSelected] = useState<Set<number>>(
    new Set((session?.entries ?? []).map((e) => e.casualLabourerId)),
  );
  const [rates, setRates] = useState<Record<number, string>>(
    Object.fromEntries((session?.entries ?? []).map((e) => [e.casualLabourerId, e.rateOverride?.toString() ?? ''])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entries = [...selected].map((id) => ({
      casualLabourerId: id,
      rateOverride: rates[id] ? Number(rates[id]) : null,
    }));
    if (entries.length === 0) {
      setError('Select at least one labourer.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { sessionDate, activity, defaultDailyRate: Number(defaultDailyRate), entries };
      if (isNew) await createWorkSession(farmId, payload);
      else await updateWorkSession(farmId, session.id, payload);
      onSaved();
    } catch {
      setError('Failed to save session.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'New work session' : 'Edit work session'} onClose={onClose} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Default daily rate</label>
            <input type="number" step="0.01" value={defaultDailyRate} onChange={(e) => setDefaultDailyRate(e.target.value)} required className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Activity</label>
            <input value={activity} onChange={(e) => setActivity(e.target.value)} required className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Labourers present</label>
          <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {labourers.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2 w-10">
                      <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                    </td>
                    <td className="px-3 py-2">{l.name}</td>
                    <td className="px-3 py-2 w-40">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="rate override"
                        value={rates[l.id] ?? ''}
                        onChange={(e) => setRates((prev) => ({ ...prev, [l.id]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Monthly payroll ─────────────────────────────────────────────────────

function MonthlyTab({ farmId, showToast }: { farmId: number; showToast: (m: string) => void }) {
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [entries, setEntries] = useState<CasualPayrollEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    getMonthlyCasualPayroll(farmId, year, month)
      .then(setEntries)
      .catch(() => setError('Failed to load monthly payroll.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [farmId, year, month]);

  async function handleExport() {
    try {
      await downloadCasualExport(farmId, year, month);
    } catch {
      showToast('Export failed.');
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
          {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass}>
          {MONTH_NAMES.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
        </select>
        <button onClick={handleExport} className={`${secondaryBtn} ml-auto`}>Export Excel</button>
      </div>
      {loading ? (
        <Spinner />
      ) : error ? (
        <div className="p-6 text-red-600 text-sm">{error}</div>
      ) : entries.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-sm">No casual payroll data for this period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Days present</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Month earnings</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">All-time paid</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e) => (
                <tr key={e.labourerId}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.name}</td>
                  <td className="px-4 py-3">{e.daysPresent}</td>
                  <td className="px-4 py-3">{formatMoney(e.monthEarnings)}</td>
                  <td className="px-4 py-3">{formatMoney(e.allTimePaid)}</td>
                  <td className="px-4 py-3">{formatMoney(e.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
