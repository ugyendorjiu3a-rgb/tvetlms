import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields — matters since this API accepts payloads generated offline by clients that may lag behind the server's DTO shape
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.enableCors({ origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'), credentials: true });
  app.setGlobalPrefix('api');

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`TVET e-Gateway backend listening on http://localhost:${port}/api`);
}

bootstrap();
