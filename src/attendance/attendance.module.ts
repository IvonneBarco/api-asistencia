import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from '../entities/attendance.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { QrService } from '../services/qr.service';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Session, User])],
  controllers: [AttendanceController],
  providers: [AttendanceService, QrService],
})
export class AttendanceModule {}
