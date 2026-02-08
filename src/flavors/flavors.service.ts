import { Injectable } from '@nestjs/common';
import { FlavorsRepository } from './flavors.repository';
import { Flavor } from './flavors.entity';

@Injectable()
export class FlavorsService {
  constructor(private readonly flavorsRepository: FlavorsRepository) {}

  async findAll(): Promise<Flavor[]> {
    return this.flavorsRepository.findAll();
  }
}
