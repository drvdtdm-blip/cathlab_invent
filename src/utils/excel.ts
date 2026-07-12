import * as XLSX from 'xlsx';

/**
 * Utility to export an array of records to an Excel (.xlsx) spreadsheet.
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  headers: { key: string; label: string }[],
  filename: string
) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Map the raw data objects into custom column keys matching the header labels
  const mappedData = data.map(item => {
    const row: Record<string, any> = {};
    headers.forEach(h => {
      row[h.label] = item[h.key] === undefined || item[h.key] === null ? '' : item[h.key];
    });
    return row;
  });

  // Create a worksheet from the mapped JSON records
  const worksheet = XLSX.utils.json_to_sheet(mappedData);

  // Generate a workbook container
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

  // Output and download the Excel file
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);
}
