# Tobacco Search Contract

Purpose: this document defines the supported behavior and query plan for tobacco
name search. Stable API behavior belongs here; implementation workflow belongs
in `development.md`, and broader module boundaries belong in `architecture.md`.

## Searchable fields and terms

`GET /tobaccos?search=` searches tobacco, brand, and line names, with current
slugs as an indexed auxiliary source. Flavor names are available through the
explicit `flavors` filter and never contribute to text search. Every query
term must match at least one of the tobacco, brand, or line name/slug fields,
so a query such as `cola darkside` can match `cola` in the tobacco name and
`darkside` in the brand name.

The repository normalizes Unicode compatibility forms, case, and `ё`/`е`, then
deduplicates repeated terms. It preserves meaningful decimals and compounds
such as `1.5` and `apple-mint`. Deterministic Cyrillic transliterations and
known spellings such as `дарксайд` → `Darkside` and `кола` → `Cola` count as
strict recognized equivalents. Visual
Cyrillic/Latin lookalikes are recognized only inside a token containing both
alphabets; the majority alphabet sets the fold direction. This covers
`Jаgerbomb`, `ICE AСAI`, and `Cочный`, while adjacent pure Cyrillic words retain
their ordinary matching. Repaired mixed tokens are phonetic-folded into the
same indexed key as their query spelling. Whitespace means an ordinary browse request. A
nonempty query that contains no searchable terms returns an empty page and an
exact total of zero. Search input is limited to 128 characters and eight
distinct terms; the HTTP DTO and repository both enforce the character limit,
and the repository enforces both limits for direct callers.

PostgreSQL simple text search preserves literal stopwords, while Russian and
English configurations add stemming. For a multi-term query that includes a
common stopword and at least one other term, the repository can ignore the
stopword as an approximate fallback. A catalog name containing that word still
matches it literally and ranks as a strict result. An all-stopword query never
falls back to the whole catalog.

Prefix matches work at token boundaries. A separate complete-query compact
match supports joined and separated spellings such as `black burn` ↔ `Blackburn`
and `icecream` ↔ `Vanilla Ice Cream`. Joined sequences may start at any actual
word boundary and may end with a prefix of the last token; they cannot start in
the middle of an unrelated word, so `col` does not match `Chocolate`.
Conservative fuzzy matching accepts one edit for terms of up to five
characters and two edits for longer terms, after a trigram candidate lookup. Terms shorter than
four characters do not use fuzzy matching. Approximate results rank after
strict matches; whole-token matches rank ahead of complete normalized names,
which rank ahead of token prefixes. When the returned page contains an actual edit-distance or
stopword-fallback match,
`meta.search.matchQuality` is `approximate` and
`meta.search.approximateResultIds` lists the affected tobacco IDs; exact pages
keep the existing response shape.

## Ranking and pagination

Ranking first places results matching every term strictly ahead of results
that need a fuzzy or stopword fallback. Whole-token matches then rank ahead of
complete normalized tobacco, brand, or line names and complete brand/tobacco or
brand/line/tobacco combinations. Whole-query prefixes follow, then full-text
relevance; remaining ties follow the requested catalog sort, then
`ratingsCount` descending, then tobacco UUID ascending for stable pagination.

Catalog filters, including the AND flavor filter, apply before the exact total
and page are computed. Flavor requirements use one grouped tobacco-ID subquery
over the junction table and a semijoin, so flavor rows cannot multiply catalog
IDs; flavor rows are loaded only for the selected page. Search matches indexed
tobacco fields directly and pre-aggregates brand and line matches once per
related entity before mapping them to tobacco IDs. It intersects per-term ID
sets to enforce cross-field AND. One materialized filtered-ID set supplies both
the exact total and ordered page IDs; relation hydration follows in the same
read-only repeatable-read transaction so all results observe one catalog
snapshot.

## Database requirements

Migration `OptimizeCatalogSearch1791026400000` installs PostgreSQL `pg_trgm`
and `fuzzystrmatch` and adds simple-text GIN, compact-name trigram, and
word-boundary-preserving trigram indexes to tobacco, brand, and line names.
Migration `AddCrossAlphabetCatalogSearch1791027000000` adds immutable SQL
normalization functions and matching indexes for Cyrillic transliteration,
mixed-script visual tokens, slugs, and NFKC text search. The existing Russian
and English text indexes remain in use. Search reads current names and slugs
directly, so parser imports and ordinary catalog edits do not need separate
alias-index maintenance.
