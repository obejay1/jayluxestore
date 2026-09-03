export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Prevent spreadsheet applications from interpreting untrusted text as a
 * formula when opening CSV exports. The leading apostrophe is displayed as
 * text by common spreadsheet applications and neutralises =, +, -, @, tabs
 * and carriage-return formula prefixes.
 */
export function neutralizeSpreadsheetFormula(value: unknown): string {
  const text = String(value ?? '');
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function escapeCsv(value: unknown): string {
  const safe = neutralizeSpreadsheetFormula(value);
  return `"${safe.replaceAll('"', '""')}"`;
}
