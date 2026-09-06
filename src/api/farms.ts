import client from './client';
import type { DepartmentDto } from '../types';

export async function getDepartments(farmId: number): Promise<DepartmentDto[]> {
  const res = await client.get<{ data: DepartmentDto[] }>(`/farms/${farmId}/departments`);
  return res.data.data;
}
