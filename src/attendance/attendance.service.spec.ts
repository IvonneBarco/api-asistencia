import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AttendanceService } from './attendance.service';
import { Attendance } from '../entities/attendance.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { QrService } from '../services/qr.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let attendanceRepository: jest.Mocked<Repository<Attendance>>;
  let sessionRepository: jest.Mocked<Repository<Session>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let qrService: jest.Mocked<QrService>;
  let dataSource: jest.Mocked<DataSource>;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      increment: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: getRepositoryToken(Attendance),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Session),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: QrService,
          useValue: {
            validateQRCode: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
    attendanceRepository = module.get(getRepositoryToken(Attendance));
    sessionRepository = module.get(getRepositoryToken(Session));
    userRepository = module.get(getRepositoryToken(User));
    qrService = module.get(QrService);
    dataSource = module.get(DataSource);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scanAttendance - Success Flow', () => {
    const userId = 'user-123';
    const sessionId = 'SESSION-2026-01-31-ABC123';
    const qrCode = JSON.stringify({
      sid: sessionId,
      exp: 1706731200,
      sig: 'valid-sig',
    });

    const mockSession: Partial<Session> = {
      id: 'session-uuid',
      sessionId,
      name: 'Test Session',
      startsAt: new Date(Date.now() - 3600000), // -1 hora (ya comenzó)
      endsAt: new Date(Date.now() + 3600000), // +1 hora (aún no termina)
      isActive: true,
    };

    const mockUser: Partial<User> = {
      id: userId,
      flowers: 10,
    };

    beforeEach(() => {
      // Mock QR validation
      qrService.validateQRCode.mockReturnValue({
        valid: true,
        sessionId,
      });

      // Mock session lookup
      sessionRepository.findOne.mockResolvedValue(mockSession as Session);

      // Mock user lookup
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        flowers: 11,
      } as User);

      // Mock QueryRunner
      mockQueryRunner.manager.findOne.mockResolvedValue(null); // No existing attendance
      mockQueryRunner.manager.create.mockReturnValue({ id: 'attendance-uuid' });
      mockQueryRunner.manager.save.mockResolvedValue({ id: 'attendance-uuid' });
      mockQueryRunner.manager.increment.mockResolvedValue(undefined);
    });

    it('should register attendance successfully for first scan', async () => {
      const result = await service.scanAttendance(userId, { qrCode });

      expect(result.added).toBe(true);
      expect(result.flowers).toBe(11);
      expect(result.message).toContain('Asistencia registrada');
      expect(result.session).toEqual({
        id: sessionId,
        name: 'Test Session',
        date: mockSession.startsAt,
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should use pessimistic lock when checking for duplicates', async () => {
      await service.scanAttendance(userId, { qrCode });

      expect(mockQueryRunner.manager.findOne).toHaveBeenCalledWith(
        Attendance,
        expect.objectContaining({
          where: {
            user: { id: userId },
            session: { id: mockSession.id },
          },
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('should increment flowers atomically', async () => {
      await service.scanAttendance(userId, { qrCode });

      expect(mockQueryRunner.manager.increment).toHaveBeenCalledWith(
        User,
        { id: userId },
        'flowers',
        1,
      );
    });
  });

  describe('scanAttendance - QR Validation Errors', () => {
    const userId = 'user-123';
    const qrCode = 'invalid-qr';

    it('should reject invalid QR signature', async () => {
      qrService.validateQRCode.mockReturnValue({
        valid: false,
        error: 'Código QR inválido',
      });

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Código QR inválido',
      );
    });

    it('should reject expired QR code', async () => {
      qrService.validateQRCode.mockReturnValue({
        valid: false,
        error: 'Código QR vencido',
      });

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject malformed QR code', async () => {
      qrService.validateQRCode.mockReturnValue({
        valid: false,
        error: 'Código QR mal formado',
      });

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('scanAttendance - Session Validation', () => {
    const userId = 'user-123';
    const sessionId = 'SESSION-2026-01-31-ABC123';
    const qrCode = JSON.stringify({
      sid: sessionId,
      exp: 1706731200,
      sig: 'valid-sig',
    });

    beforeEach(() => {
      qrService.validateQRCode.mockReturnValue({
        valid: true,
        sessionId,
      });
    });

    it('should reject if session not found', async () => {
      sessionRepository.findOne.mockResolvedValue(null);

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Sesión no encontrada',
      );
    });

    it('should reject if session is inactive', async () => {
      sessionRepository.findOne.mockResolvedValue({
        id: 'session-uuid',
        sessionId,
        isActive: false,
        startsAt: new Date('2026-01-31T18:00:00Z'),
        endsAt: new Date('2026-01-31T20:00:00Z'),
      } as Session);

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Esta sesión ya no está activa',
      );
    });

    it('should reject if session has not started yet', async () => {
      const futureDate = new Date(Date.now() + 86400000); // +1 day
      sessionRepository.findOne.mockResolvedValue({
        id: 'session-uuid',
        sessionId,
        isActive: true,
        startsAt: futureDate,
        endsAt: new Date(futureDate.getTime() + 7200000),
      } as Session);

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Esta sesión aún no ha comenzado',
      );
    });

    it('should reject if session has ended', async () => {
      const pastDate = new Date(Date.now() - 86400000); // -1 day
      sessionRepository.findOne.mockResolvedValue({
        id: 'session-uuid',
        sessionId,
        isActive: true,
        startsAt: new Date(pastDate.getTime() - 7200000),
        endsAt: pastDate,
      } as Session);

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Esta sesión ya finalizó',
      );
    });
  });

  describe('scanAttendance - Idempotency', () => {
    const userId = 'user-123';
    const sessionId = 'SESSION-2026-01-31-ABC123';
    const qrCode = JSON.stringify({
      sid: sessionId,
      exp: 1706731200,
      sig: 'valid-sig',
    });

    const mockSession: Partial<Session> = {
      id: 'session-uuid',
      sessionId,
      name: 'Test Session',
      startsAt: new Date(Date.now() - 3600000), // -1 hora (ya comenzó)
      endsAt: new Date(Date.now() + 3600000), // +1 hora (aún no termina)
      isActive: true,
    };

    beforeEach(() => {
      qrService.validateQRCode.mockReturnValue({
        valid: true,
        sessionId,
      });
      sessionRepository.findOne.mockResolvedValue(mockSession as Session);
    });

    it('should return added=false for duplicate scan', async () => {
      // Mock existing attendance
      mockQueryRunner.manager.findOne.mockResolvedValue({
        id: 'existing-attendance',
        user: { id: userId },
        session: { id: mockSession.id },
      });

      userRepository.findOne.mockResolvedValue({
        id: userId,
        flowers: 10,
      } as User);

      const result = await service.scanAttendance(userId, { qrCode });

      expect(result.added).toBe(false);
      expect(result.flowers).toBe(10);
      expect(result.message).toContain('ya fue registrada anteriormente');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.increment).not.toHaveBeenCalled();
    });

    it('should handle unique constraint violation gracefully', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue({
        code: '23505', // PostgreSQL unique violation
        message: 'duplicate key value violates unique constraint',
      });

      userRepository.findOne.mockResolvedValue({
        id: userId,
        flowers: 10,
      } as User);

      const result = await service.scanAttendance(userId, { qrCode });

      expect(result.added).toBe(false);
      expect(result.flowers).toBe(10);
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('scanAttendance - Transaction Rollback', () => {
    const userId = 'user-123';
    const sessionId = 'SESSION-2026-01-31-ABC123';
    const qrCode = JSON.stringify({
      sid: sessionId,
      exp: 1706731200,
      sig: 'valid-sig',
    });

    const mockSession: Partial<Session> = {
      id: 'session-uuid',
      sessionId,
      isActive: true,
      startsAt: new Date(Date.now() - 3600000), // -1 hora (ya comenzó)
      endsAt: new Date(Date.now() + 3600000), // +1 hora (aún no termina)
    };

    beforeEach(() => {
      qrService.validateQRCode.mockReturnValue({
        valid: true,
        sessionId,
      });
      sessionRepository.findOne.mockResolvedValue(mockSession as Session);
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
    });

    it('should rollback transaction on unexpected error', async () => {
      const unexpectedError = new Error('Database connection lost');
      mockQueryRunner.manager.save.mockRejectedValue(unexpectedError);

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow(
        'Database connection lost',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should always release query runner', async () => {
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Any error'));

      await expect(service.scanAttendance(userId, { qrCode })).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });
});
