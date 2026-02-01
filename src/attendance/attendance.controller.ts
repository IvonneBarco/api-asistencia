import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanAttendance(@Request() req, @Body() dto: ScanAttendanceDto) {
    const result = await this.attendanceService.scanAttendance(
      req.user.userId,
      dto,
    );

    return {
      data: result,
    };
  }
}
