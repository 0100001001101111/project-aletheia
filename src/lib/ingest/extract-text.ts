/**
 * Server-side text extraction for uploaded files
 * Supports PDF, XLSX/XLS, CSV, TXT, JSON
 */

import { PDFParse } from 'pdf-parse';
import ExcelJS from 'exceljs';

export async function extractText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  switch (mimeType) {
    case 'application/pdf':
      return extractPdfText(buffer);

    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return await extractXlsxText(buffer);

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

async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const lines: string[] = [];

  workbook.eachSheet((worksheet) => {
    lines.push(`--- Sheet: ${worksheet.name} ---`);
    worksheet.eachRow((row) => {
      const values = row.values as (ExcelJS.CellValue)[];
      // ExcelJS row.values is 1-indexed (index 0 is undefined)
      const cells = values.slice(1).map(v => v != null ? String(v) : '');
      lines.push(cells.join('\t'));
    });
  });

  return lines.join('\n');
}
