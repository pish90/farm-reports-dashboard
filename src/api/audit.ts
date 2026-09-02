import client from './client';
import type { AuditLogDto, PageDto } from '../types';

export async function getAuditLogs(params: {
  farmId?: number;
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}): Promise<PageDto<AuditLogDto>> {
  const res = await client.get<{ data: PageDto<AuditLogDto> }>('/admin/audit-logs', { params });
  return res.data.data;
}
