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

export interface EmployeeDto {
  id: number;
  farmId: number;
  farmName: string;
  lsNumber: string | null;
  employeeId: string | null;
  firstName: string;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  employmentType: 'SALARIED' | 'CASUAL';
  jobTitle: string | null;
  departmentName: string | null;
  startDate: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  gender: string | null;
  age: number | null;
  status: string;
  defaultDailyRate: number | null;
  photoBase64: string | null;
  photoMimeType: string | null;
}

export interface ImportRowError {
  row: number;
  rowSummary: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  errors: ImportRowError[];
}

export interface EmployeeCsvImportResult {
  success: boolean;
  totalRows: number;
  importedCount: number;
  errors: ImportRowError[];
}

// ── Payroll ──────────────────────────────────────────────────────────────

export interface PayrollRecordDto {
  id: number | null;
  employeeId: number;
  employeeName: string;
  employeeCode: string | null;
  lsNumber: string | null;
  salaryRate: number | null;
  daysWorked: number | null;
  grossSalary: number | null;
  loans: number | null;
  amountPaid: number | null;
  amountRemaining: number | null;
  notes: string | null;
}

export interface PayrollEntryRequest {
  employeeId: number;
  salaryRate: number | null;
  daysWorked: number | null;
  grossSalary: number | null;
  loans: number | null;
  amountPaid: number | null;
  amountRemaining: number | null;
  notes: string | null;
}

export interface PayrollSummaryDto {
  farmId: number;
  year: number;
  month: number;
  totalGross: number;
  totalLoans: number;
  totalPaid: number;
  totalRemaining: number;
}

// ── Casual labour ────────────────────────────────────────────────────────

export interface CasualLabourerDto {
  id: number;
  lsNumber: string | null;
  employeeId: string | null;
  firstName: string;
  lastName: string | null;
  name: string;
  phone: string | null;
  photoBase64: string | null;
  photoMimeType: string | null;
  jobTitle: string | null;
  departmentName: string | null;
}

export interface CasualLabourerRequest {
  firstName: string;
  lastName: string | null;
  phone: string | null;
  jobTitle: string | null;
  departmentId: number | null;
}

export interface CasualWorkEntryDto {
  id: number;
  casualLabourerId: number;
  labourerName: string;
  rateOverride: number | null;
  effectiveRate: number;
}

export interface CasualWorkSessionDto {
  id: number;
  sessionDate: string;
  activity: string;
  defaultDailyRate: number;
  entries: CasualWorkEntryDto[];
}

export interface WorkSessionEntryRequest {
  casualLabourerId: number;
  rateOverride: number | null;
}

export interface CreateWorkSessionRequest {
  sessionDate: string;
  activity: string;
  defaultDailyRate: number;
  entries: WorkSessionEntryRequest[];
}

export interface CasualLabourerPaymentDto {
  id: number;
  casualLabourerId: number;
  labourerName: string;
  paymentDate: string;
  amount: number;
  note: string | null;
  paidBy: string | null;
  createdAt: string;
}

export interface CasualLabourerSummaryDto {
  allTimeEarned: number;
  allTimePaid: number;
  outstanding: number;
  payments: CasualLabourerPaymentDto[];
}

export interface RecordPaymentRequest {
  paymentDate: string;
  amount: number;
  note: string | null;
}

export interface CasualPayrollEntryDto {
  labourerId: number;
  name: string;
  phone: string | null;
  photoBase64: string | null;
  photoMimeType: string | null;
  daysPresent: number;
  monthEarnings: number;
  allTimePaid: number;
  outstanding: number;
}

// ── Farm settings ────────────────────────────────────────────────────────

export interface DepartmentDto {
  id: number;
  name: string;
}

export interface LivestockTypeDto {
  id: number;
  category: string;
  type: string;
}
