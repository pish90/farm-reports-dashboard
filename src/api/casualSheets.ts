import client from './client';

// Scan Casual Sheets: photos of handwritten weekly casual pay sheets -> read by Claude on the
// backend -> reviewed here -> saved as casual work sessions (+ payments for signed rows).

export interface NameMatch {
  employeeId: number;
  name: string;
  lsNumber: string | null;
  active: boolean;
  score: number;
}

export interface ScannedHeading {
  present: boolean;
  activity: string;
  periodText: string;
  startDate: string | null;
  endDate: string | null;
  ratePerDay: number | null;
}

export interface ScannedRow {
  lineNo: number | null;
  nameAsWritten: string;
  daysWorked: string;
  deduction: number | null;
  netAmount: number | null;
  rawAmount: string;
  signMark: string;
  paid: boolean;
  uncertain: boolean;
  uncertainReason: string;
  matchedEmployeeId: number | null;
  candidates: NameMatch[];
  suggestedFirstName: string;
  suggestedLastName: string;
}

export interface ScanPageResult {
  fileName: string;
  isCasualPaySheet: boolean;
  heading: ScannedHeading;
  rows: ScannedRow[];
  writtenTotal: number | null;
  notes: string;
}

export interface CheckSheetResult {
  key: string;
  alreadyImportedEmployeeIds: number[];
  duplicateSheet: boolean;
}

export interface SaveRow {
  employeeId: number | null;
  newFirstName: string | null;
  newLastName: string | null;
  amount: number;
  paid: boolean;
}

export interface SaveSheet {
  activity: string;
  periodText: string;
  date: string;
  ratePerDay: number | null;
  rows: SaveRow[];
  /** Confirmed it's a different sheet even though it looks like one already saved / repeated in this upload. */
  confirmDuplicate: boolean;
}

export interface SaveResult {
  sheetsSaved: number;
  entriesSaved: number;
  paymentsRecorded: number;
  employeesCreated: number;
  totalEarned: number;
  totalPaid: number;
}

export async function scanCasualSheetPage(farmId: number, file: File): Promise<ScanPageResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await client.post<{ data: ScanPageResult }>('/admin/casual-sheets/scan', formData, {
    params: { farmId },
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 5 * 60 * 1000,
  });
  return res.data.data;
}

export async function checkCasualSheets(
  farmId: number,
  sheets: { key: string; date: string | null; activity: string; employeeIds: number[] }[],
): Promise<CheckSheetResult[]> {
  const res = await client.post<{ data: { sheets: CheckSheetResult[] } }>('/admin/casual-sheets/check', { farmId, sheets });
  return res.data.data.sheets;
}

export async function saveCasualSheets(farmId: number, sheets: SaveSheet[]): Promise<SaveResult> {
  const res = await client.post<{ data: SaveResult }>('/admin/casual-sheets/save', { farmId, sheets });
  return res.data.data;
}
