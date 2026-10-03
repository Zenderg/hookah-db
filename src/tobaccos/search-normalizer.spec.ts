import { BadRequestException } from '@nestjs/common';
import {
  MAX_SEARCH_LENGTH,
  MAX_SEARCH_TERMS,
  compactSearchText,
  compactVisualSearchText,
  normalizeSearch,
  searchSpellings,
  visualSearchText,
} from './search-normalizer';

describe('tobacco search normalization', () => {
  it('normalizes Unicode and case, deduplicates ё/е variants, and preserves compounds', () => {
    expect(normalizeSearch('  ЕЖЁВИКА  APPLE-MINT 1.5 apple-mint ')).toEqual({
      terms: ['ежёвика', 'apple-mint', '1.5'],
      hasVisibleInput: true,
    });
    expect(normalizeSearch('Ёж еж').terms).toEqual(['еж']);
  });

  it('provides deterministic Cyrillic spellings for phonetic catalog matches', () => {
    expect(searchSpellings('дарксайд')).toEqual([
      'дарксайд',
      'darksayd',
      'darksaid',
      'darkside',
    ]);
    expect(searchSpellings('кола')).toEqual(['кола', 'kola', 'cola']);
  });

  it('normalizes mixed alphabets while preserving ordinary Cyrillic tokens', () => {
    expect(compactSearchText('МОRЕ ²')).toBe('more2');
    expect(compactSearchText('море')).toBe('more');
    expect(compactVisualSearchText('Jаgerbomb')).toBe('jagerbomb');
    expect(compactVisualSearchText('ICE AСAI')).toBe('iceacai');
    expect(compactVisualSearchText('Cочный')).toBe('sochnyy');
    expect(compactVisualSearchText('sochnyy')).toBe('sochnyy');
    expect(visualSearchText('Darkside Черника')).toBe('darkside черника');
    expect(visualSearchText('Cочный')).toBe('сочный');
  });

  it('rejects oversized query strings and excessive term counts', () => {
    expect(() => normalizeSearch('x'.repeat(MAX_SEARCH_LENGTH + 1))).toThrow(
      BadRequestException,
    );
    expect(() =>
      normalizeSearch(
        Array.from(
          { length: MAX_SEARCH_TERMS + 1 },
          (_, index) => `token${index}`,
        ).join(' '),
      ),
    ).toThrow(BadRequestException);
  });
});
