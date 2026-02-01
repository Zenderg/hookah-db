#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiKeysService } from '../api-keys/api-keys.service';
import { ParserService } from '../parser/parser.service';

const program = new Command();

program
  .name('hookah-db-cli')
  .description('CLI for managing Hookah Tobacco Database API')
  .version('0.0.1');

// Helper function to initialize NestJS app and get service
async function getApiKeysService(): Promise<{
  service: ApiKeysService;
  app: any;
}> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ApiKeysService);
  return { service, app };
}

// Helper function to initialize NestJS app and get parser service
async function getParserService(): Promise<{
  service: ParserService;
  app: any;
}> {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(ParserService);
  return { service, app };
}

// Create API key command
program
  .command('create <name>')
  .description('Create a new API key')
  .action(async (name) => {
    let app: any = null;
    try {
      const { service, app: appContext } = await getApiKeysService();
      app = appContext;
      const apiKey = await service.createApiKey(name);

      console.log('✅ API key created successfully!');
      console.log('');
      console.log('Key Details:');
      console.log(`  ID: ${apiKey.id}`);
      console.log(`  Name: ${apiKey.name}`);
      console.log(`  Key: ${apiKey.key}`);
      console.log(`  Active: ${apiKey.isActive}`);
      console.log('');
      console.log(
        '⚠️  Save this key securely. You will not be able to see it again.',
      );
    } catch (error) {
      console.error(
        '❌ Error creating API key:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

// Delete API key command
program
  .command('delete <id>')
  .description('Delete an API key by ID')
  .action(async (id) => {
    let app: any = null;
    try {
      const { service, app: appContext } = await getApiKeysService();
      app = appContext;
      await service.deleteApiKey(id);

      console.log('✅ API key deleted successfully!');
    } catch (error) {
      console.error(
        '❌ Error deleting API key:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

// List API keys command
program
  .command('list')
  .description('List all API keys')
  .action(async () => {
    let app: any = null;
    try {
      const { service, app: appContext } = await getApiKeysService();
      app = appContext;
      const apiKeys = await service.findAll();

      if (apiKeys.length === 0) {
        console.log('No API keys found.');
        return;
      }

      console.log('API Keys:');
      console.log('');
      apiKeys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
        console.log(
          `   Key: ${key.key.substring(0, 8)}...${key.key.substring(
            key.key.length - 4,
          )}`,
        );
        console.log(`   Active: ${key.isActive}`);
        console.log(`   Requests: ${key.requestCount}`);
        console.log(`   Created: ${key.createdAt.toISOString()}`);
        console.log(
          `   Last Used: ${key.lastUsedAt ? key.lastUsedAt.toISOString() : 'Never'}`,
        );
        console.log('');
      });
    } catch (error) {
      console.error(
        '❌ Error listing API keys:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

// Stats command
program
  .command('stats')
  .description('Show API key statistics')
  .action(async () => {
    let app: any = null;
    try {
      const { service, app: appContext } = await getApiKeysService();
      app = appContext;
      const stats = await service.getStats();

      console.log('API Key Statistics:');
      console.log('');
      console.log(`Total Keys: ${stats.totalKeys}`);
      console.log(`Active Keys: ${stats.activeKeys}`);
      console.log(`Inactive Keys: ${stats.inactiveKeys}`);
      console.log(`Total Requests: ${stats.totalRequests}`);
    } catch (error) {
      console.error(
        '❌ Error fetching statistics:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

// Parse command with subcommands
program
  .command('parse')
  .description('Parse data from htreviews.org')
  .argument('<type>', 'Type of data to parse: brand, line, or tobacco')
  .option('--limit <number>', 'Limit number of items to parse')
  .option('--url <url>', 'Parse specific item by URL')
  .action(async (type, options) => {
    let app: any = null;
    try {
      const { service, app: appContext } = await getParserService();
      app = appContext;
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const url = options.url;

      if (url && limit) {
        console.error('❌ Cannot use both --url and --limit options together.');
        process.exit(1);
      }

      if (limit !== undefined && (isNaN(limit) || limit < 1)) {
        console.error('❌ Invalid limit value. Must be a positive number.');
        process.exit(1);
      }

      const startTime = Date.now();

      if (url) {
        // Parse specific item by URL
        console.log(`🚀 Starting ${type} parsing from URL: ${url}`);
        console.log('');

        switch (type.toLowerCase()) {
          case 'brand': {
            await service.parseBrandByUrl(url);
            break;
          }
          case 'line': {
            // Extract brandId from URL for line parsing
            const urlMatch = url.match(/\/tobaccos\/([^/]+)\/([^/?]+)/);
            if (!urlMatch) {
              console.error(
                '❌ Invalid line URL format. Expected: /tobaccos/{brand}/{line}',
              );
              process.exit(1);
            }

            // Find brand by slug to get brandId
            const brandSlug = urlMatch[1];
            const brands = await service['brandRepository'].find({
              where: { slug: brandSlug },
            });
            if (!brands || brands.length === 0) {
              console.error(`❌ Brand not found in database: ${brandSlug}`);
              process.exit(1);
            }

            const brandId = brands[0].id;
            await service.parseLineByUrl(url, brandId);
            break;
          }
          case 'tobacco': {
            // Extract brandId and lineId from URL for tobacco parsing
            const urlMatch = url.match(
              /\/tobaccos\/([^/]+)\/([^/]+)\/([^/?]+)/,
            );
            if (!urlMatch) {
              console.error(
                '❌ Invalid tobacco URL format. Expected: /tobaccos/{brand}/{line}/{tobacco}',
              );
              process.exit(1);
            }

            // Find brand by slug to get brandId
            const brandSlug = urlMatch[1];
            const brands = await service['brandRepository'].find({
              where: { slug: brandSlug },
            });
            if (!brands || brands.length === 0) {
              console.error(`❌ Brand not found in database: ${brandSlug}`);
              process.exit(1);
            }

            const brandId = brands[0].id;

            // Find line by slug and brandId to get lineId
            const lineSlug = urlMatch[2];
            const lines = await service['lineRepository'].find({
              where: { slug: lineSlug, brandId },
            });
            if (!lines || lines.length === 0) {
              console.error(`❌ Line not found in database: ${lineSlug}`);
              process.exit(1);
            }

            const lineId = lines[0].id;
            await service.parseTobaccoByUrl(url, brandId, lineId);
            break;
          }
          default:
            console.error(
              `❌ Invalid type: ${type}. Must be 'brand', 'line', or 'tobacco'.`,
            );
            process.exit(1);
            break;
        }
      } else {
        // Parse all items with limit
        console.log(
          `🚀 Starting ${type}s parsing${limit ? ` (limit: ${limit})` : ''}...`,
        );
        console.log('');

        switch (type.toLowerCase()) {
          case 'brand':
            await service.parseBrandsManually(limit);
            break;
          case 'line':
            await service.parseLinesManually(limit);
            break;
          case 'tobacco':
            await service.parseTobaccosManually(limit);
            break;
          default:
            console.error(
              `❌ Invalid type: ${type}. Must be 'brand', 'line', or 'tobacco'.`,
            );
            process.exit(1);
            break;
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log('');
      console.log(`✅ ${type} parsing completed in ${duration}s`);
    } catch (error) {
      console.error(
        '❌ Parsing failed:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

program.parse();
