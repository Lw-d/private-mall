import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolve } from 'node:path';

import { AppModule } from './modules/app.module';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';
import { ResponseInterceptor } from './modules/common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  app.useStaticAssets(
    resolve(process.cwd(), configService.get<string>('UPLOAD_LOCAL_DIR') ?? 'uploads'),
    { prefix: '/uploads/' },
  );
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  if (configService.get<string>('ENABLE_SWAGGER', 'true') !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Mall System API')
      .setDescription('Private-domain miniapp mall API documentation.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
