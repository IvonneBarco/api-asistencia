import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { QrService } from '../services/qr.service';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { ImageService } from '../services/image.service';
import { SaintLoan } from '../entities/saint-loan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Session, User, Attendance, SaintLoan]), AuthModule, GroupsModule],
  controllers: [AdminController],
  providers: [AdminService, QrService, ImageService],
})
export class AdminModule {}
