/**
 * Utility to export an array of records to a CSV file
 * Handles escaping commas, double quotes, and newlines.
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  headers: { key: string; label: string }[],
  filename: string
) {
  if (!data || !data.length) {
    alert("No data available to export.");
    return;
  }

  // Create CSV Header line
  const headerLine = headers.map(h => `"${String(h.label).replace(/"/g, '""')}"`).join(',');

  // Create rows
  const rows = data.map(item => {
    return headers.map(h => {
      const val = item[h.key];
      const valStr = val === undefined || val === null ? '' : String(val);
      // Escape double quotes and wrap in quotes
      return `"${valStr.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headerLine, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
