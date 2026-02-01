import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
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

  await app.listen(port);

  console.log(`🌸 Emaús Mujeres API running on port ${port}`);
}

bootstrap();
