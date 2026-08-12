import client from './client';
import type { DepartmentDto, LivestockTypeDto } from '../types';

export async function getDepartments(farmId: number): Promise<DepartmentDto[]> {
  const res = await client.get<{ data: DepartmentDto[] }>(`/farms/${farmId}/departments`);
  return res.data.data;
}

export async function addDepartment(farmId: number, name: string): Promise<DepartmentDto> {
  const res = await client.post<{ data: DepartmentDto }>(`/farms/${farmId}/departments`, { name });
  return res.data.data;
}

export async function deleteDepartment(farmId: number, deptId: number): Promise<void> {
  await client.delete(`/farms/${farmId}/departments/${deptId}`);
}

export async function getLivestockTypes(farmId: number): Promise<Record<string, LivestockTypeDto[]>> {
  const res = await client.get<{ data: Record<string, LivestockTypeDto[]> }>(`/farms/${farmId}/livestock-types`);
  return res.data.data;
}
