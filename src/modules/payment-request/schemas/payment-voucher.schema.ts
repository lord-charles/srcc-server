import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PaymentVoucherDocument = PaymentVoucher & Document;

export enum PaymentVoucherStatus {
  PENDING_FINANCE_APPROVAL = 'pending_finance_approval',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
  REVISION_REQUESTED = 'revision_requested',
}

@Schema({ _id: false })
class VoucherAuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  actionBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ default: Date.now })
  actionAt: Date;

  @Prop()
  comments?: string;
}
const VoucherAuditLogSchema = SchemaFactory.createForClass(VoucherAuditLog);

@Schema({ timestamps: true })
export class PaymentVoucher {
  @ApiProperty()
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'PaymentRequest',
    required: true,
  })
  paymentRequestId: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  voucherNo: string;

  @ApiProperty()
  @Prop({ required: true })
  amount: number;

  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  preparedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({
    required: true,
    enum: PaymentVoucherStatus,
    default: PaymentVoucherStatus.PENDING_FINANCE_APPROVAL,
  })
  status: string;

  @ApiProperty()
  @Prop({
    type: {
      approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
    },
    _id: false,
  })
  approval?: {
    approvedBy: MongooseSchema.Types.ObjectId;
    approvedAt: Date;
    comments?: string;
  };

  @ApiProperty()
  @Prop({
    type: {
      rejectedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String,
    },
    _id: false,
  })
  rejection?: {
    rejectedBy: MongooseSchema.Types.ObjectId;
    rejectedAt: Date;
    reason: string;
  };

  @ApiProperty()
  @Prop({
    type: {
      requestedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      requestedAt: Date,
      comment: String,
    },
    _id: false,
  })
  revision?: {
    requestedBy: MongooseSchema.Types.ObjectId;
    requestedAt: Date;
    comment: string;
  };

  @ApiProperty()
  @Prop({
    type: {
      paidBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      paidAt: Date,
      transactionId: String,
      paymentMethod: String,
      reference: String,
      paymentAdviceUrl: String,
    },
    _id: false,
  })
  payment?: {
    paidBy: MongooseSchema.Types.ObjectId;
    paidAt: Date;
    transactionId?: string;
    paymentMethod?: string;
    reference?: string;
    paymentAdviceUrl: string;
  };

  @ApiProperty()
  @Prop({ type: [VoucherAuditLogSchema], default: [] })
  auditTrail: VoucherAuditLog[];
}

export const PaymentVoucherSchema = SchemaFactory.createForClass(PaymentVoucher);

// Auto-generate Payment Voucher number before validation
PaymentVoucherSchema.pre('validate', async function (next) {
  if (this.isNew && !this.voucherNo) {
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const randomCounter = Math.floor(1000 + Math.random() * 9000);
    this.voucherNo = `PV/${month}/${randomCounter}`;
  }
  next();
});
