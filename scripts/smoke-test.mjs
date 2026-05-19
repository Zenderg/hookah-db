const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const apiKey = process.env.SMOKE_API_KEY ?? 'local-dev-key';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();

  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const health = await request('/health');
  assert(
    health.response.ok,
    `/health failed with ${health.response.status}: ${JSON.stringify(health.body)}`,
  );

  const headers = { 'X-API-Key': apiKey };
  const brands = await request('/brands?limit=1', { headers });
  assert(
    brands.response.ok,
    `/brands failed with ${brands.response.status}: ${JSON.stringify(brands.body)}`,
  );
  assert(Array.isArray(brands.body.data), '/brands response must contain data[]');
  assert(
    typeof brands.body.meta?.total === 'number',
    '/brands response must contain meta.total',
  );

  const tobaccos = await request('/tobaccos?limit=1', { headers });
  assert(
    tobaccos.response.ok,
    `/tobaccos failed with ${tobaccos.response.status}: ${JSON.stringify(tobaccos.body)}`,
  );
  assert(
    Array.isArray(tobaccos.body.data),
    '/tobaccos response must contain data[]',
  );
  assert(
    typeof tobaccos.body.meta?.total === 'number',
    '/tobaccos response must contain meta.total',
  );

  console.log(`Smoke test passed for ${baseUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
