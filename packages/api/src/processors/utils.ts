/**
 * Normalizes a MIME type string by converting it to lowercase and stripping
 * any parameters (e.g., "text/plain; charset=utf-8" becomes "text/plain").
 *
 * @param mime The raw MIME type string
 * @returns The normalized MIME type
 */
export function normalizeMimeType(mime: string): string {
  if (!mime) return '';
  return mime.split(';')[0].trim().toLowerCase();
}
