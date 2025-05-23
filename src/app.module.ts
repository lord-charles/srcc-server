import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    AuthModule,
    DatabaseModule,
    SystemConfigModule,
    NotificationsModule,
    SystemLogsModule,
    ProjectModule,
    ClaimsModule,
    ImprestModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
