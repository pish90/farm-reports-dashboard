import client from './client';
import type { FarmLiveStatusDto, FarmSummaryDto, PageDto, ReportDto } from '../types';

export async function getFarmSummaries(): Promise<FarmSummaryDto[]> {
  const res = await client.get<{ data: FarmSummaryDto[] }>('/admin/farms');
  return res.data.data;
}

export async function getLiveStatus(year: number, month: number): Promise<FarmLiveStatusDto[]> {
  const res = await client.get<{ data: FarmLiveStatusDto[] }>('/admin/live-status', {
    params: { year, month },
  });
  return res.data.data;
}

export async function listReports(params: {
  farmId?: number;
  year?: number;
  month?: number;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageDto<ReportDto>> {
  const res = await client.get<{ data: PageDto<ReportDto> }>('/admin/reports', { params });
  return res.data.data;
}

export async function getReport(id: number): Promise<ReportDto> {
  const res = await client.get<{ data: ReportDto }>(`/reports/${id}`);
  return res.data.data;
}

export async function downloadExport(id: number, year: number, month: number): Promise<void> {
  const token = localStorage.getItem('dashboard_token') ?? '';
  const res = await fetch(`/api/reports/${id}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `farm-report-${year}-${String(month).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
