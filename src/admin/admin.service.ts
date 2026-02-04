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
   * Sincronización masiva de usuarios desde array JSON
   * Crea o actualiza usuarios en batch
   */
  async bulkSyncUsers(users: Array<{
    name: string;
    email: string;
    pin: string;
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
        // Buscar usuario existente
        const existingUser = await this.userRepository.findOne({
          where: { email: userData.email },
        });

        if (existingUser) {
          // Actualizar usuario existente
          existingUser.name = userData.name;
          
          // Solo actualizar PIN si se proporciona uno nuevo
          if (userData.pin && userData.pin !== '****') {
            existingUser.pinHash = await this.authService.hashPin(userData.pin);
          }
          
          if (userData.role && (userData.role === 'user' || userData.role === 'admin')) {
            existingUser.role = userData.role as UserRole;
          }

          await this.userRepository.save(existingUser);
          
          results.updated.push({
            email: userData.email,
            name: userData.name,
          });
        } else {
          // Crear nuevo usuario
          const pinHash = await this.authService.hashPin(userData.pin);
          
          const newUser = this.userRepository.create({
            name: userData.name,
            email: userData.email,
            pinHash,
            role: (userData.role === 'admin' ? UserRole.ADMIN : UserRole.USER),
            flowers: 0,
          });

          await this.userRepository.save(newUser);
          
          results.created.push({
            email: userData.email,
            name: userData.name,
          });
        }
      } catch (error) {
        results.errors.push({
          email: userData.email,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Importa usuarios desde contenido CSV
   * Formato esperado: name,email,pin,role
   */
  async importUsersFromCSV(csvContent: string) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new BadRequestException('El archivo CSV está vacío');
    }

    // Detectar si tiene encabezado
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('email');
    
    const dataLines = hasHeader ? lines.slice(1) : lines;
    const users = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Parsear CSV respetando comillas
      const values = this.parseCSVLine(line);
      
      if (values.length < 3) {
        continue; // Saltar líneas inválidas
      }

      users.push({
        name: values[0]?.trim() || '',
        email: values[1]?.trim() || '',
        pin: values[2]?.trim() || '',
        role: values[3]?.trim() || 'user',
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
