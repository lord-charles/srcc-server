import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { LoggerMiddleware } from './middleware/logger.middleware';
import { SystemConfigModule } from './modules/system-config/system-config.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemLogsModule } from './modules/system-logs/system-logs.module';
import { ProjectModule } from './modules/project/project.module';
import { ContractorModule } from './modules/contractor/contractor.module';
import { ContractModule } from './modules/contract/contract.module';

@Module({
  imports: [
    AuthModule,
    DatabaseModule,
    SystemConfigModule,
    NotificationsModule,
    SystemLogsModule,
    ProjectModule,
    ContractorModule,
    ContractModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
