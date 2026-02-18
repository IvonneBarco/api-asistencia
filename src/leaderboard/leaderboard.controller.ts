import { Controller, Get, Request } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
// @UseGuards(JwtAuthGuard)
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
