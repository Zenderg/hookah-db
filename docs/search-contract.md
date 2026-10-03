# Tobacco Search Contract

Purpose: this document defines the supported behavior and query plan for tobacco
name search. Stable API behavior belongs here; implementation workflow belongs
in `development.md`, and broader module boundaries belong in `architecture.md`.

## Searchable fields and terms

`GET /tobaccos?search=` searches only tobacco, brand, and line names. Flavor
names are available through the explicit `flavors` filter and never contribute
to text search. Every query term must match at least one of the three name
fields, so a query such as `cola darkside` can match `cola` in the tobacco name
and `darkside` in the brand name.

The repository normalizes Unicode compatibility forms, case, and `ё`/`е`, then
deduplicates repeated terms. It preserves meaningful decimals and compounds
such as `1.5` and `apple-mint`. Whitespace means an ordinary browse request. A
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
Search also accepts deterministic Cyrillic transliteration variants and the
known catalog spellings `дарксайд` → `Darkside` and `кола` → `Cola`. Conservative
fuzzy matching accepts one edit for terms of up to five characters and two
edits for longer terms, after a trigram candidate lookup. Terms shorter than
four characters do not use fuzzy matching. Approximate results rank after
strict matches. When the returned page contains one,
`meta.search.matchQuality` is `approximate` and
`meta.search.approximateResultIds` lists the affected tobacco IDs; exact pages
keep the existing response shape.

## Ranking and pagination

Ranking uses one complete-name tier for a full tobacco, brand, or line name and
for a complete brand/tobacco or brand/line/tobacco combination. Before that
tier, results matching every term strictly rank ahead of results that need a
fuzzy or stopword fallback. After complete-name matches, whole-query prefixes
rank ahead of full-text relevance; remaining ties follow the requested catalog
sort, then `ratingsCount` descending, then tobacco UUID ascending for stable
pagination.

Catalog filters, including the AND flavor filter, apply before the exact total
and page are computed. Flavor requirements use one grouped tobacco-ID subquery
over the junction table and a semijoin, so flavor rows cannot multiply catalog
IDs; flavor rows are loaded only for the selected page. Search first
builds distinct tobacco ID sets for each term from indexed tobacco, brand, and
line predicates, then intersects those sets to enforce cross-field AND. The
count, ordered page IDs, and relation hydration run in one read-only
repeatable-read transaction so they observe one catalog snapshot.

## Database requirements

Migration `OptimizeCatalogSearch1791026400000` installs PostgreSQL `pg_trgm`
and `fuzzystrmatch` and adds simple-text GIN, compact-name trigram, and
word-boundary-preserving trigram indexes to tobacco, brand, and line names. The
existing Russian and English text indexes remain in use. Search reads the
current related name rows directly, so parser imports and ordinary catalog
edits do not need separate alias-index maintenance.
