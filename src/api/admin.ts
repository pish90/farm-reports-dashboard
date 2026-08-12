import client from './client';

function authHeader(): Record<string, string> {
  const token = localStorage.getItem('dashboard_token') ?? '';
  return { Authorization: `Bearer ${token}` };
}

async function downloadBlob(path: string, filename: string, method: 'GET' | 'POST' = 'GET'): Promise<void> {
  const res = await fetch(`/api${path}`, { method, headers: authHeader() });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportAllFarmsExcel(year: number, month: number): Promise<void> {
  await downloadBlob(
    `/admin/export/excel?year=${year}&month=${month}`,
    `farm-reports-${year}-${String(month).padStart(2, '0')}.xlsx`,
  );
}

export async function downloadAttendanceBackup(): Promise<void> {
  await downloadBlob('/admin/backup/attendance', 'attendance_backup.csv');
}

export async function createAttendanceBackup(): Promise<void> {
  await downloadBlob('/admin/backup', `attendance-backup-${new Date().toISOString().slice(0, 10)}.csv`, 'POST');
}

export async function resetUserPassword(email: string, newPassword: string): Promise<void> {
  await client.put('/admin/users/reset-password', { email, newPassword });
}
