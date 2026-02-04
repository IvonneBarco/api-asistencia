import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JoinGroupDto } from './dto/groups.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
}
