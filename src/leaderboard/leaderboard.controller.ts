import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Request() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const data = await this.leaderboardService.getLeaderboard(req.user.userId, {
      from,
      to,
    });

    return {
      data,
    };
  }

  @Get('report')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getReport(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupId') groupId?: string,
  ) {
    const data = await this.leaderboardService.getLeaderboard(undefined, {
      from,
      to,
      groupId,
    });

    return { data };
  }
}
