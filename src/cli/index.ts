#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

const program = new Command();

program
  .name('hookah-db-cli')
  .description('CLI for managing Hookah Tobacco Database API')
  .version('0.0.1');

// TODO: Implement CLI commands for API key management
// Commands: create, delete, list, stats

program.parse();
