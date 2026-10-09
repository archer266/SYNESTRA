export type ByteRange = { start: number; end: number };
// A deliberately single-range endpoint. Invalid/multipart requests receive 416.
export function parseRange(header: string | null, size: number): ByteRange | null | 'invalid' {
  if (!header) return null;
  if (!Number.isSafeInteger(size) || size <= 0) return 'invalid';
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return 'invalid';
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return 'invalid';
  if (first === null) return last && last > 0 ? { start: Math.max(0, size-last), end: size-1 } : 'invalid';
  if (first >= size || (last !== null && last < first)) return 'invalid';
  return { start: first, end: Math.min(last ?? size-1, size-1) };
}
