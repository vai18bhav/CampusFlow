/**
 * Utility function to download CSV data from backend export endpoints or raw JSON arrays.
 */

export const triggerCsvDownload = async (type = 'students', format = 'csv') => {
  try {
    const token = localStorage.getItem('cf_token') || localStorage.getItem('token');
    const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
    const finalUrl = rawBaseUrl.startsWith('http') && !rawBaseUrl.endsWith('/api') ? `${rawBaseUrl}/api` : rawBaseUrl;

    const response = await fetch(`${finalUrl}/export/${type}?format=${format}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Export failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Export CSV error:', error);
    alert(`CSV Download Failed: ${error.message}`);
    return false;
  }
};

/**
 * Client-side CSV download from any array of objects
 */
export const downloadArrayAsCsv = (dataArray, filename = 'export.csv') => {
  if (!dataArray || !dataArray.length) {
    alert('No data available to export.');
    return;
  }
  const headers = Object.keys(dataArray[0]);
  const csvRows = [headers.join(',')];

  for (const row of dataArray) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escaped = String(val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
