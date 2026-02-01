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

  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin as string | undefined;

      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Vary', 'Origin');
        res.header('Access-Control-Allow-Credentials', 'true');
      }

      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return res.sendStatus(204);
    }
    next();
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
