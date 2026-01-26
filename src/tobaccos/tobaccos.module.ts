import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TobaccosController } from './tobaccos.controller';
import { TobaccosService } from './tobaccos.service';
import { TobaccosRepository } from './tobaccos.repository';
import { Tobacco } from './tobaccos.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tobacco])],
  controllers: [TobaccosController],
  providers: [TobaccosService, TobaccosRepository],
  exports: [TobaccosService],
})
export class TobaccosModule {}
