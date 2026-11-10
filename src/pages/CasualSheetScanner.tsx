import { useEffect, useMemo, useRef, useState } from 'react';
import { getCasualLabourers } from '../api/casual';
import {
  checkCasualSheets, saveCasualSheets, scanCasualSheetPage,
  type CheckSheetResult, type NameMatch, type SaveResult, type ScanPageResult,
} from '../api/casualSheets';
import { useFarmScope } from '../auth/useFarmScope';
import Modal from '../components/Modal';
import type { CasualLabourerDto } from '../types';

const inputClass =
  'border border-gray-300 rounded-md px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500';
const PARALLEL_READS = 3;
const NEW = 'new';

type PageStatus = 'queued' | 'reading' | 'done' | 'error';

interface Page {
  id: string;
  file: File;
  url: string;
  status: PageStatus;
  error?: string;
  result?: ScanPageResult;
}

interface EditRow {
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
}

interface EditSheet {
  key: string;
  activity: string;
  periodText: string;
  date: string;
  ratePerDay: number | null;
  pageIds: string[];
  writtenTotals: number[];
  notes: string[];
  rows: EditRow[];
}

const ksh = (n: number) => n.toLocaleString('en-KE', { maximumFractionDigits: 2 });

/** Pages are grouped into sheets in upload order: a page with a heading starts a sheet, pages without one continue it. */
function buildSheets(pages: Page[]): EditSheet[] {
  const sheets: EditSheet[] = [];
  for (const p of pages) {
    const r = p.result;
    if (!r || !r.isCasualPaySheet) continue;
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
      };
      sheets.push(sheet);
    }
    sheet.pageIds.push(p.id);
    if (r.writtenTotal != null) sheet.writtenTotals.push(r.writtenTotal);
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
        include: row.netAmount != null && row.netAmount > 0,
        uncertain: row.uncertain,
        uncertainReason: row.uncertainReason,
        candidates: row.candidates,
      });
    });
  }
  return sheets;
}

function rowProblem(row: EditRow): string | null {
  if (!row.include) return null;
  const amount = Number(row.amount);
  if (!row.amount || !Number.isFinite(amount) || amount <= 0) return 'Enter the amount';
  if (!row.choice) return 'Choose who this is';
  if (row.choice === NEW && !row.newFirst.trim()) return 'Enter the new casual’s first name';
  return null;
}

export default function CasualSheetScanner() {
  const { farms, farmId, setFarmId, multiFarm } = useFarmScope();
  const [pages, setPages] = useState<Page[]>([]);
  const [sheets, setSheets] = useState<EditSheet[] | null>(null);
  const [checks, setChecks] = useState<Record<string, CheckSheetResult>>({});
  const [labourers, setLabourers] = useState<CasualLabourerDto[]>([]);
  const [zoom, setZoom] = useState<Page | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveResult | null>(null);
  const pagesRef = useRef<Page[]>([]);
  pagesRef.current = pages;
  const checksRef = useRef<Record<string, CheckSheetResult>>({});

  useEffect(() => {
    if (!farmId) return;
    getCasualLabourers(farmId).then(setLabourers).catch(() => setLabourers([]));
  }, [farmId]);

  // Release photo object URLs when leaving the page.
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const reading = pages.some((p) => p.status === 'queued' || p.status === 'reading');
  const doneCount = pages.filter((p) => p.status === 'done').length;
  const pageById = useMemo(() => Object.fromEntries(pages.map((p) => [p.id, p])), [pages]);

  function resetAll() {
    pages.forEach((p) => URL.revokeObjectURL(p.url));
    setPages([]);
    setSheets(null);
    setChecks({});
    checksRef.current = {};
    setError(null);
  }

  function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setSaved(null);
    setSheets(null);
    const added: Page[] = Array.from(list)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((file, i) => ({
        id: `p${Date.now()}-${i}`,
        file,
        url: URL.createObjectURL(file),
        status: 'queued' as PageStatus,
      }));
    setPages((prev) => [...prev, ...added]);
  }

  function updatePage(id: string, patch: Partial<Page>) {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // Read queued pages, a few at a time.
  useEffect(() => {
    if (!farmId) return;
    const active = pages.filter((p) => p.status === 'reading').length;
    const next = pages.filter((p) => p.status === 'queued').slice(0, Math.max(0, PARALLEL_READS - active));
    next.forEach((p) => {
      updatePage(p.id, { status: 'reading', error: undefined });
      scanCasualSheetPage(farmId, p.file)
        .then((result) => updatePage(p.id, { status: 'done', result }))
        .catch((e: any) =>
          updatePage(p.id, { status: 'error', error: e?.response?.data?.message ?? 'Could not read this photo' }));
    });
  }, [pages, farmId]);

  function startReview() {
    setError(null);
    setSheets(buildSheets(pages));
  }

  // Ask the server who on each sheet already has spreadsheet-imported pay for that month, and
  // whether the same sheet was saved before. Re-run when a date or a chosen employee changes.
  const checkSignature = sheets
    ? JSON.stringify(sheets.map((s) => [s.key, s.date, s.activity, s.rows.map((r) => r.choice)]))
    : '';
  useEffect(() => {
    if (!sheets || !farmId) return;
    const handle = setTimeout(() => {
      checkCasualSheets(farmId, sheets.map((s) => ({
        key: s.key,
        date: s.date || null,
        activity: s.activity,
        employeeIds: s.rows.filter((r) => r.choice && r.choice !== NEW).map((r) => Number(r.choice)),
      })))
        .then((res) => {
          const byKey = Object.fromEntries(res.map((c) => [c.key, c]));
          const prev = checksRef.current;
          // Untick rows that just became flagged as already imported (only when newly flagged,
          // so a row the reviewer deliberately re-ticks stays ticked).
          setSheets((cur) => cur && cur.map((s) => {
            const ids = new Set(byKey[s.key]?.alreadyImportedEmployeeIds ?? []);
            const before = new Set(prev[s.key]?.alreadyImportedEmployeeIds ?? []);
            return {
              ...s,
              rows: s.rows.map((r) =>
                ids.has(Number(r.choice)) && !before.has(Number(r.choice)) ? { ...r, include: false } : r),
            };
          }));
          checksRef.current = byKey;
          setChecks(byKey);
        })
        .catch(() => null);
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkSignature, farmId]);

  function updateSheet(key: string, patch: Partial<EditSheet>) {
    setSheets((cur) => cur && cur.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function updateRow(sheetKey: string, rowId: string, patch: Partial<EditRow>) {
    setSheets((cur) => cur && cur.map((s) => (s.key !== sheetKey ? s : {
      ...s,
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    })));
  }

  const problems = useMemo(() => {
    if (!sheets) return [];
    const out: string[] = [];
    sheets.forEach((s, i) => {
      const included = s.rows.filter((r) => r.include);
      if (included.length === 0) return;
      if (!s.date) out.push(`Sheet ${i + 1}: pick the date`);
      if (!s.activity.trim()) out.push(`Sheet ${i + 1}: enter the activity`);
      const bad = included.filter((r) => rowProblem(r)).length;
      if (bad > 0) out.push(`Sheet ${i + 1}: ${bad} row(s) need attention`);
    });
    return out;
  }, [sheets]);

  async function save() {
    if (!sheets || !farmId) return;
    setSaving(true);
    setError(null);
    try {
      const payload = sheets
        .map((s) => ({
          activity: s.activity.trim(),
          periodText: s.periodText.trim(),
          date: s.date,
          ratePerDay: s.ratePerDay,
          rows: s.rows.filter((r) => r.include).map((r) => ({
            employeeId: r.choice === NEW ? null : Number(r.choice),
            newFirstName: r.choice === NEW ? r.newFirst.trim() : null,
            newLastName: r.choice === NEW ? r.newLast.trim() || null : null,
            amount: Number(r.amount),
            paid: r.paid,
          })),
        }))
        .filter((s) => s.rows.length > 0);
      const res = await saveCasualSheets(farmId, payload);
      setSaved(res);
      resetAll();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Saving failed — nothing was saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const sortedLabourers = useMemo(
    () => [...labourers].sort((a, b) => a.name.localeCompare(b.name)),
    [labourers],
  );

  if (!farmId) {
    return <p className="text-sm text-gray-500">Loading farms…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Photograph the handwritten casual pay sheets (one photo per page, in order) and upload them here. Each
        photo is read automatically; you then check every row against the photo, fix anything misread, and save.
        Nothing is saved until you press <b>Save</b>. Each sheet becomes one work session dated the last day of the
        week, and rows with a signature, thumbprint or tick are also recorded as paid.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {multiFarm && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Farm
            <select
              value={farmId}
              disabled={pages.length > 0}
              onChange={(e) => setFarmId(Number(e.target.value))}
              className={inputClass}
            >
              {farms.map((f) => <option key={f.farmId} value={f.farmId}>{f.farmName}</option>)}
            </select>
          </label>
        )}
        <label className="px-3 py-1.5 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 cursor-pointer">
          Add photos
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
          />
        </label>
        {pages.length > 0 && (
          <>
            <span className="text-sm text-gray-600">
              {reading ? `Reading… ${doneCount} of ${pages.length} photo(s) done` : `${doneCount} of ${pages.length} photo(s) read`}
            </span>
            <button onClick={resetAll} className="text-xs text-gray-500 hover:text-gray-800 underline">Clear all</button>
          </>
        )}
      </div>

      {saved && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Saved {saved.sheetsSaved} sheet(s): {saved.entriesSaved} casual(s) earned KSh {ksh(saved.totalEarned)},
          {' '}{saved.paymentsRecorded} payment(s) totalling KSh {ksh(saved.totalPaid)} recorded
          {saved.employeesCreated > 0 && `, ${saved.employeesCreated} new casual(s) added`}.
        </div>
      )}

      {pages.length > 0 && !sheets && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 gap-2">
            {pages.map((p) => (
              <button key={p.id} onClick={() => setZoom(p)} className="relative border rounded-md overflow-hidden text-left">
                <img src={p.url} alt={p.file.name} className="h-24 w-full object-cover" />
                <span className={`absolute bottom-0 inset-x-0 text-[10px] px-1 py-0.5 text-white ${
                  p.status === 'done' ? (p.result?.isCasualPaySheet ? 'bg-green-700' : 'bg-gray-500')
                    : p.status === 'error' ? 'bg-red-600' : 'bg-amber-500'}`}
                >
                  {p.status === 'done'
                    ? (p.result?.isCasualPaySheet ? `${p.result.rows.length} rows${p.result.heading.present ? ' · heading' : ''}` : 'not a pay sheet')
                    : p.status === 'error' ? 'failed' : p.status === 'reading' ? 'reading…' : 'waiting'}
                </span>
              </button>
            ))}
          </div>
          {pages.filter((p) => p.status === 'error').map((p) => (
            <div key={p.id} className="text-sm text-red-700 flex items-center gap-2">
              {p.file.name}: {p.error}
              <button className="underline" onClick={() => updatePage(p.id, { status: 'queued' })}>Try again</button>
            </div>
          ))}
          <div className="flex justify-end">
            <button
              onClick={startReview}
              disabled={reading || doneCount === 0}
              className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40"
            >
              Review {doneCount} page(s)
            </button>
          </div>
        </div>
      )}

      {sheets && sheets.length === 0 && (
        <p className="text-sm text-gray-600">None of the photos looked like a casual pay sheet.</p>
      )}

      {sheets && sheets.map((sheet, si) => {
        const check = checks[sheet.key];
        const imported = new Set(check?.alreadyImportedEmployeeIds ?? []);
        const includedTotal = sheet.rows.filter((r) => r.include).reduce((t, r) => t + (Number(r.amount) || 0), 0);
        const readTotal = sheet.rows.reduce((t, r) => t + (Number(r.amount) || 0), 0);
        const writtenTotal = sheet.writtenTotals.reduce((t, n) => t + n, 0);
        return (
          <div key={sheet.key} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 space-y-2">
              <div className="flex flex-wrap items-end gap-3">
                <span className="text-sm font-semibold text-gray-800">Sheet {si + 1}</span>
                <label className="text-xs text-gray-600">Activity
                  <input value={sheet.activity} onChange={(e) => updateSheet(sheet.key, { activity: e.target.value })}
                    className={`${inputClass} block w-56`} />
                </label>
                <label className="text-xs text-gray-600">Week (as written)
                  <input value={sheet.periodText} onChange={(e) => updateSheet(sheet.key, { periodText: e.target.value })}
                    className={`${inputClass} block w-56`} />
                </label>
                <label className="text-xs text-gray-600">Date (last day worked)
                  <input type="date" value={sheet.date} onChange={(e) => updateSheet(sheet.key, { date: e.target.value })}
                    className={`${inputClass} block ${sheet.date ? '' : 'border-red-400'}`} />
                </label>
                <div className="flex gap-1 ml-auto">
                  {sheet.pageIds.map((id) => (
                    <button key={id} onClick={() => setZoom(pageById[id])} title="View photo">
                      <img src={pageById[id]?.url} alt="" className="h-14 w-10 object-cover rounded border" />
                    </button>
                  ))}
                </div>
              </div>
              {check?.duplicateSheet && (
                <div className="text-xs text-red-700">
                  A session with this activity and date is already saved for this farm — this sheet may have been saved before.
                </div>
              )}
              {imported.size > 0 && (
                <div className="text-xs text-amber-700">
                  {imported.size} person(s) already have pay for this month from the monthly spreadsheet upload. Their rows
                  have been unticked so the work isn’t counted twice — tick them only if the spreadsheet didn’t include this sheet.
                </div>
              )}
              {sheet.notes.map((n) => <div key={n} className="text-xs text-gray-600">Note from reading: {n}</div>)}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-2 text-left w-8">Save</th>
                    <th className="px-2 py-2 text-left w-10">No.</th>
                    <th className="px-2 py-2 text-left">Written on sheet</th>
                    <th className="px-2 py-2 text-left">Employee</th>
                    <th className="px-2 py-2 text-left w-16">Days</th>
                    <th className="px-2 py-2 text-left w-28">Amount (KSh)</th>
                    <th className="px-2 py-2 text-left w-28">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sheet.rows.map((row) => {
                    const problem = rowProblem(row);
                    const alreadyImported = row.choice && row.choice !== NEW && imported.has(Number(row.choice));
                    const candidateIds = new Set(row.candidates.map((c) => c.employeeId));
                    return (
                      <tr key={row.id} className={!row.include ? 'bg-gray-50 text-gray-400' : row.uncertain ? 'bg-amber-50' : ''}>
                        <td className="px-2 py-1.5">
                          <input type="checkbox" checked={row.include}
                            onChange={(e) => updateRow(sheet.key, row.id, { include: e.target.checked })} />
                        </td>
                        <td className="px-2 py-1.5 text-gray-500">{row.lineNo ?? ''}</td>
                        <td className="px-2 py-1.5">
                          <div className="font-medium text-gray-800">{row.nameAsWritten || '—'}</div>
                          {row.uncertain && <div className="text-xs text-amber-700">Check: {row.uncertainReason || 'hard to read'}</div>}
                          {alreadyImported && <div className="text-xs text-amber-700">Already in the monthly spreadsheet for this month</div>}
                          {row.include && problem && <div className="text-xs text-red-600">{problem}</div>}
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={row.choice}
                            onChange={(e) => updateRow(sheet.key, row.id, { choice: e.target.value })}
                            className={`${inputClass} w-60 ${row.include && !row.choice ? 'border-red-400' : ''}`}>
                            <option value="">— choose —</option>
                            {row.candidates.length > 0 && (
                              <optgroup label="Closest names">
                                {row.candidates.map((c) => (
                                  <option key={c.employeeId} value={c.employeeId}>
                                    {c.name}{c.lsNumber ? ` (${c.lsNumber})` : ''}{c.active ? '' : ' — inactive'} · {Math.round(c.score * 100)}%
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="All casuals">
                              {sortedLabourers.filter((l) => !candidateIds.has(l.id)).map((l) => (
                                <option key={l.id} value={l.id}>{l.name}{l.lsNumber ? ` (${l.lsNumber})` : ''}</option>
                              ))}
                            </optgroup>
                            <option value={NEW}>+ Add as new casual…</option>
                          </select>
                          {row.choice === NEW && (
                            <div className="flex gap-1 mt-1">
                              <input placeholder="First name" value={row.newFirst}
                                onChange={(e) => updateRow(sheet.key, row.id, { newFirst: e.target.value })}
                                className={`${inputClass} w-28`} />
                              <input placeholder="Last name" value={row.newLast}
                                onChange={(e) => updateRow(sheet.key, row.id, { newLast: e.target.value })}
                                className={`${inputClass} w-28`} />
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-gray-600">{row.daysWorked}</td>
                        <td className="px-2 py-1.5">
                          <input value={row.amount} inputMode="decimal"
                            onChange={(e) => updateRow(sheet.key, row.id, { amount: e.target.value.replace(/[^0-9.]/g, '') })}
                            className={`${inputClass} w-24`} />
                          {row.rawAmount && row.rawAmount !== row.amount && (
                            <div className="text-[11px] text-gray-500">written: {row.rawAmount}</div>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={row.paid}
                              onChange={(e) => updateRow(sheet.key, row.id, { paid: e.target.checked })} />
                            {row.signMark || (row.paid ? 'signed' : 'not signed')}
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-600 flex flex-wrap gap-4">
              <span>To save: <b>KSh {ksh(includedTotal)}</b></span>
              <span>All rows read: KSh {ksh(readTotal)}</span>
              {writtenTotal > 0 && (
                <span className={writtenTotal === readTotal ? 'text-green-700' : 'text-amber-700'}>
                  Total written on sheet: KSh {ksh(writtenTotal)}{writtenTotal === readTotal ? ' ✓ matches' : ' — doesn’t match, check the amounts'}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {sheets && sheets.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {problems.length > 0 && <span className="text-sm text-red-700">{problems.join(' · ')}</span>}
          {error && <span className="text-sm text-red-700">{error}</span>}
          <button onClick={() => setSheets(null)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50">
            Back to photos
          </button>
          <button
            onClick={save}
            disabled={saving || problems.length > 0 || !sheets.some((s) => s.rows.some((r) => r.include))}
            className="px-4 py-2 text-sm rounded-lg bg-green-700 text-white hover:bg-green-800 disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {zoom && (
        <Modal title={zoom.file.name} onClose={() => setZoom(null)} maxWidth="max-w-4xl">
          <img src={zoom.url} alt={zoom.file.name} className="w-full" />
        </Modal>
      )}
    </div>
  );
}
