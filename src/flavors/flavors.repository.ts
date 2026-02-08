import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flavor } from './flavors.entity';

@Injectable()
export class FlavorsRepository {
  constructor(
    @InjectRepository(Flavor)
    private readonly flavorRepository: Repository<Flavor>,
  ) {}

  async findAll(): Promise<Flavor[]> {
    return this.flavorRepository.find({
      order: { name: 'ASC' },
    });
  }
}
