import { IsString, IsUrl, Matches } from 'class-validator';

export class FindTobaccoByUrlDto {
  @IsUrl()
  @IsString()
  @Matches(/^https:\/\/htreviews\.org\/tobaccos\/[^/]+\/[^/]+\/[^/]+$/, {
    message:
      'URL must match format: https://htreviews.org/tobaccos/{brand}/{line}/{tobacco}',
  })
  url: string;
}
