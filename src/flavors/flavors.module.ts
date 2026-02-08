import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlavorsController } from './flavors.controller';
import { FlavorsService } from './flavors.service';
import { FlavorsRepository } from './flavors.repository';
import { Flavor } from './flavors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Flavor])],
  controllers: [FlavorsController],
  providers: [FlavorsService, FlavorsRepository],
  exports: [FlavorsService, FlavorsRepository],
})
export class FlavorsModule {}
