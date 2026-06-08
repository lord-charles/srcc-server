import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LpoController } from './lpo.controller';
import { LpoService } from './lpo.service';
import { Lpo, LpoSchema } from './schemas/lpo.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lpo.name, schema: LpoSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [LpoController],
  providers: [LpoService],
  exports: [LpoService],
})
export class LpoModule {}
