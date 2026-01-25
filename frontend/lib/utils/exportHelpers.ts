/**
 * Export utilities for generating various file formats
 * Supports Excel, CSV, and PDF exports
 */

import * as XLSX from 'xlsx';

export interface ExportColumn {
  key: string;
  label: string;
  width?: number;
  format?: (value: unknown) => string;
}

export interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  title?: string;
  includeTimestamp?: boolean;
}

/**
 * Export data to Excel (.xlsx) format
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { filename, columns, data, title, includeTimestamp = true } = options;

  // Prepare data for export
  const exportData = data.map((row) => {
    const exportRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value = row[col.key];
      exportRow[col.label] = col.format ? col.format(value) : value;
    });
    return exportRow;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  const colWidths = columns.map((col) => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;

  // Add title row if provided
  if (title) {
    XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });
    XLSX.utils.sheet_add_json(ws, exportData, { origin: 'A2', skipHeader: false });
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Generate filename with timestamp
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 10)}`
    : '';
  const finalFilename = `${filename}${timestamp}.xlsx`;

  // Write file
  XLSX.writeFile(wb, finalFilename);
}

/**
 * Export data to CSV format
 */
export async function exportToCSV(options: ExportOptions): Promise<void> {
  const { filename, columns, data, includeTimestamp = true } = options;

  // Prepare CSV content
  const headers = columns.map((col) => col.label).join(',');
  const rows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.key];
        const formattedValue = col.format ? col.format(value) : value;
        // Escape commas and quotes
        const escaped = String(formattedValue || '')
          .replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(',');
  });

  const csv = [headers, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 10)}`
    : '';
  const finalFilename = `${filename}${timestamp}.csv`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to PDF format
 * Note: This is a basic implementation. For production, consider using jsPDF or similar libraries
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { filename, columns, data, title, includeTimestamp = true } = options;

  // Create HTML table
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title || filename}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .timestamp { color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
  `;

  if (title) {
    html += `<h1>${title}</h1>`;
  }

  html += '<table><thead><tr>';
  columns.forEach((col) => {
    html += `<th>${col.label}</th>`;
  });
  html += '</tr></thead><tbody>';

  data.forEach((row) => {
    html += '<tr>';
    columns.forEach((col) => {
      const value = row[col.key];
      const formattedValue = col.format ? col.format(value) : value;
      html += `<td>${formattedValue || ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  if (includeTimestamp) {
    html += `<p class="timestamp">Generated on: ${new Date().toLocaleString()}</p>`;
  }

  html += '</body></html>';

  // Create blob and download
  const blob = new Blob([html], { type: 'text/html' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const timestamp = includeTimestamp
    ? `_${new Date().toISOString().slice(0, 10)}`
    : '';
  const finalFilename = `${filename}${timestamp}.html`;

  link.setAttribute('href', url);
  link.setAttribute('download', finalFilename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format helpers
 */
export const formatters = {
  currency: (value: unknown) => {
    const num = Number(value);
    return isNaN(num) ? '-' : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  },
  date: (value: unknown) => {
    if (!value) return '-';
    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
  },
  datetime: (value: unknown) => {
    if (!value) return '-';
    const date = new Date(value as string | number | Date);
    return isNaN(date.getTime()) ? '-' : date.toLocaleString();
  },
  percentage: (value: unknown) => {
    const num = Number(value);
    return isNaN(num) ? '-' : `${num.toFixed(2)}%`;
  },
  number: (value: unknown) => {
    const num = Number(value);
    return isNaN(num) ? '-' : num.toLocaleString();
  },
  boolean: (value: unknown) => {
    return value ? 'Yes' : 'No';
  },
  truncate: (maxLength: number) => (value: unknown) => {
    const str = String(value || '');
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  },
};

/**
 * Export component wrapper
 */
export interface ExportButtonProps {
  format: 'excel' | 'csv' | 'pdf';
  options: ExportOptions;
  children?: React.ReactNode;
  className?: string;
}

export function exportData(format: 'excel' | 'csv' | 'pdf', options: ExportOptions): Promise<void> {
  switch (format) {
    case 'excel':
      return exportToExcel(options);
    case 'csv':
      return exportToCSV(options);
    case 'pdf':
      return exportToPDF(options);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}
