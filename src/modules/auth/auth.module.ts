import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { NotificationService } from '../notifications/services/notification.service';
import { SystemLogsService } from '../system-logs/services/system-logs.service';
import {
  SystemLog,
  SystemLogSchema,
} from '../system-logs/schemas/system-log.schema';
import { ConsultantController } from './consultant.controller';
import { ConsultantService } from './consultant.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { SystemLogsModule } from '../system-logs/system-logs.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Organization.name, schema: OrganizationSchema },
      { name: SystemLog.name, schema: SystemLogSchema },
    ]),
    CloudinaryModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h', // Set a fixed 24 hour expiration
        },
      }),
    }),
    SystemLogsModule,
  ],
  controllers: [AuthController, UserController, ConsultantController],
  providers: [
    AuthService,
    UserService,
    ConsultantService,
    NotificationService,
    SystemLogsService,
    JwtStrategy,
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, UserService, JwtModule],
})
export class AuthModule { }
