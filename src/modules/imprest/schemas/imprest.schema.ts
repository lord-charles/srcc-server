import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ImprestDocument = Imprest & Document;

@Schema({ timestamps: true })
export class Imprest {
  @ApiProperty({
    description: 'Name of the employee requesting imprest',
  })
  @Prop({ required: true, trim: true })
  employeeName: string;

  @ApiProperty({
    description: 'Department or account',
  })
  @Prop({ required: false, trim: true })
  department: string;

  @ApiProperty({
    description: 'Date of request',
  })
  @Prop({ required: true })
  requestDate: string;

  @ApiProperty({
    description: 'Due date for accounting (72 hours from approval)',
  })
  @Prop({ required: true })
  dueDate: string;

  @ApiProperty({
    description: 'Reason for payment',
  })
  @Prop({ required: true, trim: true })
  paymentReason: string;

  @ApiProperty({
    description: 'Currency of the amount',
  })
  @Prop({ required: true, trim: true })
  currency: string;

  @ApiProperty({
    description: 'Amount requested',
  })
  @Prop({ required: true, type: Number })
  amount: number;

  @ApiProperty({
    description: 'Type of payment',
    enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
  })
  @Prop({
    required: true,
    enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
  })
  paymentType: string;

  @ApiProperty({
    description: 'Additional explanation or details',
  })
  @Prop({ required: true, trim: true })
  explanation: string;

  @ApiProperty({
    description: 'Status of the imprest request',
    enum: [
      'revision_requested',
      'pending_hod',
      'pending_accountant',
      'approved',
      'rejected',
      'disbursed',
      'pending_acknowledgment',
      'disputed',
      'resolved_dispute',
      'pending_accounting_approval',
      'accounted',
      'overdue',
    ],
  })
  @Prop({
    required: true,
    enum: [
      'revision_requested',
      'pending_hod',
      'pending_accountant',
      'approved',
      'rejected',
      'disbursed',
      'pending_acknowledgment',
      'disputed',
      'resolved_dispute',
      'pending_accounting_approval',
      'accounted',
      'overdue',
    ],
    default: 'pending_hod',
  })
  status: string;

  @ApiProperty({
    description: 'Flag to indicate if this imprest has ever been disputed',
  })
  @Prop({ default: false })
  hasDisputeHistory?: boolean;

  @ApiProperty({ description: 'User who created the request' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @ApiProperty({ description: 'HOD approval details' })
  @Prop({
    type: {
      approvedBy: { type: Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
    },
    _id: false,
  })
  hodApproval?: {
    approvedBy: Types.ObjectId;
    approvedAt: Date;
    comments?: string;
  };

  @ApiProperty({ description: 'Accountant approval details' })
  @Prop({
    type: {
      approvedBy: { type: Types.ObjectId, ref: 'User' },
      approvedAt: Date,
      comments: String,
    },
    _id: false,
  })
  accountantApproval?: {
    approvedBy: Types.ObjectId;
    approvedAt: Date;
    comments?: string;
  };

  @ApiProperty({ description: 'Rejection details if request is rejected' })
  @Prop({
    type: {
      rejectedBy: { type: Types.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String,
    },
    _id: false,
  })
  rejection?: {
    rejectedBy: Types.ObjectId;
    rejectedAt: Date;
    reason: string;
  };

  @ApiProperty({ description: 'Disbursement details' })
  @Prop({
    type: {
      disbursedBy: { type: Types.ObjectId, ref: 'User' },
      disbursedAt: Date,
      amount: Number,
      comments: String,
    },
    _id: false,
  })
  disbursement?: {
    disbursedBy: Types.ObjectId;
    disbursedAt: Date;
    amount: number;
    comments?: string;
  };

  @ApiProperty({ description: 'Accounting details' })
  @Prop({
    type: {
      verifiedBy: { type: Types.ObjectId, ref: 'User' },
      verifiedAt: Date,
      receipts: [
        {
          description: String,
          amount: Number,
          receiptUrl: String,
          uploadedAt: Date,
        },
      ],
      totalAmount: Number,
      balance: Number,
      comments: String,
    },
    _id: false,
  })
  accounting?: {
    verifiedBy: Types.ObjectId;
    verifiedAt: Date;
    receipts: {
      description: string;
      amount: number;
      receiptUrl: string;
      uploadedAt: Date;
    }[];
    totalAmount: number;
    balance: number;
    comments?: string;
  };

  @ApiProperty({ description: 'Money acknowledgment details' })
  @Prop({
    type: {
      acknowledgedBy: { type: Types.ObjectId, ref: 'User' },
      acknowledgedAt: Date,
      received: Boolean,
      comments: String,
    },
    _id: false,
  })
  acknowledgment?: {
    acknowledgedBy: Types.ObjectId;
    acknowledgedAt: Date;
    received: boolean;
    comments?: string;
  };

  @ApiProperty({ description: 'Dispute resolution details' })
  @Prop({
    type: {
      resolvedBy: { type: Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
      resolution: String,
      adminComments: String,
    },
    _id: false,
  })
  disputeResolution?: {
    resolvedBy: Types.ObjectId;
    resolvedAt: Date;
    resolution: string;
    adminComments?: string;
  };

  @ApiProperty({ description: 'Revision request details' })
  @Prop({
    type: {
      requestedBy: { type: Types.ObjectId, ref: 'User' },
      requestedAt: Date,
      reason: String,
    },
    _id: false,
  })
  revision?: {
    requestedBy: Types.ObjectId;
    requestedAt: Date;
    reason: string;
  };

  @ApiProperty({ description: 'Accounting revision request details' })
  @Prop({
    type: {
      requestedBy: { type: Types.ObjectId, ref: 'User' },
      requestedAt: Date,
      reason: String,
    },
    _id: false,
  })
  accountingRevision?: {
    requestedBy: Types.ObjectId;
    requestedAt: Date;
    reason: string;
  };

  @ApiProperty({
    description: 'Optional file attachments for the imprest request',
    type: [Object],
  })
  @Prop({
    type: [
      {
        fileName: String,
        fileUrl: String,
        uploadedAt: Date,
      },
    ],
    default: [],
  })
  attachments?: {
    fileName: string;
    fileUrl: string;
    uploadedAt: Date;
  }[];
}

export const ImprestSchema = SchemaFactory.createForClass(Imprest);
