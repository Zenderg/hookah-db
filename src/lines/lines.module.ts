import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinesController } from './lines.controller';
import { LinesService } from './lines.service';
import { LinesRepository } from './lines.repository';
import { Line } from './lines.entity';
import { TobaccosModule } from '../tobaccos/tobaccos.module';

@Module({
  imports: [TypeOrmModule.forFeature([Line]), TobaccosModule],
  controllers: [LinesController],
  providers: [LinesService, LinesRepository],
  exports: [LinesService],
})
export class LinesModule {}
