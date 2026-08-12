import client from './client';
import type {
  CasualLabourerDto,
  CasualLabourerRequest,
  CasualLabourerSummaryDto,
  CasualPayrollEntryDto,
  CasualWorkSessionDto,
  CreateWorkSessionRequest,
  RecordPaymentRequest,
} from '../types';

export async function getCasualLabourers(farmId: number): Promise<CasualLabourerDto[]> {
  const res = await client.get<{ data: CasualLabourerDto[] }>(`/farms/${farmId}/casual-labourers`);
  return res.data.data;
}

export async function addCasualLabourer(farmId: number, req: CasualLabourerRequest): Promise<CasualLabourerDto> {
  const res = await client.post<{ data: CasualLabourerDto }>(`/farms/${farmId}/casual-labourers`, req);
  return res.data.data;
}

export async function updateCasualLabourer(
  farmId: number,
  labourerId: number,
  req: CasualLabourerRequest,
): Promise<CasualLabourerDto> {
  const res = await client.put<{ data: CasualLabourerDto }>(`/farms/${farmId}/casual-labourers/${labourerId}`, req);
  return res.data.data;
}

export async function deactivateCasualLabourer(farmId: number, labourerId: number): Promise<void> {
  await client.delete(`/farms/${farmId}/casual-labourers/${labourerId}`);
}

export async function getCasualLabourerSummary(farmId: number, labourerId: number): Promise<CasualLabourerSummaryDto> {
  const res = await client.get<{ data: CasualLabourerSummaryDto }>(`/farms/${farmId}/casual-labourers/${labourerId}/summary`);
  return res.data.data;
}

export async function recordCasualPayment(
  farmId: number,
  labourerId: number,
  req: RecordPaymentRequest,
): Promise<void> {
  await client.post(`/farms/${farmId}/casual-labourers/${labourerId}/payments`, req);
}

export async function deleteCasualPayment(farmId: number, labourerId: number, paymentId: number): Promise<void> {
  await client.delete(`/farms/${farmId}/casual-labourers/${labourerId}/payments/${paymentId}`);
}

export async function getWorkSessions(farmId: number): Promise<CasualWorkSessionDto[]> {
  const res = await client.get<{ data: CasualWorkSessionDto[] }>(`/farms/${farmId}/casual-labourers/work-sessions`);
  return res.data.data;
}

export async function createWorkSession(farmId: number, req: CreateWorkSessionRequest): Promise<CasualWorkSessionDto> {
  const res = await client.post<{ data: CasualWorkSessionDto }>(`/farms/${farmId}/casual-labourers/work-sessions`, req);
  return res.data.data;
}

export async function updateWorkSession(
  farmId: number,
  sessionId: number,
  req: CreateWorkSessionRequest,
): Promise<CasualWorkSessionDto> {
  const res = await client.put<{ data: CasualWorkSessionDto }>(
    `/farms/${farmId}/casual-labourers/work-sessions/${sessionId}`,
    req,
  );
  return res.data.data;
}

export async function deleteWorkSession(farmId: number, sessionId: number): Promise<void> {
  await client.delete(`/farms/${farmId}/casual-labourers/work-sessions/${sessionId}`);
}

export async function getMonthlyCasualPayroll(
  farmId: number,
  year: number,
  month: number,
): Promise<CasualPayrollEntryDto[]> {
  const res = await client.get<{ data: CasualPayrollEntryDto[] }>(`/farms/${farmId}/casual-labourers/payroll`, {
    params: { year, month },
  });
  return res.data.data;
}

export async function downloadCasualExport(farmId: number, year: number, month: number): Promise<void> {
  const token = localStorage.getItem('dashboard_token') ?? '';
  const res = await fetch(`/api/farms/${farmId}/casual-labourers/export?year=${year}&month=${month}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `casual-labour-${year}-${String(month).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
