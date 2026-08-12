import client from './client';
import type { PayrollEntryRequest, PayrollRecordDto, PayrollSummaryDto } from '../types';

export async function getPayroll(farmId: number, year: number, month: number): Promise<PayrollRecordDto[]> {
  const res = await client.get<{ data: PayrollRecordDto[] }>('/reports/payroll', { params: { farmId, year, month } });
  return res.data.data;
}

export async function upsertPayroll(
  farmId: number,
  year: number,
  month: number,
  entries: PayrollEntryRequest[],
): Promise<void> {
  await client.put('/reports/payroll', entries, { params: { farmId, year, month } });
}

export async function getPayrollSummary(farmId: number, year: number): Promise<PayrollSummaryDto[]> {
  const res = await client.get<{ data: PayrollSummaryDto[] }>('/reports/payroll/summary', { params: { farmId, year } });
  return res.data.data;
}
