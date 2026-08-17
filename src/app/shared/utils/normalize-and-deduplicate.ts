export function normalizeAndDeduplicate(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;

    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}
