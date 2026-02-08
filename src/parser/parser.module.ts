import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParserService } from './parser.service';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { LineParserStrategy } from './strategies/line-parser.strategy';
import { TobaccoParserStrategy } from './strategies/tobacco-parser.strategy';
import { Brand } from '../brands/brands.entity';
import { Line } from '../lines/lines.entity';
import { Tobacco } from '../tobaccos/tobaccos.entity';
import { Flavor } from '../flavors/flavors.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Brand, Line, Tobacco, Flavor])],
  providers: [
    ParserService,
    BrandParserStrategy,
    LineParserStrategy,
    TobaccoParserStrategy,
  ],
  exports: [ParserService],
})
export class ParserModule {}
