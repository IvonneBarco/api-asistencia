import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Put('sessions/:sessionId/deactivate')
  async deactivateSession(@Param('sessionId') sessionId: string) {
    const data = await this.adminService.deactivateSession(sessionId);
    return data;
  }

  @Post('sync-users')
  async syncUsers(@Body() dto: SyncUsersDto) {
    const data = await this.adminService.syncUsersFromSheet(dto.spreadsheetId);
    return {
      data,
    };
  }

  @Post('users/bulk')
  async bulkSyncUsers(@Body() dto: any) {
    const data = await this.adminService.bulkSyncUsers(dto.users);
    return {
      data,
      message: `Sincronización completada: ${data.created.length} creados, ${data.updated.length} actualizados, ${data.errors.length} errores`,
    };
  }

  @Post('users/csv')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUsersCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      throw new BadRequestException('El archivo debe ser un CSV');
    }

    const csvContent = file.buffer.toString('utf-8');
    const data = await this.adminService.importUsersFromCSV(csvContent);
    
    return {
      data,
      message: `Importación completada: ${data.created.length} creados, ${data.updated.length} actualizados, ${data.errors.length} errores`,
    };
  }
}
