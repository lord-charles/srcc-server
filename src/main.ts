import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable CORS
  app.enableCors();

  // Use global validation pipe with strict settings
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true, // Strip properties that don't have decorators
  //     forbidNonWhitelisted: true, // Throw errors if non-whitelisted values are provided
  //     transform: true, // Auto-transform payloads to DTO instances
  //     transformOptions: {
  //       enableImplicitConversion: true, // Allow implicit conversion of primitive types
  //     },
  //   }),
  // );

  // Set global prefix for all routes
  app.setGlobalPrefix('srcc/api');

  // Get the configuration service
  const configService = app.get(ConfigService);

  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('SRCC API')
    .setDescription('The SRCC API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/') // Add root server to ensure paths are correct
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger under the global prefix path
  SwaggerModule.setup('srcc/api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      defaultModelsExpandDepth: -1, // Hide schemas by default
      displayRequestDuration: true, // Show request duration
      filter: true, // Enable filtering operations
      tagsSorter: 'alpha', // Sort tags alphabetically
      operationsSorter: 'alpha', // Sort operations alphabetically
    },
    customSiteTitle: 'SRCC API Documentation',
    customCss: '.swagger-ui .topbar { display: none }', // Hide the top bar
  });

  const port = configService.get<number>('PORT', 5000);
  await app.listen(port, '0.0.0.0');

  // Log the URLs
  const logger = new Logger('Bootstrap');
  logger.log(`Server is running on: http://localhost:${port}`);
  logger.log(
    `API Documentation available at: http://localhost:${port}/srcc/api/docs`,
  );
  logger.log(`API Base URL: http://localhost:${port}/srcc/api`);
;
}
bootstrap();
