const HTREVIEWS_BASE_URL = 'https://htreviews.org/tobaccos';

export function buildBrandHtreviewsUrl(brandSlug: string): string {
  return `${HTREVIEWS_BASE_URL}/${brandSlug}`;
}

export function buildLineHtreviewsUrl(
  brandSlug: string,
  lineSlug: string,
): string {
  return `${HTREVIEWS_BASE_URL}/${brandSlug}/${lineSlug}`;
}

export function buildTobaccoHtreviewsUrl(
  brandSlug: string,
  lineSlug: string,
  tobaccoSlug: string,
): string {
  return `${HTREVIEWS_BASE_URL}/${brandSlug}/${lineSlug}/${tobaccoSlug}`;
}
