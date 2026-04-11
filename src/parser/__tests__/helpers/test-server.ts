import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestServerConfig {
  /** If true, the second POST /postData request returns [] → incomplete loading */
  skipLastBatch?: boolean;
  /** If 'complete', serve line-page-complete.html instead of line-page-htmx.html */
  linePageFixture?: 'complete';
  /** Force HTTP status for all routes (e.g. 403) */
  forceStatus?: number;
}

export interface TestServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(__dirname, '../../__fixtures__');

function readFixture(filename: string): Buffer {
  return readFileSync(resolve(FIXTURES_DIR, filename));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function jsonResponse(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function htmlResponse(res: ServerResponse, html: Buffer, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ---------------------------------------------------------------------------
// HTMX batch generation
// ---------------------------------------------------------------------------

const TOTAL_COUNT = 29;

interface HtmxRequestBody {
  action?: string;
  data?: {
    id?: string;
    limit?: number;
    offset?: number;
    sort?: { s: string; d: string };
  };
}

function generateHtmxBatch(offset: number): object[] {
  const items: object[] = [];
  const batchSize = 5;

  for (let i = 0; i < batchSize; i++) {
    const itemNum = offset + i + 1; // 1-based
    if (itemNum > TOTAL_COUNT) break;
    items.push({
      id: String(198640 + itemNum),
      slug: `darkside/xperience/tobacco-${itemNum}`,
      name: `Tobacco ${itemNum}`,
      alt_name: `Вкус ${itemNum}`,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export async function startTestServer(
  config?: TestServerConfig,
): Promise<TestServer> {
  let postDataRequestCount = 0;

  const server: Server = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url || '/', `http://localhost`);
      const pathname = url.pathname;

      // If forceStatus is set, serve the error page for every request
      if (config?.forceStatus) {
        try {
          htmlResponse(
            res,
            readFixture('error-page-403.html'),
            config.forceStatus,
          );
        } catch {
          res.writeHead(config.forceStatus);
          res.end('Error');
        }
        return;
      }

      // -------------------------------------------------------------------
      // POST /postData — HTMX pagination endpoint
      // -------------------------------------------------------------------
      if (req.method === 'POST' && pathname === '/postData') {
        postDataRequestCount++;

        let body: HtmxRequestBody;
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          jsonResponse(res, { error: 'Invalid JSON' }, 400);
          return;
        }

        const offset = body.data?.offset ?? 0;

        // When skipLastBatch is enabled, the second+ request returns empty
        if (config?.skipLastBatch && postDataRequestCount > 1) {
          jsonResponse(res, []);
          return;
        }

        const items = generateHtmxBatch(offset);
        jsonResponse(res, items);
        return;
      }

      // Only handle GET from here on
      if (req.method !== 'GET') {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // -------------------------------------------------------------------
      // GET /tobaccos/darkside/xperience — Line page
      // -------------------------------------------------------------------
      if (pathname === '/tobaccos/darkside/xperience') {
        const fixture =
          config?.linePageFixture === 'complete'
            ? 'line-page-complete.html'
            : 'line-page-htmx.html';
        htmlResponse(res, readFixture(fixture));
        return;
      }

      // -------------------------------------------------------------------
      // GET /tobaccos/darkside/xperience/:tobacco — Tobacco detail page
      // -------------------------------------------------------------------
      const tobaccoDetailMatch = pathname.match(
        /^\/tobaccos\/darkside\/xperience\/.+$/,
      );
      if (tobaccoDetailMatch) {
        htmlResponse(res, readFixture('tobacco-detail-page.html'));
        return;
      }

      // -------------------------------------------------------------------
      // GET /tobaccos/ or GET /tobaccos — Brand listing page
      // -------------------------------------------------------------------
      if (pathname === '/tobaccos/' || pathname === '/tobaccos') {
        htmlResponse(res, readFixture('brand-page-with-lines.html'));
        return;
      }

      // -------------------------------------------------------------------
      // 404 — everything else
      // -------------------------------------------------------------------
      res.writeHead(404);
      res.end('Not Found');
    },
  );

  await new Promise<void>((r) => server.listen(0, r));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to get server address');
  }
  const port = address.port;

  return {
    url: `http://localhost:${port}`,
    port,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
