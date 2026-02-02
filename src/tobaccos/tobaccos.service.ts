import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { TobaccosRepository } from './tobaccos.repository';
import { Tobacco } from './tobaccos.entity';
import { FindTobaccosDto } from './dto/find-tobaccos.dto';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';

@Injectable()
export class TobaccosService {
  constructor(private readonly tobaccosRepository: TobaccosRepository) {}

  async findAll(
    query: FindTobaccosDto,
  ): Promise<PaginatedResponseDto<Tobacco>> {
    const { data, total } = await this.tobaccosRepository.findAll(query);
    const { page = 1, limit = 20 } = query;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<Tobacco> {
    const tobacco = await this.tobaccosRepository.findOne(id);
    if (!tobacco) {
      throw new Error('Tobacco not found');
    }
    return tobacco;
  }

  async findByUrl(url: string): Promise<Tobacco> {
    const { brandSlug, lineSlug, tobaccoSlug } = this.extractSlugsFromUrl(url);
    const tobacco = await this.tobaccosRepository.findBySlugs(
      brandSlug,
      lineSlug,
      tobaccoSlug,
    );

    if (!tobacco) {
      throw new NotFoundException(
        `Tobacco with URL '${url}' not found in database`,
      );
    }

    return tobacco;
  }

  private extractSlugsFromUrl(url: string): {
    brandSlug: string;
    lineSlug: string;
    tobaccoSlug: string;
  } {
    const match = url.match(/\/tobaccos\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (!match) {
      throw new BadRequestException('Invalid URL format');
    }
    return {
      brandSlug: match[1],
      lineSlug: match[2],
      tobaccoSlug: match[3],
    };
  }

  async getStatuses(): Promise<string[]> {
    return this.tobaccosRepository.getStatuses();
  }
}
