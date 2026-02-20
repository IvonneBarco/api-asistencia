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
    let result;
    if (dto.qrCode) {
      result = await this.attendanceService.scanAttendance(req.user.userId, dto);
    } else if (dto.sessionPin) {
      result = await this.attendanceService.scanAttendanceByPin(req.user.userId, dto.sessionPin);
    } else {
      return {
        data: null,
        message: 'Debes enviar un código QR o un PIN válido',
      };
    }
    return {
      data: result,
    };
  }
}
