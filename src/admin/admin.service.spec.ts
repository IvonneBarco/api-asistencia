import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { SaintLoan, SaintName } from '../entities/saint-loan.entity';
import { QrService } from '../services/qr.service';
import { AuthService } from '../auth/auth.service';
import { ImageService } from '../services/image.service';

describe('AdminService saint loans', () => {
  let service: AdminService;
  let loanRepository: jest.Mocked<Repository<SaintLoan>>;
  const session = { id: 'session-id', sessionId: 'SESSION-1', name: 'Sesión 1' } as Session;
  const users = [
    { id: 'user-1', name: 'Ana', identification: '1' },
    { id: 'user-2', name: 'Bea', identification: '2' },
    { id: 'user-3', name: 'Clara', identification: '3' },
    { id: 'user-4', name: 'Diana', identification: '4' },
  ] as User[];
  let loans: SaintLoan[] = [];
  let saveError: Error & { code?: string; constraint?: string } | undefined;

  beforeEach(async () => {
    loans = [];
    saveError = undefined;
    const manager = {
      findOne: jest.fn(async (entity: typeof Session | typeof User) => {
        if (entity === Session) return session;
        return users[0];
      }),
      count: jest.fn(async () => loans.length),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (loan) => {
        if (saveError) throw saveError;
        const saved = { ...loan, id: `loan-${loans.length + 1}`, createdAt: new Date() };
        loans.push(saved);
        return saved;
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Session), useValue: { findOne: jest.fn().mockResolvedValue(session) } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(Attendance), useValue: {} },
        { provide: getRepositoryToken(SaintLoan), useValue: { find: jest.fn() } },
        { provide: QrService, useValue: {} },
        { provide: AuthService, useValue: {} },
        { provide: ImageService, useValue: {} },
        { provide: DataSource, useValue: { transaction: jest.fn((callback) => callback(manager)) } },
      ],
    }).compile();
    service = module.get(AdminService);
    loanRepository = module.get(getRepositoryToken(SaintLoan));
  });

  it('registra tres asignaciones válidas', async () => {
    for (const [index, saint] of Object.values(SaintName).entries()) {
      const result = await service.registerSaintLoan('SESSION-1', users[index].id, saint);
      expect(result.saint).toBe(saint);
    }
    expect(loans).toHaveLength(3);
  });

  it('traduce una constraint de santo repetido', async () => {
    saveError = Object.assign(new Error('duplicate'), { code: '23505', constraint: 'UQ_saint_loans_session_saint' });
    await expect(service.registerSaintLoan('SESSION-1', 'user-1', SaintName.ROSA_MISTICA)).rejects.toThrow('Este santo ya está asignado en la sesión');
  });

  it('traduce una constraint de usuario repetido', async () => {
    saveError = Object.assign(new Error('duplicate'), { code: '23505', constraint: 'UQ_saint_loans_session_user' });
    await expect(service.registerSaintLoan('SESSION-1', 'user-1', SaintName.ROSA_MISTICA)).rejects.toThrow('Este usuario ya lleva un santo en la sesión');
  });

  it('rechaza el cuarto préstamo', async () => {
    loans = [1, 2, 3].map((id) => ({ id: String(id) } as SaintLoan));
    await expect(service.registerSaintLoan('SESSION-1', 'user-4', SaintName.ROSA_MISTICA)).rejects.toThrow(BadRequestException);
    await expect(service.registerSaintLoan('SESSION-1', 'user-4', SaintName.ROSA_MISTICA)).rejects.toThrow('máximo de 3');
  });

  it('calcula los conteos por usuario y santo', async () => {
    loanRepository.find.mockResolvedValue([
      { userId: 'user-1', saint: SaintName.ROSA_MISTICA, user: users[0] },
      { userId: 'user-1', saint: SaintName.MEDALLA_MILAGROSA, user: users[0] },
      { userId: 'user-1', saint: SaintName.ROSA_MISTICA, user: users[0] },
    ] as SaintLoan[]);
    const result = await service.getSaintLoanHistory();
    expect(result.counts).toEqual([{
      userId: 'user-1',
      userName: 'Ana',
      saints: {
        [SaintName.ROSA_MISTICA]: 2,
        [SaintName.MEDALLA_MILAGROSA]: 1,
        [SaintName.SAGRADO_CORAZON]: 0,
      },
    }]);
  });
});
