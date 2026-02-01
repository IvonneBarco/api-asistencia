import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { User, UserRole } from '../entities/user.entity';
import { QrService } from '../services/qr.service';
import { CreateSessionDto } from './dto/admin.dto';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private qrService: QrService,
    private authService: AuthService,
  ) {}

  /**
   * Crea una nueva sesión y genera su QR
   */
  async createSession(dto: CreateSessionDto) {
    // Generar sessionId único
    const sessionId = `SESSION-${new Date().toISOString().split('T')[0]}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const session = this.sessionRepository.create({
      sessionId,
      name: dto.name,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: true,
    });

    await this.sessionRepository.save(session);

    // Generar QR
    const qrCode = await this.qrService.generateQRCode(sessionId);

    return {
      id: session.id,
      sessionId: session.sessionId,
      name: session.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      isActive: session.isActive,
      qrCode, // base64 PNG
    };
  }

  /**
   * Obtiene todas las sesiones
   */
  async getAllSessions() {
    const sessions = await this.sessionRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      sessionId: session.sessionId,
      name: session.name,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      isActive: session.isActive,
      createdAt: session.createdAt,
    }));
  }

  /**
   * Obtiene el QR de una sesión específica
   */
  async getSessionQR(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const qrCode = await this.qrService.generateQRCode(session.sessionId);

    return {
      sessionId: session.sessionId,
      name: session.name,
      qrCode,
    };
  }

  /**
   * Desactiva una sesión
   */
  async deactivateSession(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { sessionId },
    });

    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    session.isActive = false;
    await this.sessionRepository.save(session);

    return {
      message: 'Sesión desactivada correctamente',
      sessionId: session.sessionId,
    };
  }

  /**
   * Sincroniza usuarios desde Google Sheets
   * Por ahora, implementación mock
   */
  async syncUsersFromSheet(spreadsheetId?: string) {
    // TODO: Implementar integración con Google Sheets API
    // Por ahora, retorna mensaje de pendiente

    throw new BadRequestException(
      'La sincronización con Google Sheets aún no está implementada',
    );
  }

  /**
   * Crea un usuario manualmente (útil para testing)
   */
  async createUser(data: {
    name: string;
    email: string;
    pin: string;
    role?: UserRole;
  }) {
    const existingUser = await this.userRepository.findOne({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new BadRequestException('El usuario ya existe');
    }

    const pinHash = await this.authService.hashPin(data.pin);

    const user = this.userRepository.create({
      name: data.name,
      email: data.email,
      pinHash,
      role: data.role || UserRole.USER,
      flowers: 0,
    });

    await this.userRepository.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      flowers: user.flowers,
    };
  }
}
