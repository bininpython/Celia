import "server-only";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatDate, formatDateTime } from "@/lib/dates";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { Report, ReportColumn, ReportRow } from "./types";

export function formatCell(col: ReportColumn, value: ReportRow[string]): string {
  if (value === null || value === undefined || value === "") return "";
  switch (col.type) {
    case "currency":
      return formatCurrency(Number(value));
    case "date":
      return formatDate(String(value));
    case "datetime":
      return formatDateTime(String(value));
    case "number":
      return formatNumber(Number(value));
    case "percent":
      return formatPercent(Number(value));
    default:
      return String(value);
  }
}

/** CSV com separador ";" e BOM (compatível com Excel em pt-BR). */
export function toCsv(report: Report): string {
  const esc = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const raw = (col: ReportColumn, v: ReportRow[string]) => {
    if (v === null || v === undefined) return "";
    if (col.type === "currency" || col.type === "number") return String(v).replace(".", ",");
    if (col.type === "date" || col.type === "datetime") return formatCell(col, v);
    return String(v);
  };
  const lines = [report.columns.map((c) => esc(c.label)).join(";")];
  for (const r of report.rows) lines.push(report.columns.map((c) => esc(raw(c, r[c.key] ?? null))).join(";"));
  return "﻿" + lines.join("\r\n");
}

export async function toXlsx(report: Report, gymName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = gymName;
  wb.created = new Date();
  const ws = wb.addWorksheet(report.title.slice(0, 31));
  ws.addRow([gymName]).font = { bold: true, size: 13 };
  ws.addRow([`${report.title} — ${report.subtitle}`]).font = { size: 11, color: { argb: "FF646A73" } };
  ws.addRow([]);
  const header = ws.addRow(report.columns.map((c) => c.label));
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF651C" } };
  });
  const toValue = (c: ReportColumn, v: ReportRow[string]) => {
    if (v === null || v === undefined) return null;
    if (c.type === "currency" || c.type === "number" || c.type === "percent") return Number(v);
    if (c.type === "date" && typeof v === "string" && v.length === 10) {
      const [y, m, d] = v.split("-").map(Number);
      return new Date(Date.UTC(y!, m! - 1, d!));
    }
    if (c.type === "datetime") return formatDateTime(String(v));
    return String(v);
  };
  for (const r of report.rows) ws.addRow(report.columns.map((c) => toValue(c, r[c.key] ?? null)));
  if (report.totals) {
    const t = ws.addRow(report.columns.map((c) => toValue(c, report.totals![c.key] ?? null)));
    t.font = { bold: true };
  }
  report.columns.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.width ?? (c.type === "text" || !c.type ? 32 : 16);
    if (c.type === "currency") col.numFmt = '"R$" #,##0.00';
    if (c.type === "date") col.numFmt = "dd/mm/yyyy";
    if (c.type === "percent") col.numFmt = "0.0%";
  });
  ws.views = [{ state: "frozen", ySplit: 4 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function toPdf(report: Report, gymName: string): Buffer {
  const landscape = report.columns.length > 5;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(255, 101, 28);
  doc.rect(0, 0, width, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(gymName, 40, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`${report.title} — ${report.subtitle}`, 40, 52);
  doc.text(`Gerado em ${formatDateTime(new Date().toISOString())}`, width - 40, 36, { align: "right" });
  const right = new Set(report.columns.flatMap((c, i) => (c.type === "currency" || c.type === "number" || c.type === "percent" ? [i] : [])));
  autoTable(doc, {
    startY: 66,
    head: [report.columns.map((c) => c.label)],
    body: report.rows.map((r) => report.columns.map((c) => formatCell(c, r[c.key] ?? null))),
    foot: report.totals ? [report.columns.map((c) => formatCell(c, report.totals![c.key] ?? null))] : undefined,
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 4 },
    headStyles: { fillColor: [255, 101, 28], textColor: 255 },
    footStyles: { fillColor: [244, 244, 245], textColor: 30, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: Object.fromEntries([...right].map((i) => [i, { halign: "right" as const }])),
    didDrawPage: () => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${doc.getNumberOfPages()}`, width - 40, h - 20, { align: "right" });
    },
  });
  if (!report.rows.length) {
    doc.setFontSize(10);
    doc.text("Nenhum registro no período.", 40, 110);
  }
  return Buffer.from(doc.output("arraybuffer"));
}
