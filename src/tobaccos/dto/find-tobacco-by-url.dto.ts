import { IsString, IsUrl, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindTobaccoByUrlDto {
  @IsUrl()
  @IsString()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    // Strip query parameters and hash from URL
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      // Let class-validator report malformed URLs as a validation error.
      return value;
    }
  })
  @Matches(/^https:\/\/htreviews\.org\/tobaccos\/[^/]+\/[^/]+\/[^/]+$/, {
    message:
      'URL must match format: https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}',
  })
  url: string;
}
