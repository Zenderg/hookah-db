import { BadRequestException } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Brand } from './brands.entity';
import { BrandsRepository } from './brands.repository';
import { FindBrandsDto } from './dto/find-brands.dto';

/* eslint-disable @typescript-eslint/unbound-method */
describe('BrandsRepository sorting', () => {
  const queryBuilder = {
    leftJoin: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getRawMany: jest.fn(),
    getOne: jest.fn(),
  } as unknown as jest.Mocked<SelectQueryBuilder<Brand>>;
  const brandRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as jest.Mocked<Repository<Brand>>;
  const repository = new BrandsRepository(brandRepository);

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);
    brandRepository.createQueryBuilder.mockReturnValue(queryBuilder);
  });

  it.each([
    ['rating', 'brand.rating', 'DESC'],
    ['name', 'brand.name', 'ASC'],
  ] as const)(
    'maps %s to a fixed entity field and direction',
    async (sortBy, field, direction) => {
      await repository.findAll({
        sortBy,
        order: direction.toLowerCase() as 'asc' | 'desc',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(field, direction);
    },
  );

  it.each(['unsupported', 'toString', '__proto__'])(
    'rejects unsupported direct sort field %s before query creation',
    async (sortBy) => {
      await expect(
        repository.findAll({ sortBy } as FindBrandsDto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(brandRepository.createQueryBuilder).not.toHaveBeenCalled();
    },
  );

  it('rejects unsupported direct sort order before query creation', async () => {
    await expect(
      repository.findAll({ order: 'desc,unsupported' } as FindBrandsDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(brandRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});
