import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload, AuthResponse } from './interfaces/auth.interface';
import { ImageService } from '../services/image.service';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto';
import { Attendance } from '../entities/attendance.entity';
import { AttendancePeriod } from '../entities/attendance-period.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private imageService: ImageService,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(AttendancePeriod)
    private periodRepository: Repository<AttendancePeriod>,
  ) {}

  private async countCurrentPeriodFlowers(userId: string): Promise<number> {
    const period = await this.periodRepository.findOne({ where: { isActive: true } });
    if (!period) return 0;

    return this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoin('attendance.session', 'session')
      .where('attendance.user_id = :userId', { userId })
      .andWhere('session.period_id = :periodId', { periodId: period.id })
      .getCount();
  }

  async validateUser(email: string, pin: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return null;
    }

    // Verificar que el usuario tenga PIN configurado
    if (!user.pinHash) {
      return null;
    }

    const isPinValid = await bcrypt.compare(pin, user.pinHash);

    if (!isPinValid) {
      return null;
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.pin);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    const flowers = await this.countCurrentPeriodFlowers(user.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        flowers,
        flores: flowers,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async loginWithIdentification(identification: string): Promise<AuthResponse> {
    const user = await this.userRepository.findOne({
      where: { identification },
    });

    if (!user) {
      throw new UnauthorizedException('Número de identificación no encontrado');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwtService.sign(payload);

    const flowers = await this.countCurrentPeriodFlowers(user.id);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        flowers,
        flores: flowers,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async getPublicProfile(userId: string, includePhone: boolean) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['group'],
    });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      identification: user.identification,
      avatar: user.avatar,
      birthDate: user.birthDate,
      firstEmausRetreatDate: user.firstEmausRetreatDate,
      ...(includePhone ? { phoneNumber: user.phoneNumber } : {}),
      group: user.group ? { id: user.group.id, name: user.group.name } : null,
    };
  }

  async updateOwnProfile(userId: string, dto: UpdateOwnProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const duplicate = await this.userRepository.findOne({
      where: { identification: dto.identification },
    });
    if (duplicate && duplicate.id !== userId) {
      throw new BadRequestException('La identificación ya está registrada');
    }

    Object.assign(user, dto);
    try {
      const savedUser = await this.userRepository.save(user);
      const flowers = await this.countCurrentPeriodFlowers(savedUser.id);
      return {
        id: savedUser.id,
        email: savedUser.email,
        identification: savedUser.identification,
        name: savedUser.name,
        flowers,
        flores: flowers,
        role: savedUser.role,
        avatar: savedUser.avatar,
        birthDate: savedUser.birthDate,
        firstEmausRetreatDate: savedUser.firstEmausRetreatDate,
        phoneNumber: savedUser.phoneNumber,
      };
    } catch (error) {
      if (error?.code === '23505') {
        throw new BadRequestException('La identificación ya está registrada');
      }
      throw error;
    }
  }

  async getCurrentPeriodFlowers(userId: string): Promise<number> {
    return this.countCurrentPeriodFlowers(userId);
  }

  async updateUserPhoto(userId: string, avatarPath: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const previousAvatar = user.avatar;
    user.avatar = avatarPath;
    const savedUser = await this.userRepository.save(user);
    this.imageService.removeStoredPhoto(previousAvatar);
    return savedUser;
  }

  async hashPin(pin: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(pin, saltRounds);
  }
}
