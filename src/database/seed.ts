import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import { User, UserRole } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { Attendance } from '../entities/attendance.entity';
import { Group } from '../entities/group.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [User, Session, Attendance, Group],
  synchronize: false,
});

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('📦 Conectado a la base de datos');

    const userRepository = AppDataSource.getRepository(User);
    const sessionRepository = AppDataSource.getRepository(Session);
    const groupRepository = AppDataSource.getRepository(Group);

    // Crear grupos predeterminados
    const groupNames = ['Grupo 1', 'Grupo 2', 'Grupo 3'];
    const groups = [];

    for (const groupName of groupNames) {
      const existing = await groupRepository.findOne({
        where: { name: groupName },
      });

      if (!existing) {
        const group = groupRepository.create({
          name: groupName,
          isActive: true,
        });
        await groupRepository.save(group);
        groups.push(group);
        console.log(`✅ Grupo creado: ${groupName}`);
      } else {
        groups.push(existing);
        console.log(`⏭️  Grupo ya existe: ${groupName}`);
      }
    }

    // Crear usuarios de prueba
    const pinHash = await bcrypt.hash('1234', 10);

    const users = [
      {
        name: 'María García',
        identification: '12345678',
        email: 'maria@emaus.com',
        pinHash,
        flowers: 45,
        role: UserRole.USER,
      },
      {
        name: 'Ana Martínez',
        identification: '23456789',
        email: 'ana@emaus.com',
        pinHash,
        flowers: 120,
        role: UserRole.USER,
      },
      {
        name: 'Isabel Rodríguez',
        identification: '34567890',
        email: 'isabel@emaus.com',
        pinHash,
        flowers: 95,
        role: UserRole.USER,
      },
      {
        name: 'Carmen López',
        identification: '45678901',
        email: 'carmen@emaus.com',
        pinHash,
        flowers: 78,
        role: UserRole.USER,
      },
      {
        name: 'Admin Emaús',
        identification: '99999999',
        email: 'admin@emaus.com',
        pinHash,
        flowers: 0,
        role: UserRole.ADMIN,
      },
    ];

    for (const userData of users) {
      const existing = await userRepository.findOne({
        where: { identification: userData.identification },
      });

      if (!existing) {
        const user = userRepository.create(userData);
        await userRepository.save(user);
        console.log(`✅ Usuario creado: ${userData.name} (ID: ${userData.identification})`);
      } else {
        console.log(`⏭️  Usuario ya existe: ${userData.identification}`);
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
    console.log('\nCredenciales de prueba (email + PIN):');
    console.log('  Email: maria@emaus.com');
    console.log('  PIN: 1234');
    console.log('\nO con identificación:');
    console.log('  Identificación: 12345678');
    console.log('\nAdmin:');
    console.log('  Identificación: 99999999');
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
