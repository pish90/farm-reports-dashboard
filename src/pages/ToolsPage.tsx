import { useState } from 'react';
import { createAttendanceBackup, downloadAttendanceBackup, exportAllFarmsExcel, resetUserPassword } from '../api/admin';
import { useAuth } from '../auth/AuthContext';
import { MONTH_NAMES } from '../lib/format';

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);

const selectClass =
  'border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white';
const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';
const primaryBtn = 'px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40 transition-colors';
const secondaryBtn = 'px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors';

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export default function ToolsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const [backupBusy, setBackupBusy] = useState<'download' | 'create' | null>(null);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function notify(message: string, isError = false) {
    if (isError) setError(message);
    else { setToast(message); setError(null); }
    setTimeout(() => { setToast(null); setError(null); }, 3000);
  }

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
        Admin access required.
      </div>
    );
  }

  async function handleExportAll() {
    setExporting(true);
    try {
      await exportAllFarmsExcel(year, month);
    } catch {
      notify('Export failed.', true);
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadOnly() {
    setBackupBusy('download');
    try {
      await downloadAttendanceBackup();
    } catch {
      notify('Download failed.', true);
    } finally {
      setBackupBusy(null);
    }
  }

  async function handleCreateBackup() {
    setBackupBusy('create');
    try {
      await createAttendanceBackup();
      notify('Backup created');
    } catch {
      notify('Backup failed.', true);
    } finally {
      setBackupBusy(null);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetting(true);
    try {
      await resetUserPassword(email, newPassword);
      notify('Password reset');
      setEmail('');
      setNewPassword('');
    } catch {
      notify('Failed to reset password.', true);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-5">
      {(toast || error) && (
        <div className={`text-sm ${error ? 'text-red-600' : 'text-green-700'}`}>{error ?? toast}</div>
      )}

      <Card title="Export all farms to Excel" description="Generates a combined workbook for every farm's report in the selected period.">
        <div className="flex flex-wrap items-center gap-3">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={selectClass}>
            {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={selectClass}>
            {MONTH_NAMES.map((name, idx) => <option key={idx + 1} value={idx + 1}>{name}</option>)}
          </select>
          <button onClick={handleExportAll} disabled={exporting} className={primaryBtn}>
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </Card>

      <Card title="Attendance backups" description="Creates a saved backup row and downloads the CSV of all attendance ever recorded.">
        <div className="flex flex-wrap gap-3">
          <button onClick={handleDownloadOnly} disabled={backupBusy !== null} className={secondaryBtn}>
            {backupBusy === 'download' ? 'Downloading…' : 'Download current CSV (no save)'}
          </button>
          <button onClick={handleCreateBackup} disabled={backupBusy !== null} className={primaryBtn}>
            {backupBusy === 'create' ? 'Creating…' : 'Create backup + download'}
          </button>
        </div>
      </Card>

      <Card title="Reset a user's password">
        <form onSubmit={handleResetPassword} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>New password</label>
            <input type="text" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={resetting} className={secondaryBtn}>
              {resetting ? 'Resetting…' : 'Reset password'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
