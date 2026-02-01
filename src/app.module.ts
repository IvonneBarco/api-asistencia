import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { HealthController } from './health.controller';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { Attendance } from './entities/attendance.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        // host: configService.get('DB_HOST'),
        // port: configService.get('DB_PORT'),
        // username: configService.get('DB_USERNAME'),
        // password: configService.get('DB_PASSWORD'),
        // database: configService.get('DB_DATABASE'),
        entities: [User, Session, Attendance],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('THROTTLE_TTL') || 60000,
          limit: configService.get('THROTTLE_LIMIT') || 10,
        },
      ],
      inject: [ConfigService],
    }),
    AuthModule,
    AdminModule,
    AttendanceModule,
    LeaderboardModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
