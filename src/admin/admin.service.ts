import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Session } from '../entities/session.entity';
import { User, UserRole } from '../entities/user.entity';
import { Attendance } from '../entities/attendance.entity';
import { QrService } from '../services/qr.service';
import { CreateSessionDto, RegisterAttendanceDto } from './dto/admin.dto';
import { AuthService } from '../auth/auth.service';
import * as crypto from 'crypto';
import { ImageService } from '../services/image.service';
import { SaintLoan, SaintName } from '../entities/saint-loan.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(SaintLoan)
    private saintLoanRepository: Repository<SaintLoan>,
    private qrService: QrService,
    private authService: AuthService,
    private dataSource: DataSource,
    private imageService: ImageService,
  ) {}

  async getSessionSaintLoans(sessionId: string) {
    const session = await this.sessionRepository.findOne({ where: { sessionId } });
    if (!session) {
      throw new NotFoundException('Sesión no encontrada');
    }

    const loans = await this.saintLoanRepository.find({
      where: { sessionId: session.id },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    return {
      session: { id: session.id, sessionId: session.sessionId, name: session.name },
      catalog: Object.values(SaintName),
      loans: loans.map((loan) => this.serializeSaintLoan(loan)),
    };
  }

  async registerSaintLoan(sessionId: string, userId: string, saint: SaintName) {
    return this.dataSource.transaction(async (manager) => {
      const session = await manager.findOne(Session, {
        where: { sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) {
        throw new NotFoundException('Sesión no encontrada');
      }

      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      const total = await manager.count(SaintLoan, { where: { sessionId: session.id } });
      if (total >= 3) {
        throw new BadRequestException('La sesión ya tiene el máximo de 3 santos asignados');
      }

      const loan = manager.create(SaintLoan, {
        sessionId: session.id,
        userId: user.id,
        saint,
        session,
        user,
      });

      try {
        const savedLoan = await manager.save(loan);
        return this.serializeSaintLoan(savedLoan as SaintLoan, user, session);
      } catch (error) {
        if (error?.code === '23505') {
          if (error.constraint === 'UQ_saint_loans_session_saint') {
            throw new BadRequestException('Este santo ya está asignado en la sesión');
          }
          if (error.constraint === 'UQ_saint_loans_session_user') {
            throw new BadRequestException('Este usuario ya lleva un santo en la sesión');
          }
        }
        throw error;
      }
    });
  }

  async getSaintLoanHistory() {
    const loans = await this.saintLoanRepository.find({
      relations: ['user', 'session'],
      order: { createdAt: 'DESC' },
    });
    const counts = new Map<string, { userId: string; userName: string; saints: Record<SaintName, number> }>();

    for (const loan of loans) {
      const current = counts.get(loan.userId) ?? {
        userId: loan.userId,
        userName: loan.user?.name ?? 'Usuario desconocido',
        saints: {
          [SaintName.ROSA_MISTICA]: 0,
          [SaintName.MEDALLA_MILAGROSA]: 0,
          [SaintName.SAGRADO_CORAZON]: 0,
        },
      };
      current.saints[loan.saint] += 1;
      counts.set(loan.userId, current);
    }

    return {
      catalog: Object.values(SaintName),
      loans: loans.map((loan) => this.serializeSaintLoan(loan)),
      counts: Array.from(counts.values()),
    };
  }

  private serializeSaintLoan(loan: SaintLoan, user = loan.user, session = loan.session) {
    return {
      id: loan.id,
      saint: loan.saint,
      createdAt: loan.createdAt,
      user: user ? { id: user.id, name: user.name, identification: user.identification } : undefined,
      session: session ? { id: session.id, sessionId: session.sessionId, name: session.name } : undefined,
    };
  }

  /**
   * Crea una nueva sesión y genera su QR
   */
  async createSession(dto: CreateSessionDto) {
    // Generar sessionId único
    const sessionId = `SESSION-${new Date().toISOString().split('T')[0]}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Generar PIN de 4 dígitos
    const sessionPin = (Math.floor(1000 + Math.random() * 9000)).toString();

    const session = this.sessionRepository.create({
      sessionId,
      name: dto.name,
      startsAt: new Date(dto.startsAt),
      endsAt: new Date(dto.endsAt),
      isActive: true,
      sessionPin,
    });

    await this.sessionRepository.save(session);

    // Generar QR
    const qrCode = await this.qrService.generateQRCode(sessionId);

    return {
      id: session.id,
      sessionId: session.sessionId,
      sessionPin: session.sessionPin,
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
      sessionPin: session.sessionPin,
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
   * Sincroniza usuarios desde Google Sheets o lista JSON
   * Crea nuevos usuarios o actualiza existentes
   */
  async syncUsersFromSheet(spreadsheetId?: string) {
    // TODO: Implementar integración real con Google Sheets API
    // Por ahora, retorna instrucciones

    return {
      message: 'Para sincronizar usuarios, use el endpoint POST /admin/users/bulk con un array de usuarios',
      example: {
        users: [
          {
            name: 'María García',
            identification: '12345678',
            email: 'maria@emaus.com',
            pin: '1234',
            role: 'user'
          }
        ]
      },
      note: 'La integración directa con Google Sheets requiere configurar credenciales OAuth2 o Service Account'
    };
  }

  /**
   * Obtiene todos los usuarios registrados con sus grupos
   */
  async getAllUsers() {
    const users = await this.userRepository.find({
      relations: ['group'],
      order: {
        createdAt: 'DESC',
      },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      identification: user.identification,
      flowers: user.flowers,
      flores: user.flowers,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      group: user.group ? {
        id: user.group.id,
        name: user.group.name,
        isActive: user.group.isActive,
      } : null,
    }));
  }

  async getUserPhoto(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      userId: user.id,
      avatar: user.avatar,
      hasPhoto: !!user.avatar,
    };
  }

  async updateUserPhoto(userId: string, avatarPath: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['group'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const previousAvatar = user.avatar;
    user.avatar = avatarPath;
    await this.userRepository.save(user);
    this.imageService.removeStoredPhoto(previousAvatar);

    return this.serializeUser(user);
  }

  /**
   * Sincronización masiva de usuarios desde array JSON
   * Crea o actualiza usuarios en batch
   */
  async bulkSyncUsers(users: Array<{
    name: string;
    identification: string;
    email?: string;
    pin?: string;
    role?: string;
  }>) {
    const results = {
      created: [],
      updated: [],
      errors: [],
      total: users.length,
    };

    for (const userData of users) {
      try {
        // Buscar usuario existente por identification
        const existingUser = await this.userRepository.findOne({
          where: { identification: userData.identification },
        });

        if (existingUser) {
          // Actualizar usuario existente
          existingUser.name = userData.name;
          
          // Actualizar email si se proporciona
          if (userData.email) {
            existingUser.email = userData.email;
          }
          
          // Solo actualizar PIN si se proporciona uno nuevo
          if (userData.pin && userData.pin !== '****') {
            existingUser.pinHash = await this.authService.hashPin(userData.pin);
          }
          
          if (userData.role && (userData.role === 'user' || userData.role === 'admin')) {
            existingUser.role = userData.role as UserRole;
          }

          await this.userRepository.save(existingUser);
          
          results.updated.push({
            identification: userData.identification,
            name: userData.name,
          });
        } else {
          // Crear nuevo usuario
          const pinHash = userData.pin ? await this.authService.hashPin(userData.pin) : null;
          
          const newUser = this.userRepository.create({
            name: userData.name,
            identification: userData.identification,
            email: userData.email || null,
            pinHash,
            role: (userData.role === 'admin' ? UserRole.ADMIN : UserRole.USER),
            flowers: 0,
          });

          await this.userRepository.save(newUser);
          
          results.created.push({
            identification: userData.identification,
            name: userData.name,
          });
        }
      } catch (error) {
        results.errors.push({
          identification: userData.identification,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Importa usuarios desde contenido CSV
   * Formato esperado: name,identification,email,pin,role
   * Email y PIN son opcionales
   */
  async importUsersFromCSV(csvContent: string) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new BadRequestException('El archivo CSV está vacío');
    }

    // Detectar si tiene encabezado
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('identification');
    
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const users = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Parsear CSV respetando comillas
      const values = this.parseCSVLine(line);
      
      if (values.length < 2) {
        continue; // Saltar líneas inválidas (mínimo name + identification)
      }

      users.push({
        name: values[0]?.trim() || '',
        identification: values[1]?.trim() || '',
        email: values[2]?.trim() || null,
        pin: values[3]?.trim() || null,
        role: values[4]?.trim() || 'user',
      });
    }

    if (users.length === 0) {
      throw new BadRequestException('No se encontraron usuarios válidos en el CSV');
    }

    // Usar el método existente de sincronización masiva
    return this.bulkSyncUsers(users);
  }

  /**
   * Parsea una línea CSV respetando comillas y comas dentro de campos
   */
  private parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Saltar la siguiente comilla
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Crea un usuario manualmente (útil para testing)
   */
  async createUser(data: {
    name: string;
    identification: string;
    email?: string;
    pin?: string;
    role?: UserRole;
  }) {
    const existingUser = await this.userRepository.findOne({
      where: { identification: data.identification },
    });

    if (existingUser) {
      throw new BadRequestException('El usuario ya existe con esa identificación');
    }

    const pinHash = data.pin ? await this.authService.hashPin(data.pin) : null;

    const user = this.userRepository.create({
      name: data.name,
      identification: data.identification,
      email: data.email || null,
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

  /**
   * Registra asistencias manualmente para un usuario a múltiples sesiones
   * Sin validar si las sesiones están activas o vencidas (privilegio de admin)
   */
  async registerAttendanceManually(dto: RegisterAttendanceDto) {
    // Validar que el usuario existe
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Validar que todas las sesiones existen
    const sessions = await this.sessionRepository.find({
      where: { id: In(dto.sessionIds) },
    });

    if (sessions.length !== dto.sessionIds.length) {
      const foundIds = sessions.map(s => s.id);
      const missingIds = dto.sessionIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(
        `Sesiones no encontradas: ${missingIds.join(', ')}`
      );
    }

    const results = {
      registered: [],
      alreadyRegistered: [],
      flowersAdded: 0,
      totalFlowers: user.flowers,
    };

    // Registrar asistencias dentro de una transacción
    await this.dataSource.transaction(async (manager) => {
      for (const session of sessions) {
        try {
          // Verificar si ya existe la asistencia
          const existingAttendance = await manager.findOne(Attendance, {
            where: {
              user: { id: user.id },
              session: { id: session.id },
            },
          });

          if (existingAttendance) {
            results.alreadyRegistered.push({
              sessionId: session.id,
              sessionName: session.name,
            });
            continue;
          }

          // Crear la asistencia
          const attendance = manager.create(Attendance, {
            user: user,
            session: session,
            rawQr: 'MANUAL_ADMIN_REGISTRATION',
          });

          await manager.save(attendance);

          // Incrementar flores del usuario
          user.flowers += 1;
          results.flowersAdded += 1;

          results.registered.push({
            sessionId: session.id,
            sessionName: session.name,
            date: session.startsAt,
          });
        } catch (error) {
          // Si hay error de constraint unique, lo consideramos ya registrado
          if (error.code === '23505') {
            results.alreadyRegistered.push({
              sessionId: session.id,
              sessionName: session.name,
            });
          } else {
            throw error;
          }
        }
      }

      // Actualizar flores del usuario
      if (results.flowersAdded > 0) {
        await manager.save(user);
        results.totalFlowers = user.flowers;
      }
    });

    return {
      message: 'Proceso de registro completado',
      userId: user.id,
      userName: user.name,
      registered: results.registered.length,
      alreadyRegistered: results.alreadyRegistered.length,
      flowersAdded: results.flowersAdded,
      totalFlowers: results.totalFlowers,
      details: {
        registered: results.registered,
        alreadyRegistered: results.alreadyRegistered,
      },
    };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      identification: user.identification,
      flowers: user.flowers,
      flores: user.flowers,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      group: user.group ? {
        id: user.group.id,
        name: user.group.name,
        isActive: user.group.isActive,
      } : null,
    };
  }
}
