import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Request() req) {
    const data = await this.leaderboardService.getLeaderboard(req.user.userId);

    return {
      data,
    };
  }
}
