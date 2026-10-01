import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { validateEnvironment } from './config/env.validation';

dotenv.config({ quiet: true });

const environment = validateEnvironment(process.env);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: environment.DATABASE_HOST || 'localhost',
  port: environment.DATABASE_PORT || 5432,
  username: environment.DATABASE_USERNAME || 'postgres',
  password: environment.DATABASE_PASSWORD || 'postgres',
  database: environment.DATABASE_NAME || 'hookah_db',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: true,
  migrationsTableName: 'migrations',
});
