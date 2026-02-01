import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requests sin origin (Postman, curl, same-origin)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  console.log('JWT_SECRET set?', Boolean(process.env.JWT_SECRET));
  console.log("JWT_SECRET exists:", Boolean(process.env.JWT_SECRET));
  console.log("NODE_ENV:", process.env.NODE_ENV);

  await app.listen(port, '0.0.0.0');

  console.log(`🌸 Emaús Mujeres API running on port ${port}`);
}

bootstrap();
