import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class FindLinesDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  brandId?: string;
}
