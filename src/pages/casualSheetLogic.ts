// Pure helpers for Scan Casual Sheets (no React, no API calls) — grouping read pages into sheets and
// spotting repeated photos/sheets so the same work can't be saved twice.
import type { NameMatch, ScanPageResult } from '../api/casualSheets';

export const NEW = 'new';

export type PageStatus = 'queued' | 'reading' | 'done' | 'error';

export interface Page {
  id: string;
  file: File;
  /** SHA-256 of the file bytes — the same photo added twice is skipped before it is read (and paid for) again. */
  hash: string;
  url: string;
  status: PageStatus;
  error?: string;
  result?: ScanPageResult;
}

export async function fileHash(file: File): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // crypto.subtle needs a secure context; fall back to name + size + date so exact re-adds are still caught.
    return `${file.name}|${file.size}|${file.lastModified}`;
  }
}

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
export const normActivity = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * A page is a repeat of an earlier one when most of its rows (number + name + amount) are the same —
 * catches a page photographed twice, which a file fingerprint can't.
 */
export function repeatedPage(page: ScanPageResult, earlier: { id: string; result: ScanPageResult }[]): string | null {
  const key = (r: ScanPageResult['rows'][number]) => `${r.lineNo ?? ''}|${normName(r.nameAsWritten)}|${r.netAmount ?? ''}`;
  const mine = new Set(page.rows.map(key));
  if (mine.size < 3) return null;
  for (const e of earlier) {
    const theirs = new Set(e.result.rows.map(key));
    let same = 0;
    mine.forEach((k) => { if (theirs.has(k)) same++; });
    if (same / Math.max(mine.size, theirs.size) >= 0.8) return e.id;
  }
  return null;
}

export interface EditRow {
  id: string;
  pageId: string;
  lineNo: number | null;
  nameAsWritten: string;
  /** employee id as string, NEW for "add as new casual", '' for not chosen yet */
  choice: string;
  newFirst: string;
  newLast: string;
  amount: string;
  rawAmount: string;
  daysWorked: string;
  signMark: string;
  paid: boolean;
  include: boolean;
  uncertain: boolean;
  uncertainReason: string;
  candidates: NameMatch[];
  /** File name of the earlier photo this row's page repeats; such rows start unticked and don't count in totals. */
  repeatOf: string | null;
}

export interface EditSheet {
  key: string;
  activity: string;
  periodText: string;
  date: string;
  ratePerDay: number | null;
  pageIds: string[];
  writtenTotals: number[];
  notes: string[];
  rows: EditRow[];
  /** Reviewer confirmed this is a different sheet despite looking like a repeat (saved before / twice in this upload). */
  confirmDuplicate: boolean;
}

/** Sheet key -> number (1-based) of an earlier sheet in this upload with the same activity and date. */
export function repeatedSheets(sheets: EditSheet[]): Record<string, number> {
  const seen: Record<string, number> = {};
  const out: Record<string, number> = {};
  sheets.forEach((s, i) => {
    if (!s.date || !s.activity.trim() || !s.rows.some((r) => r.include)) return;
    const k = `${s.date}|${normActivity(s.activity)}`;
    if (k in seen) out[s.key] = seen[k];
    else seen[k] = i + 1;
  });
  return out;
}

/** Pages are grouped into sheets in upload order: a page with a heading starts a sheet, pages without one continue it. */
export function buildSheets(pages: Page[]): EditSheet[] {
  const sheets: EditSheet[] = [];
  const readSoFar: { id: string; result: ScanPageResult }[] = [];
  const nameOf = Object.fromEntries(pages.map((p) => [p.id, p.file.name]));
  for (const p of pages) {
    const r = p.result;
    if (!r || !r.isCasualPaySheet) continue;
    const repeatId = repeatedPage(r, readSoFar);
    readSoFar.push({ id: p.id, result: r });
    const repeatOf = repeatId ? nameOf[repeatId] : null;
    let sheet = sheets[sheets.length - 1];
    if (r.heading.present || !sheet) {
      sheet = {
        key: `s${sheets.length + 1}`,
        activity: r.heading.activity,
        periodText: r.heading.periodText,
        date: r.heading.endDate ?? r.heading.startDate ?? '',
        ratePerDay: r.heading.ratePerDay,
        pageIds: [],
        writtenTotals: [],
        notes: [],
        rows: [],
        confirmDuplicate: false,
      };
      sheets.push(sheet);
    }
    sheet.pageIds.push(p.id);
    // A repeated page's written total would otherwise hide the double count in the totals check.
    if (r.writtenTotal != null && !repeatOf) sheet.writtenTotals.push(r.writtenTotal);
    if (r.notes) sheet.notes.push(`${p.file.name}: ${r.notes}`);
    r.rows.forEach((row, i) => {
      sheet.rows.push({
        id: `${p.id}-${i}`,
        pageId: p.id,
        lineNo: row.lineNo,
        nameAsWritten: row.nameAsWritten,
        choice: row.matchedEmployeeId != null ? String(row.matchedEmployeeId) : '',
        newFirst: row.suggestedFirstName,
        newLast: row.suggestedLastName,
        amount: row.netAmount != null ? String(row.netAmount) : '',
        rawAmount: row.rawAmount,
        daysWorked: row.daysWorked,
        signMark: row.signMark,
        paid: row.paid,
        include: !repeatOf && row.netAmount != null && row.netAmount > 0,
        uncertain: row.uncertain,
        uncertainReason: row.uncertainReason,
        candidates: row.candidates,
        repeatOf,
      });
    });
  }
  return sheets;
}

export function rowProblem(row: EditRow): string | null {
  if (!row.include) return null;
  const amount = Number(row.amount);
  if (!row.amount || !Number.isFinite(amount) || amount <= 0) return 'Enter the amount';
  if (!row.choice) return 'Choose who this is';
  if (row.choice === NEW && !row.newFirst.trim()) return 'Enter the new casual’s first name';
  return null;
}
