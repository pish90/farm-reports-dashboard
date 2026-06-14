export interface ReportDto {
  id: number;
  farmId: number;
  year: number;
  month: number;
  status: 'DRAFT' | 'SUBMITTED';
  submittedAt: string | null;
  createdAt: string;
  attendance: AttendanceRecordDto[] | null;
  livestock: LivestockRecordDto[] | null;
  milk: MilkRecordDto[] | null;
  expenses: ExpenseRecordDto[] | null;
}

export interface AttendanceRecordDto {
  id: number;
  workerId: number;
  workerName: string;
  dayOfMonth: number;
  present: boolean;
  notes: string | null;
}

export interface LivestockRecordDto {
  id: number;
  livestockTypeId: number;
  category: string;
  type: string;
  count: number;
}

export interface MilkRecordDto {
  id: number;
  dayOfMonth: number;
  litres: number;
}

export interface ExpenseRecordDto {
  id: number;
  entryNo: number;
  date: string;        // ISO: YYYY-MM-DD
  supplierContractor: string | null;
  receiptNo: string | null;
  cost: number;
}

export interface FarmSummaryDto {
  farmId: number;
  farmName: string;
  lastSubmittedAt: string | null;
  reportsThisYear: number;
  totalMilkThisMonth: number;
  totalExpensesThisMonth: number;
}

export interface AuthUser {
  userId: number;
  farmId: number;
  farmName: string;
  userName: string;
  role: string;
}

export type AuditAction =
  | 'LOGIN' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED' | 'PASSWORD_RESET'
  | 'REPORT_CREATED' | 'REPORT_SUBMITTED' | 'REPORT_REOPENED'
  | 'ATTENDANCE_UPDATED' | 'LIVESTOCK_UPDATED' | 'MILK_UPDATED'
  | 'EXPENSES_UPDATED' | 'ATTENDANCE_NOTES_UPDATED' | 'LIVESTOCK_NOTES_UPDATED'
  | 'WORKER_ADDED' | 'WORKER_DEACTIVATED' | 'EXCEL_EXPORTED';

export interface AuditLogDto {
  id: number;
  timestamp: string;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  farmId: number | null;
  farmName: string | null;
  action: AuditAction;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  ipAddress: string | null;
}

export interface AuditLogPageDto {
  content: AuditLogDto[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}
