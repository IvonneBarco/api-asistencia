import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JoinGroupDto, CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * GET /api/groups
   * Obtiene lista de grupos activos con número de miembros
   */
  @Get()
  async getAllGroups() {
    const groups = await this.groupsService.getAllActiveGroups();
    return {
      success: true,
      data: groups,
    };
  }

  /**
   * POST /api/groups/join
   * Permite a un usuario unirse a un grupo (SOLO UNA VEZ)
   */
  @Post('join')
  async joinGroup(@Request() req, @Body() dto: JoinGroupDto) {
    const userId = req.user.userId;
    const result = await this.groupsService.joinGroup(userId, dto.groupId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /api/groups/my-group
   * Obtiene el grupo actual del usuario autenticado
   */
  @Get('my-group')
  async getMyGroup(@Request() req) {
    const userId = req.user.userId;
    const result = await this.groupsService.getUserGroup(userId);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /api/groups (ADMIN ONLY)
   * Crea un nuevo grupo
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createGroup(@Body() dto: CreateGroupDto) {
    const result = await this.groupsService.createGroup(dto.name, dto.isActive);
    return {
      success: true,
      data: result,
      message: 'Grupo creado exitosamente',
    };
  }

  /**
   * GET /api/groups/all (ADMIN ONLY)
   * Obtiene todos los grupos incluyendo inactivos
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllGroupsAdmin() {
    const groups = await this.groupsService.getAllGroups();
    return {
      success: true,
      data: groups,
    };
  }

  /**
   * PATCH /api/groups/:groupId (ADMIN ONLY)
   * Actualiza un grupo
   */
  @Patch(':groupId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateGroup(@Param('groupId') groupId: string, @Body() dto: UpdateGroupDto) {
    const result = await this.groupsService.updateGroup(groupId, dto);
    return {
      success: true,
      data: result,
      message: 'Grupo actualizado exitosamente',
    };
  }

  /**
   * DELETE /api/groups/:groupId (ADMIN ONLY)
   * Desactiva un grupo
   */
  @Delete(':groupId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async deactivateGroup(@Param('groupId') groupId: string) {
    const result = await this.groupsService.deactivateGroup(groupId);
    return {
      success: true,
      data: result,
    };
  }
}
