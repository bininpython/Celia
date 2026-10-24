export type ColumnType = "text" | "currency" | "date" | "datetime" | "number" | "percent";
export type ReportColumn = { key: string; label: string; type?: ColumnType; width?: number };
export type ReportRow = Record<string, string | number | null>;
export type Report = {
  title: string;
  subtitle: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
};
