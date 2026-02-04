import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Attendance } from '../entities/attendance.entity';

config();

const configService = new ConfigService();

// Soporte para DATABASE_URL (producción) o credenciales individuales (desarrollo)
const databaseUrl = configService.get('DATABASE_URL');
const isProduction = configService.get('NODE_ENV') === 'production';

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        ssl: isProduction ? { rejectUnauthorized: false } : false,
        entities: [User, Session, Attendance],
        migrations: ['dist/migrations/*.js'], // Usa archivos compilados
        synchronize: false,
        logging: true,
      }
    : {
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [User, Session, Attendance],
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
        logging: true,
      },
);
