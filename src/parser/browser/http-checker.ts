import type { Page, Response } from 'playwright';
import { Logger } from '@nestjs/common';

export interface NavigationResult {
  ok: boolean;
  status: number;
  url: string;
}

export interface NavigateOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
}

const logger = new Logger('HttpChecker');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function checkResponse(response: Response): NavigationResult {
  const status = response.status();
  const url = response.url();

  if (status !== 200) {
    logger.warn(`Non-200 response: ${status} from ${url}`);
  }

  return {
    ok: status === 200,
    status,
    url,
  };
}

export async function navigateWithCheck(
  page: Page,
  url: string,
  options?: NavigateOptions,
): Promise<NavigationResult> {
  const retries = options?.retries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 5000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;
  const retryOnStatus = options?.retryOnStatus ?? [429];

  let result: NavigationResult = { ok: false, status: 0, url };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await page.goto(url);

    if (response) {
      result = checkResponse(response);
    } else {
      result = { ok: false, status: 0, url };
      logger.error(`No response from ${url}`);
    }

    if (result.ok) return result;
    if (!retryOnStatus.includes(result.status)) return result;

    if (attempt < retries) {
      const ms = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await delay(ms);
    }
  }

  return result;
}
