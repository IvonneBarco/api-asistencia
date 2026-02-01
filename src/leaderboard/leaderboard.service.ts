import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getLeaderboard(currentUserId?: string) {
    const users = await this.userRepository.find({
      select: ['id', 'name', 'flowers'],
      order: {
        flowers: 'DESC',
        name: 'ASC',
      },
    });

    const entries = users.map((user, index) => ({
      rank: index + 1,
      user: {
        id: user.id,
        name: user.name,
      },
      flores: user.flowers,
      isCurrentUser: currentUserId ? user.id === currentUserId : false,
    }));

    const currentUserEntry = currentUserId
      ? entries.find((entry) => entry.user.id === currentUserId)
      : null;

    return {
      entries,
      currentUser: currentUserEntry || undefined,
    };
  }
}
