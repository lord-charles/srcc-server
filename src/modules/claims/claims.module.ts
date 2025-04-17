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
import { ApprovalFlow, ApprovalFlowSchema } from './schemas/approval-flow.schema';
import { ApprovalFlowService } from './approval-flow.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Claim.name, schema: ClaimSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: ApprovalFlow.name, schema: ApprovalFlowSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService, ClaimsNotificationService, ApprovalFlowService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
