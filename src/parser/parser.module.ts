import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParserService } from './parser.service';
import { BrandParserStrategy } from './strategies/brand-parser.strategy';
import { Brand } from '../brands/brands.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Brand])],
  providers: [ParserService, BrandParserStrategy],
  exports: [ParserService],
})
export class ParserModule {}
