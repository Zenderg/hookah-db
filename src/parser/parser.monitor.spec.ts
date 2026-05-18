import { PARSER_DAILY_REFRESH_MONITOR_CONFIG } from './parser.service';

describe('Parser daily refresh monitor', () => {
  it('allows the full catalog parser to run longer than one hour', () => {
    expect(
      PARSER_DAILY_REFRESH_MONITOR_CONFIG.maxRuntime,
    ).toBeGreaterThanOrEqual(12 * 60);
  });
});
