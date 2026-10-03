import { BadRequestException } from '@nestjs/common';

export const MAX_SEARCH_LENGTH = 128;
export const MAX_SEARCH_TERMS = 8;

const TERM_PATTERN = /[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu;

const CYRILLIC_TRANSLITERATION: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};
const CATALOG_SPELLING_ALIASES: Record<string, string[]> = {
  дарксайд: ['darkside'],
  кола: ['cola'],
};

export interface NormalizedSearch {
  terms: string[];
  hasVisibleInput: boolean;
}

export function normalizeSearch(search: string): NormalizedSearch {
  if (search.length > MAX_SEARCH_LENGTH) {
    throw new BadRequestException(
      `Search must be at most ${MAX_SEARCH_LENGTH} characters`,
    );
  }

  const normalizedSearch = search.normalize('NFKC');
  const terms = (normalizedSearch.match(TERM_PATTERN) ?? []).map((term) =>
    term.toLocaleLowerCase('ru-RU'),
  );
  const uniqueTerms = [
    ...new Map(terms.map((term) => [term.replaceAll('ё', 'е'), term])).values(),
  ];
  if (uniqueTerms.length > MAX_SEARCH_TERMS) {
    throw new BadRequestException(
      `Search must contain at most ${MAX_SEARCH_TERMS} terms`,
    );
  }

  return { terms: uniqueTerms, hasVisibleInput: search.trim().length > 0 };
}

export function searchSpellings(term: string): string[] {
  const original = term.normalize('NFKC').toLocaleLowerCase('ru-RU');
  const normalized = original.replaceAll('ё', 'е');
  const transliterated = [...normalized]
    .map((character) => CYRILLIC_TRANSLITERATION[character] ?? character)
    .join('');
  const transliteratedWithI = [...normalized]
    .map((character) =>
      character === 'й'
        ? 'i'
        : (CYRILLIC_TRANSLITERATION[character] ?? character),
    )
    .join('');
  const variants = exactSearchSpellings(original);
  if (transliterated !== normalized) {
    variants.push(transliterated);
    variants.push(transliteratedWithI);
    // Russian brand names commonly use c where phonetic transliteration gives k.
    variants.push(transliterated.replace(/k(?=[oa])/u, 'c'));
  }
  variants.push(...(CATALOG_SPELLING_ALIASES[normalized] ?? []));
  return [...new Set(variants)];
}

export function exactSearchSpellings(term: string): string[] {
  const normalized = term.normalize('NFKC').toLocaleLowerCase('ru-RU');
  return [
    ...new Set([
      normalized,
      normalized.replaceAll('ё', 'е'),
      normalized.replaceAll('е', 'ё'),
    ]),
  ];
}

export function compactSearchText(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е');
  return [...normalized]
    .map((character) => CYRILLIC_TRANSLITERATION[character] ?? character)
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Preserve ordinary Cyrillic words, but recognize mixed-script lookalikes
 * such as Jаgerbomb and ICE AСAI (where one character is Cyrillic).
 */
export function visualSearchText(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('ru-RU')
    .replaceAll('ё', 'е');
  return normalized.replace(/[\p{L}\p{N}]+/gu, (token) => {
    if (!/[a-z]/u.test(token) || !/[а-я]/u.test(token)) return token;
    const latinCount = token.match(/[a-z]/gu)?.length ?? 0;
    const cyrillicCount = token.match(/[а-я]/gu)?.length ?? 0;
    const visualMap =
      latinCount > cyrillicCount ? VISUAL_CYRILLIC : VISUAL_LATIN;
    return [...token]
      .map((character) => visualMap[character] ?? character)
      .join('');
  });
}

export function compactVisualSearchText(value: string): string {
  return compactSearchText(visualSearchText(value));
}

const VISUAL_CYRILLIC: Record<string, string> = {
  а: 'a',
  в: 'b',
  е: 'e',
  к: 'k',
  м: 'm',
  н: 'h',
  о: 'o',
  р: 'p',
  с: 'c',
  т: 't',
  у: 'y',
  х: 'x',
};

const VISUAL_LATIN: Record<string, string> = {
  a: 'а',
  b: 'в',
  c: 'с',
  e: 'е',
  h: 'н',
  k: 'к',
  m: 'м',
  o: 'о',
  p: 'р',
  r: 'р',
  t: 'т',
  x: 'х',
  y: 'у',
};
