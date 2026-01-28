import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParserService } from './parser.service';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Line])],
  providers: [ParserService, BrandParserStrategy, LineParserStrategy],
  exports: [ParserService],
})
export class ParserModule {}
