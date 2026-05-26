import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentRequestController } from './payment-request.controller';
import { PaymentRequestService } from './payment-request.service';
import { PaymentRequest, PaymentRequestSchema } from './schemas/payment-request.schema';
import { PaymentVoucher, PaymentVoucherSchema } from './schemas/payment-voucher.schema';
import { Project, ProjectSchema } from '../project/schemas/project.schema';
import { Lpo, LpoSchema } from '../lpo/schemas/lpo.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentRequest.name, schema: PaymentRequestSchema },
      { name: PaymentVoucher.name, schema: PaymentVoucherSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Lpo.name, schema: LpoSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [PaymentRequestController],
  providers: [PaymentRequestService],
  exports: [PaymentRequestService],
})
export class PaymentRequestModule {}
