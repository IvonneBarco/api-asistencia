import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { CreateSessionDto, SyncUsersDto, AssignGroupDto, RemoveFromGroupDto } from './dto/admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { GroupsService } from '../groups/groups.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private adminService: AdminService,
    private groupsService: GroupsService,
  ) {}

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

  @Get('users')
  async getAllUsers() {
    const data = await this.adminService.getAllUsers();
    return {
      data,
      total: data.length,
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
  async uploadUsersCSV(@UploadedFile() file: any) {
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

  /**
   * PATCH /api/admin/users/:userId/group
   * Permite a un ADMIN cambiar el grupo de un usuario
   * Puede reasignar aunque el usuario ya tenga grupo
   */
  @Patch('users/:userId/group')
  async assignUserGroup(
    @Param('userId') userId: string,
    @Body() dto: AssignGroupDto,
    @Request() req,
  ) {
    const adminUserId = req.user.userId;
    const data = await this.groupsService.assignGroupByAdmin(
      userId,
      dto.groupId,
      adminUserId,
      dto.reason,
    );
    
    return {
      success: true,
      data,
      message: 'Grupo asignado exitosamente',
    };
  }

  /**
   * DELETE /api/admin/users/:userId/group
   * Permite a un ADMIN quitar a un usuario de su grupo
   */
  @Patch('users/:userId/remove-group')
  async removeUserFromGroup(
    @Param('userId') userId: string,
    @Body() dto: RemoveFromGroupDto,
    @Request() req,
  ) {
    const adminUserId = req.user.userId;
    const data = await this.groupsService.removeUserFromGroup(
      userId,
      adminUserId,
      dto.reason,
    );
    
    return {
      success: true,
      data,
      message: 'Usuario removido del grupo exitosamente',
    };
  }

  /**
   * GET /api/admin/users/:userId/group-history
   * Obtiene el historial de cambios de grupo de un usuario
   */
  @Get('users/:userId/group-history')
  async getUserGroupHistory(@Param('userId') userId: string) {
    const data = await this.groupsService.getUserGroupHistory(userId);
    
    return {
      success: true,
      data,
    };
  }
}
