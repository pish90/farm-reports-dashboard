import client from './client';
import type { AuditLogPageDto } from '../types';

export async function getAuditLogs(params: {
  farmId?: number;
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}): Promise<AuditLogPageDto> {
  const res = await client.get<{ data: AuditLogPageDto }>('/admin/audit-logs', { params });
  return res.data.data;
}
