import client from './client';
import type { EmployeeCsvImportResult, EmployeeDto, ImportResult } from '../types';

export async function getMasterEmployeeRegistry(): Promise<EmployeeDto[]> {
  const res = await client.get<{ data: EmployeeDto[] }>('/admin/employees');
  return res.data.data;
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
