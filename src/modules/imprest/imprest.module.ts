import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImprestService } from './imprest.service';
import { ImprestController } from './imprest.controller';
import { Imprest, ImprestSchema } from './schemas/imprest.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificationService } from '../notifications/services/notification.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Imprest.name, schema: ImprestSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CloudinaryModule,

  ],
  controllers: [ImprestController],
  providers: [ImprestService, NotificationService],
  exports: [ImprestService],
})
export class ImprestModule {}

