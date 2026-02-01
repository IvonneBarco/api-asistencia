import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User, UserRole } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Attendance } from '../entities/attendance.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Session, Attendance],
  synchronize: false,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Conectado a la base de datos');

    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(Session);

    // Crear usuarios de prueba
    const pinHash = await bcrypt.hash('1234', 10);

    const users = [
      {
        name: 'María García',
        email: 'maria@emaus.com',
        pinHash,
        flowers: 45,
        role: UserRole.USER,
      },
      {
        name: 'Ana Martínez',
        email: 'ana@emaus.com',
        pinHash,
        flowers: 120,
        role: UserRole.USER,
      },
      {
        name: 'Isabel Rodríguez',
        email: 'isabel@emaus.com',
        pinHash,
        flowers: 95,
        role: UserRole.USER,
      },
      {
        name: 'Carmen López',
        email: 'carmen@emaus.com',
        pinHash,
        flowers: 78,
        role: UserRole.USER,
      },
      {
        name: 'Admin Emaús',
        email: 'admin@emaus.com',
        pinHash,
        flowers: 0,
        role: UserRole.ADMIN,
      },
    ];

    for (const userData of users) {
      const existing = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existing) {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(`✅ Usuario creado: ${userData.name} (${userData.email})`);
      } else {
        console.log(`⏭️  Usuario ya existe: ${userData.email}`);
      }
    }

    // Crear sesión de prueba
    const sessionData = {
      sessionId: 'SESSION-2026-01-31-TEST123',
      name: 'Encuentro Semanal - Prueba',
      startsAt: new Date('2026-01-31T19:00:00Z'),
      endsAt: new Date('2026-01-31T21:00:00Z'),
      isActive: true,
    };

    const existingSession = await sessionRepository.findOne({
      where: { sessionId: sessionData.sessionId },
    });

    if (!existingSession) {
      const session = sessionRepository.create(sessionData);
      await sessionRepository.save(session);
      console.log(
        `✅ Sesión creada: ${sessionData.name} (${sessionData.sessionId})`,
      );
    } else {
      console.log(`⏭️  Sesión ya existe: ${sessionData.sessionId}`);
    }

    console.log('\n🌸 Seed completado exitosamente');
    console.log('\nCredenciales de prueba:');
    console.log('  Email: maria@emaus.com');
    console.log('  PIN: 1234');
    console.log('\nAdmin:');
    console.log('  Email: admin@emaus.com');
    console.log('  PIN: 1234');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error);
    process.exit(1);
  }
}

seed();
