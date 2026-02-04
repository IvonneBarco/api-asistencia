import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { QrService } from '../services/qr.service';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User]), AuthModule, GroupsModule],
  controllers: [AdminController],
  providers: [AdminService, QrService],
})
export class AdminModule {}
