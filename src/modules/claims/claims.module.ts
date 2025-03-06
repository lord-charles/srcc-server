import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { ClaimsNotificationService } from './claims-notification.service';
import { Claim, ClaimSchema } from './schemas/claim.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Contract, ContractSchema } from '../project/schemas/contract.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Claim.name, schema: ClaimSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimsNotificationService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
