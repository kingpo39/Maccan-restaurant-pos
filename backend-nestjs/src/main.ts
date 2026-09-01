import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for React frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5180', 'http://localhost:3001'],
    credentials: true,
  });

  // Global Validation Pipe: auto-validates all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // Strip unknown properties
      forbidNonWhitelisted: true, // Throw on unknown properties
      transform: true,           // Auto-transform types
    }),
  );

  // Global API prefix
  app.setGlobalPrefix('api');

  const port = parseInt(process.env.PORT, 10) || 3001;
  await app.listen(port);

  console.log(`
╔══════════════════════════════════════════════╗
║       🍽️  MACCAN RMS - Production API       ║
║       NestJS + Prisma + SQLite/PostgreSQL    ║
╠══════════════════════════════════════════════╣
║  🌐 Server:    http://localhost:${port}          ║
║  📊 API:       http://localhost:${port}/api       ║
║  💚 Health:    http://localhost:${port}/api/auth/me ║
║  📝 Prisma:    npx prisma studio             ║
╚══════════════════════════════════════════════╝
  `);
}
bootstrap();
