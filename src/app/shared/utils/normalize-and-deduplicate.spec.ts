import { describe, expect, it } from 'vitest';
import { normalizeAndDeduplicate } from './normalize-and-deduplicate';

describe('normalizeAndDeduplicate', () => {
  it('trims, lowercases, removes blanks and duplicates', () => {
    const input = [' Alpha ', 'alpha', 'BETA', ' ', null, undefined, 'gamma', 'beta'];

    expect(normalizeAndDeduplicate(input)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('returns an empty array for empty or invalid input', () => {
    expect(normalizeAndDeduplicate([])).toEqual([]);
    expect(normalizeAndDeduplicate([null, undefined, '   '])).toEqual([]);
  });
});
