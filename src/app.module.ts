import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemLogsModule } from './modules/system-logs/system-logs.module';
import { ProjectModule } from './modules/project/project.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { ImprestModule } from './modules/imprest/imprest.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL') || 60000, // 60 seconds in milliseconds
            limit: configService.get<number>('THROTTLE_LIMIT') || 100, // 100 requests per TTL
          },
        ],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    DatabaseModule,
    SystemConfigModule,
    NotificationsModule,
    SystemLogsModule,
    ProjectModule,
    ClaimsModule,
    ImprestModule,
  ],
  controllers: [],
  providers: [
    // Apply throttler globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
