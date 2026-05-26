import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PaymentRequestDocument = PaymentRequest & Document;

export enum PaymentRequestStatus {
  PENDING_HOD_APPROVAL = 'pending_hod_approval',
  HOD_APPROVED = 'hod_approved',
  REJECTED = 'rejected',
  REVISION_REQUESTED = 'revision_requested',
}

@Schema({ _id: false })
class RequestAuditLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  actionBy: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ default: Date.now })
  actionAt: Date;

  @Prop()
  comments?: string;
}
const RequestAuditLogSchema = SchemaFactory.createForClass(RequestAuditLog);

@Schema({ timestamps: true })
export class PaymentRequest {
  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Lpo', required: true })
  lpoId: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true })
  amount: number;

  @ApiProperty()
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  requestedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop()
  grnUrl?: string; // Goods Received Note URL

  @ApiProperty()
  @Prop({
    required: true,
    enum: PaymentRequestStatus,
    default: PaymentRequestStatus.PENDING_HOD_APPROVAL,
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
  @Prop({ type: [RequestAuditLogSchema], default: [] })
  auditTrail: RequestAuditLog[];
}

export const PaymentRequestSchema = SchemaFactory.createForClass(PaymentRequest);
