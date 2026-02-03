import { IsString, IsUrl, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class FindTobaccoByUrlDto {
  @IsUrl()
  @IsString()
  @Transform(({ value }) => {
    // Strip query parameters and hash from URL
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  })
  @Matches(/^https:\/\/htreviews\.org\/tobaccos\/[^/]+\/[^/]+\/[^/]+$/, {
    message:
      'URL must match format: https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}',
  })
  url: string;
}
