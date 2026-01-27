#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApiKeysService } from '../api-keys/api-keys.service';

const program = new Command();

program
  .name('hookah-db-cli')
  .description('CLI for managing Hookah Tobacco Database API')
  .version('0.0.1');

// Helper function to initialize NestJS app and get service
async function getApiKeysService(): Promise<ApiKeysService> {
  const app = await NestFactory.createApplicationContext(AppModule);
  return app.get(ApiKeysService);
}

// Create API key command
program
  .command('create <name>')
  .description('Create a new API key')
  .action(async (name) => {
    try {
      const apiKeysService = await getApiKeysService();
      const apiKey = await apiKeysService.createApiKey(name);

      console.log('✅ API key created successfully!');
      console.log('');
      console.log('Key Details:');
      console.log(`  ID: ${apiKey.id}`);
      console.log(`  Name: ${apiKey.name}`);
      console.log(`  Key: ${apiKey.key}`);
      console.log(`  Active: ${apiKey.isActive}`);
      console.log('');
      console.log('⚠️  Save this key securely. You will not be able to see it again.');
    } catch (error) {
      console.error('❌ Error creating API key:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Delete API key command
program
  .command('delete <id>')
  .description('Delete an API key by ID')
  .action(async (id) => {
    try {
      const apiKeysService = await getApiKeysService();
      await apiKeysService.deleteApiKey(id);

      console.log('✅ API key deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting API key:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// List API keys command
program
  .command('list')
  .description('List all API keys')
  .action(async () => {
    try {
      const apiKeysService = await getApiKeysService();
      const apiKeys = await apiKeysService.findAll();

      if (apiKeys.length === 0) {
        console.log('No API keys found.');
        return;
      }

      console.log('API Keys:');
      console.log('');
      apiKeys.forEach((key, index) => {
        console.log(`${index + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
        console.log(`   Key: ${key.key.substring(0, 8)}...${key.key.substring(key.key.length - 4)}`);
        console.log(`   Active: ${key.isActive}`);
        console.log(`   Requests: ${key.requestCount}`);
        console.log(`   Created: ${key.createdAt.toISOString()}`);
        console.log(`   Last Used: ${key.lastUsedAt ? key.lastUsedAt.toISOString() : 'Never'}`);
        console.log('');
      });
    } catch (error) {
      console.error('❌ Error listing API keys:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show API key statistics')
  .action(async () => {
    try {
      const apiKeysService = await getApiKeysService();
      const stats = await apiKeysService.getStats();

      console.log('API Key Statistics:');
      console.log('');
      console.log(`Total Keys: ${stats.totalKeys}`);
      console.log(`Active Keys: ${stats.activeKeys}`);
      console.log(`Inactive Keys: ${stats.inactiveKeys}`);
      console.log(`Total Requests: ${stats.totalRequests}`);
    } catch (error) {
      console.error('❌ Error fetching statistics:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
