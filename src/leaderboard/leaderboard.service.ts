import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { Session } from '../entities/session.entity';

export interface LeaderboardFilters {
  from?: string;
  to?: string;
  groupId?: string;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
  ) {}

  async getLeaderboard(currentUserId?: string, filters: LeaderboardFilters = {}) {
    const users = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.group', 'group')
      .where('user.role = :role', { role: UserRole.USER })
      .andWhere(filters.groupId ? 'user.group_id = :groupId' : '1=1', {
      groupId: filters.groupId,
      })
      .orderBy('user.name', 'ASC')
      .getMany();

    const eligibleSessionsQuery = this.sessionRepository
      .createQueryBuilder('session')
      .where('1=1');

    if (filters.from) {
      eligibleSessionsQuery.andWhere('session.starts_at >= :from', {
      from: filters.from,
      });
    }
    if (filters.to) {
      eligibleSessionsQuery.andWhere('session.starts_at <= :to', {
      to: filters.to,
      });
    }

    const eligibleSessions = await eligibleSessionsQuery.getMany();
    const eligibleSessionIds = eligibleSessions.map((session) => session.id);
    const attendanceCounts = new Map<string, number>();
    const sessionStats = new Map<string, number>();

    if (eligibleSessionIds.length > 0 && users.length > 0) {
      const counts = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .select('attendance.user_id', 'userId')
      .addSelect('COUNT(DISTINCT attendance.session_id)', 'count')
      .where('attendance.session_id IN (:...sessionIds)', {
        sessionIds: eligibleSessionIds,
      })
      .andWhere('attendance.user_id IN (:...userIds)', {
        userIds: users.map((user) => user.id),
      })
      .groupBy('attendance.user_id')
      .getRawMany<{ userId: string; count: string }>();

      counts.forEach((row) => attendanceCounts.set(row.userId, Number(row.count)));
    }

    if (eligibleSessionIds.length > 0) {
      const sessionCounts = await this.attendanceRepository
        .createQueryBuilder('attendance')
        .innerJoin('attendance.session', 'session')
        .select('attendance.session_id', 'sessionId')
        .addSelect('session.name', 'name')
        .addSelect('COUNT(DISTINCT attendance.user_id)', 'count')
        .where('attendance.session_id IN (:...sessionIds)', {
          sessionIds: eligibleSessionIds,
        })
        .groupBy('attendance.session_id')
        .addGroupBy('session.name')
        .getRawMany<{ sessionId: string; name: string; count: string }>();

      sessionCounts.forEach((row) => sessionStats.set(row.sessionId, Number(row.count)));
    }

    const sortedUsers = users
      .map((user) => ({
      user,
      attendances: attendanceCounts.get(user.id) || 0,
      }))
      .sort((left, right) =>
      right.attendances - left.attendances ||
      left.user.name.localeCompare(right.user.name, 'es'),
      );

    let previousCount: number | null = null;
    let previousRank = 0;
    const entries = sortedUsers.map(({ user, attendances }, index) => {
      if (attendances !== previousCount) {
      previousRank = index + 1;
      previousCount = attendances;
      }

      const participation = eligibleSessions.length > 0
      ? Math.round((attendances / eligibleSessions.length) * 10000) / 100
      : null;

      return {
      rank: previousRank,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar || undefined,
        group: user.group
          ? { id: user.group.id, name: user.group.name }
          : null,
      },
      attendances,
      participation,
      // Retained for the existing Garden UI until its copy is migrated.
      flores: user.flowers,
      isCurrentUser: currentUserId ? user.id === currentUserId : false,
      };
    });

    const currentUserEntry = currentUserId
      ? entries.find((entry) => entry.user.id === currentUserId)
      : null;

    return {
      entries,
      currentUser: currentUserEntry || undefined,
      eligibleSessions: eligibleSessions.length,
      totalAttendances: entries.reduce((total, entry) => total + entry.attendances, 0),
      sessions: eligibleSessions.map((session) => ({
        id: session.id,
        name: session.name,
        startsAt: session.startsAt,
        attendances: sessionStats.get(session.id) || 0,
      })),
    };
  }
}
