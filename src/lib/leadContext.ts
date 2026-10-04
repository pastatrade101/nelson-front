export const contextLabel = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
/** Do not discard false, zero, unknown child ages, arrays or nested objects. */
export function contextRows(value: unknown, path = ''): Array<{ label: string; value: string }> {
  if (Array.isArray(value)) return value.length ? value.flatMap((item, i) => contextRows(item, `${path} · ${i + 1}`)) : [{ label: path, value: 'None selected' }];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => contextRows(item, path ? `${path} / ${contextLabel(key)}` : contextLabel(key)));
  return [{ label: path, value: value == null ? 'Not specified' : value === '' ? 'Not provided' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) }];
}
