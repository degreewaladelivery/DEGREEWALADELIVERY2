import { useState } from 'react';
import { Modal } from './Modal';
import { downloadCsv } from './csv';
import { parseItemsCsv, templateRows, type ParsedItemRow } from './bulkItems';
import type { BulkImportResult } from './api';

export function BulkUploadModal({
  groupLabel,
  templateFileName,
  onImport,
  onClose,
  onImported,
}: {
  groupLabel: string;
  templateFileName: string;
  onImport: (rows: ParsedItemRow[]) => Promise<BulkImportResult>;
  onClose: () => void;
  onImported: () => void;
}) {
  const [rows, setRows] = useState<ParsedItemRow[] | null>(null);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  const onPickFile = async (file: File) => {
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = parseItemsCsv(await file.text());
      setMissingColumns(parsed.missingColumns);
      setRows(parsed.rows);
    } catch {
      setError('Could not read that file');
      setRows(null);
    }
  };

  const validRows = rows?.filter((row) => row.errors.length === 0) ?? [];
  const badRows = rows?.filter((row) => row.errors.length > 0) ?? [];

  const onSubmit = async () => {
    setImporting(true);
    setError(null);
    try {
      setResult(await onImport(validRows));
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal title="Bulk Upload Items" onClose={onClose}>
      <div className="admin-form">
        {result ? (
          <>
            <p className="admin-empty" style={{ paddingTop: 0 }}>
              Imported successfully — <strong>{result.created} added</strong>,{' '}
              <strong>{result.updated} updated</strong>.
            </p>
            <div className="admin-form__actions">
              <button type="button" className="admin-btn admin-btn--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="admin-empty" style={{ paddingTop: 0 }}>
              Upload a CSV file. In Excel use <strong>File → Save As → CSV</strong>. Items are
              matched by barcode, or by name when there is no barcode — matches are updated, the
              rest are added. Images are not imported; add those from the item form.
            </p>

            <button
              type="button"
              className="admin-btn admin-btn--sm"
              onClick={() => downloadCsv(templateFileName, templateRows(groupLabel))}
            >
              ↓ Download template
            </button>

            <label className="admin-field">
              <span>CSV file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onPickFile(file);
                }}
              />
              {fileName && <em>{fileName}</em>}
            </label>

            {missingColumns.length > 0 && (
              <p className="admin-login__error">
                Missing required column{missingColumns.length > 1 ? 's' : ''}:{' '}
                {missingColumns.join(', ')}. Download the template to see the expected format.
              </p>
            )}

            {rows && missingColumns.length === 0 && (
              <>
                <p className="admin-empty" style={{ paddingTop: 0 }}>
                  <strong>{validRows.length}</strong> item{validRows.length === 1 ? '' : 's'} ready
                  to import
                  {badRows.length > 0 && (
                    <>
                      {' · '}
                      <strong>{badRows.length}</strong> row{badRows.length === 1 ? '' : 's'} will be
                      skipped
                    </>
                  )}
                </p>

                {badRows.length > 0 && (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Name</th>
                        <th>Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {badRows.slice(0, 20).map((row) => (
                        <tr key={row.rowNumber}>
                          <td data-label="Row">{row.rowNumber}</td>
                          <td data-label="Name">{row.name || <em>—</em>}</td>
                          <td data-label="Problem">{row.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {badRows.length > 20 && (
                  <p className="admin-empty">…and {badRows.length - 20} more skipped rows.</p>
                )}
              </>
            )}

            {error && <p className="admin-login__error">{error}</p>}

            <div className="admin-form__actions">
              <button type="button" className="admin-btn admin-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={onSubmit}
                disabled={importing || validRows.length === 0}
              >
                {importing ? 'Importing…' : `Import ${validRows.length} item${validRows.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
