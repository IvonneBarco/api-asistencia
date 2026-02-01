import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateSessionDto, SyncUsersDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post('sessions')
  async createSession(@Body() dto: CreateSessionDto) {
    const data = await this.adminService.createSession(dto);
    return {
      data,
      message: 'Sesión creada correctamente',
    };
  }

  @Get('sessions')
  async getAllSessions() {
    const data = await this.adminService.getAllSessions();
    return {
      data,
    };
  }

  @Get('sessions/:sessionId/qr')
  async getSessionQR(@Param('sessionId') sessionId: string) {
    const data = await this.adminService.getSessionQR(sessionId);
    return {
      data,
    };
  }

  @Patch('sessions/:sessionId/deactivate')
  async deactivateSession(@Param('sessionId') sessionId: string) {
    const data = await this.adminService.deactivateSession(sessionId);
    return data;
  }

  @Post('sync-users')
  async syncUsers(@Body() dto: SyncUsersDto) {
    const data = await this.adminService.syncUsersFromSheet(dto.spreadsheetId);
    return {
      data,
      message: 'Usuarios sincronizados correctamente',
    };
  }
}
