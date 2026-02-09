/**
 * Server-side text extraction for uploaded files
 * Supports PDF, XLSX/XLS, CSV, TXT, JSON
 */

import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdfText(buffer);

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return extractXlsxText(buffer);

    case 'text/csv':
      return buffer.toString('utf-8');

    case 'text/plain':
    case 'application/json':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await pdf.getText();
  return result.text;
}

function extractXlsxText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const lines: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
    lines.push(`--- Sheet: ${sheetName} ---`);
    lines.push(rows);
  }

  return lines.join('\n');
}
