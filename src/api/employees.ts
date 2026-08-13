import client from './client';
import type {
  EmployeeCsvImportResult, EmployeeDto, EmployeeLedgerDto, EmployeePaymentDto, EmployeeRequest,
  EmployeeSummaryDto, ImportResult, RecordPaymentRequest,
} from '../types';

export async function getMasterEmployeeRegistry(): Promise<EmployeeDto[]> {
  const res = await client.get<{ data: EmployeeDto[] }>('/admin/employees');
  return res.data.data;
}

export async function getFarmEmployees(farmId: number): Promise<EmployeeDto[]> {
  const res = await client.get<{ data: EmployeeDto[] }>(`/farms/${farmId}/employees`);
  return res.data.data;
}

export async function createEmployee(farmId: number, req: EmployeeRequest): Promise<EmployeeDto> {
  const res = await client.post<{ data: EmployeeDto }>(`/farms/${farmId}/employees`, req);
  return res.data.data;
}

export async function updateEmployee(farmId: number, id: number, req: EmployeeRequest): Promise<EmployeeDto> {
  const res = await client.put<{ data: EmployeeDto }>(`/farms/${farmId}/employees/${id}`, req);
  return res.data.data;
}

export async function getEmployeeSummary(farmId: number, id: number): Promise<EmployeeSummaryDto> {
  const res = await client.get<{ data: EmployeeSummaryDto }>(`/farms/${farmId}/employees/${id}/summary`);
  return res.data.data;
}

export async function getEmployeeLedger(farmId: number, id: number, year: number): Promise<EmployeeLedgerDto> {
  const res = await client.get<{ data: EmployeeLedgerDto }>(`/farms/${farmId}/employees/${id}/ledger`, {
    params: { year },
  });
  return res.data.data;
}

export async function recordEmployeePayment(
  farmId: number,
  id: number,
  req: RecordPaymentRequest,
): Promise<EmployeePaymentDto> {
  const res = await client.post<{ data: EmployeePaymentDto }>(`/farms/${farmId}/employees/${id}/payments`, req);
  return res.data.data;
}

export async function deleteEmployeePayment(farmId: number, id: number, paymentId: number): Promise<void> {
  await client.delete(`/farms/${farmId}/employees/${id}/payments/${paymentId}`);
}

export async function importEmployees(file: File): Promise<EmployeeCsvImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<{ data: EmployeeCsvImportResult }>('/admin/employees/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function importLivestock(file: File, year: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<{ data: ImportResult }>('/admin/livestock/import', formData, {
    params: { year },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function importMilk(file: File, year: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<{ data: ImportResult }>('/admin/milk/import', formData, {
    params: { year },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function importEmployeePay(file: File, startYear: number, startMonth: number): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<{ data: ImportResult }>('/admin/employee-pay/import', formData, {
    params: { startYear, startMonth },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}
