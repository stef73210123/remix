/**
 * Compact m/d/yy date format used throughout the municipal dashboard — full
 * month names and 4-digit years ate up too much width in meeting/event rows,
 * crowding out the actual content next to them.
 */
export function fmtDateShort(d: Date): string {
  if (isNaN(d.getTime())) return ''
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
}
