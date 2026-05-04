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
  maxNavigationsBeforeRotation?: number;
  navigationCounter?: { value: number };
  /**
   * Factory callback to rotate the entire BrowserContext after crash or periodic rotation.
   * MUST close the old context, create a new one via the browser, update the caller's
   * context + page references as a side effect, and return the new Page.
   * Errors during context close MUST be logged, not silently swallowed.
   */
  recreateContext?: () => Promise<Page>;
}

const logger = new Logger('HttpChecker');

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPageCrashed(error: unknown): boolean {
  return error instanceof Error && error.message.includes('Page crashed');
}

function isNavigationTimeout(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('Timeout') &&
    error.message.includes('exceeded')
  );
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

  let currentPage = page;
  let recoveryAttempts = 0;
  const maxRecoveryAttempts = 1;

  let result: NavigationResult = { ok: false, status: 0, url };

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Periodic rotation (before navigation)
    if (options?.maxNavigationsBeforeRotation && options?.navigationCounter) {
      if (
        options.navigationCounter.value >= options.maxNavigationsBeforeRotation
      ) {
        if (options.recreateContext) {
          logger.log(
            `Rotating browser context after ${options.navigationCounter.value} navigations`,
          );
          currentPage = await options.recreateContext();
          options.navigationCounter.value = 0;
        }
      }
    }

    try {
      const response = await currentPage.goto(url, {});

      if (response) {
        result = checkResponse(response);
      } else {
        result = { ok: false, status: 0, url };
        logger.error(`No response from ${url}`);
      }

      // Increment navigation counter on any goto completion
      if (options?.navigationCounter) {
        options.navigationCounter.value++;
      }

      if (result.ok) return result;
      if (!retryOnStatus.includes(result.status)) return result;

      if (attempt < retries) {
        const ms = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        await delay(ms);
      }
    } catch (error) {
      const canRecover =
        (isPageCrashed(error) || isNavigationTimeout(error)) &&
        !!options?.recreateContext &&
        recoveryAttempts < maxRecoveryAttempts;

      if (canRecover && options?.recreateContext) {
        recoveryAttempts++;
        logger.warn(
          `Recovering from ${isPageCrashed(error) ? 'page crash' : 'navigation timeout'} — rotating browser context`,
        );
        currentPage = await options.recreateContext();
        if (options?.navigationCounter) {
          options.navigationCounter.value = 0;
        }
        continue; // retry navigation on new page without consuming attempt
      }
      throw error;
    }
  }

  return result;
}
