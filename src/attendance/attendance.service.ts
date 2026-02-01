import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Attendance } from '../entities/attendance.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { QrService } from '../services/qr.service';
import { ScanAttendanceDto, ScanAttendanceResponse } from './dto/scan-attendance.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private qrService: QrService,
    private dataSource: DataSource,
  ) {}

  async scanAttendance(
    userId: string,
    dto: ScanAttendanceDto,
  ): Promise<ScanAttendanceResponse> {
    // 1. Validar QR (estructura, expiración, firma HMAC)
    const validation = this.qrService.validateQRCode(dto.qrCode);

    if (!validation.valid) {
      this.logger.warn(
        `QR validation failed for user ${userId}: ${validation.error}`,
      );
      throw new BadRequestException(validation.error);
    }

    // 2. Buscar sesión y validar que esté activa
    const session = await this.sessionRepository.findOne({
      where: { sessionId: validation.sessionId },
    });

    if (!session) {
      this.logger.warn(
        `Session not found: ${validation.sessionId} for user ${userId}`,
      );
      throw new NotFoundException('Sesión no encontrada');
    }

    if (!session.isActive) {
      this.logger.warn(
        `Session ${session.sessionId} is inactive for user ${userId}`,
      );
      throw new BadRequestException('Esta sesión ya no está activa');
    }

    // 3. Validar ventana de tiempo (opcional pero recomendado)
    const now = new Date();
    if (now < session.startsAt) {
      this.logger.warn(
        `Session ${session.sessionId} hasn't started yet for user ${userId}`,
      );
      throw new BadRequestException(
        'Esta sesión aún no ha comenzado',
      );
    }

    if (now > session.endsAt) {
      this.logger.warn(
        `Session ${session.sessionId} has ended for user ${userId}`,
      );
      throw new BadRequestException('Esta sesión ya finalizó');
    }

    // 4. Transacción atómica para registro idempotente
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verificar existencia con lock pesimista para evitar race conditions
      const existingAttendance = await queryRunner.manager.findOne(
        Attendance,
        {
          where: {
            user: { id: userId },
            session: { id: session.id },
          },
          lock: { mode: 'pessimistic_write' },
        },
      );

      if (existingAttendance) {
        await queryRunner.rollbackTransaction();
        
        // Obtener flores actuales del usuario
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['flowers'],
        });

        this.logger.log(
          `Duplicate scan detected for user ${userId} in session ${session.sessionId}`,
        );

        return {
          added: false,
          flowers: user?.flowers || 0,
          message: 'Esta sesión ya fue registrada anteriormente',
        };
      }

      // Insertar registro de asistencia
      const attendance = queryRunner.manager.create(Attendance, {
        user: { id: userId },
        session: { id: session.id },
        rawQr: dto.qrCode,
      });

      await queryRunner.manager.save(attendance);

      // Incrementar flores de forma atómica (evita read-modify-write inseguro)
      await queryRunner.manager.increment(
        User,
        { id: userId },
        'flowers',
        1,
      );

      await queryRunner.commitTransaction();

      // Obtener el nuevo total de flores
      const updatedUser = await this.userRepository.findOne({
        where: { id: userId },
        select: ['flowers'],
      });

      this.logger.log(
        `Attendance recorded for user ${userId} in session ${session.sessionId}. Total flowers: ${updatedUser.flowers}`,
      );

      return {
        added: true,
        flowers: updatedUser.flowers,
        message: 'Asistencia registrada. Has recibido 1 flor',
        session: {
          id: session.sessionId,
          name: session.name,
          date: session.startsAt,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      // Verificar si es error de unique constraint
      if (error.code === '23505') { // PostgreSQL unique violation
        this.logger.warn(
          `Unique constraint violation for user ${userId} in session ${session.sessionId}`,
        );
        
        const user = await this.userRepository.findOne({
          where: { id: userId },
          select: ['flowers'],
        });

        return {
          added: false,
          flowers: user?.flowers || 0,
          message: 'Esta sesión ya fue registrada anteriormente',
        };
      }

      this.logger.error(
        `Error recording attendance for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
