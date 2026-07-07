// Library-agnostic contract for turning tabular data into a downloadable
// spreadsheet file. Consumers (e.g. the analytics dashboard export) only
// depend on these types, never on a concrete spreadsheet library. Swapping
// the underlying library later means adding a new adapter that implements
// `WorkbookWriter` and pointing the caller's factory at it — no changes to
// the code that builds the `WorkbookDocument`.

export type WorkbookCellValue = string | number | Date | null;

export type WorkbookRow = WorkbookCellValue[];

export type WorkbookColumn = {
  header: string;
  key: string;
  width?: number;
  /**
   * Adapter-agnostic hint for how a column's cells should be formatted
   * (currency, date, etc). Adapters are free to ignore hints they cannot
   * express in their own format.
   */
  format?: 'currency' | 'integer' | 'date' | 'text';
};

export type WorkbookSheet = {
  name: string;
  columns: WorkbookColumn[];
  rows: WorkbookRow[];
  /** Free-form rows rendered above the header row, e.g. export metadata. */
  metadataRows?: WorkbookRow[];
};

export type WorkbookDocument = {
  sheets: WorkbookSheet[];
};

export interface WorkbookWriter {
  write(document: WorkbookDocument): Promise<Blob>;
}
