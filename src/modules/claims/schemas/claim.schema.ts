import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Types as MongooseSchema } from 'mongoose';

export type ClaimDocument = Claim & Document;

@Schema({ timestamps: true })
export class Claim {
  @ApiProperty({ description: 'Reference to the project' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Reference to the team member contract' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'Contract', required: true })
  contractId: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Team member making the claim' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  claimantId: MongooseSchema.ObjectId;

  @ApiProperty({
    example: 50000,
    description: 'Amount being claimed',
  })
  @Prop({ required: true })
  amount: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency of the claim',
  })
  @Prop({ required: true, trim: true })
  currency: string;

  @ApiProperty({
    description: 'Milestones this claim is associated with',
  })
  @Prop({
    type: [{
      milestoneId: { type: String, required: true },
      title: { type: String, required: true },
      percentageClaimed: { type: Number, required: true },
      maxClaimableAmount: { type: Number, required: true },
      previouslyClaimed: { type: Number, required: true, default: 0 },
      currentClaim: { type: Number, required: true },
      remainingClaimable: { type: Number, required: true },
    }],
    required: true
  })
  milestones: {
    milestoneId: string;
    title: string;
    percentageClaimed: number;
    maxClaimableAmount: number;
    previouslyClaimed: number;
    currentClaim: number;
    remainingClaimable: number;
  }[];

  @ApiProperty({
    example: 'pending_checker_approval',
    description: 'Current status of the claim',
    enum: [
      'draft',
      'pending_checker_approval',
      'pending_manager_approval',
      'pending_finance_approval',
      'approved',
      'rejected',
      'paid',
      'cancelled',
      'revision_requested'
    ],
  })
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_checker_approval',
      'pending_manager_approval',
      'pending_finance_approval',
      'approved',
      'rejected',
      'paid',
      'cancelled',
      'revision_requested'
    ],
    default: 'draft',
  })
  status: string;

  @ApiProperty({ description: 'Current version of the claim' })
  @Prop({ type: Number, default: 1 })
  version: number;

  @ApiProperty({ description: 'Deadline for current approval level' })
  @Prop({ type: Date })
  currentLevelDeadline?: Date;

  @ApiProperty({ description: 'Revision request details if status is revision_requested' })
  @Prop({
    type: {
      requestedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
      requestedAt: Date,
      reason: String,
      returnToStatus: String,
      returnToLevel: String,
      comments: String,
    },
    _id: false,
  })
  revisionRequest?: {
    requestedBy: MongooseSchema.ObjectId;
    requestedAt: Date;
    reason: string;
    returnToStatus: string;
    returnToLevel: string;
    comments?: string;
  };

  @ApiProperty({ description: 'Supporting documents for the claim' })
  @Prop({
    type: [{
      url: { type: String, required: true },
      name: { type: String, required: true },
      type: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: MongooseSchema.ObjectId, ref: 'User', required: true },
    }],
    default: [],
  })
  documents: {
    url: string;
    name: string;
    type: string;
    uploadedAt: Date;
    uploadedBy: MongooseSchema.ObjectId;
  }[];

  @ApiProperty({ description: 'Approval details' })
  @Prop({
    type: {
      checkerApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
      },
      managerApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
      },
      financeApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
      },
    },
    _id: false,
  })
  approval?: {
    checkerApproval?: {
      approvedBy: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
    };
    managerApproval?: {
      approvedBy: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
    };
    financeApproval?: {
      approvedBy: MongooseSchema.ObjectId;
      approvedAt: Date;
      comments?: string;
    };
  };

  @ApiProperty({ description: 'Payment details once claim is paid' })
  @Prop({
    type: {
      paidBy: { type: MongooseSchema.ObjectId, ref: 'User' },
      paidAt: Date,
      transactionId: String,
      paymentMethod: String,
      reference: String,
      bankAccount: {
        accountName: String,
        accountNumber: String,
        bankName: String,
        branchName: String,
      },
    },
    _id: false,
  })
  payment?: {
    paidBy: MongooseSchema.ObjectId;
    paidAt: Date;
    transactionId: string;
    paymentMethod: string;
    reference: string;
    bankAccount?: {
      accountName: string;
      accountNumber: string;
      bankName: string;
      branchName: string;
    };
  };

  @ApiProperty({ description: 'Rejection details if claim was rejected' })
  @Prop({
    type: {
      rejectedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String,
      level: String,
    },
    _id: false,
  })
  rejection?: {
    rejectedBy: MongooseSchema.ObjectId;
    rejectedAt: Date;
    reason: string;
    level: string;
  };

  @ApiProperty({ description: 'User who created the claim' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'User who last updated the claim' })
  @Prop({ type: MongooseSchema.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.ObjectId;

  @ApiProperty({ description: 'Notes or comments about the claim' })
  @Prop({ type: String })
  notes?: string;

  @ApiProperty({ description: 'Audit trail of all claim changes' })
  @Prop([{
    action: { type: String, required: true },
    performedBy: { type: MongooseSchema.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, required: true },
    details: { type: Object },
    previousValues: { type: Object },
  }])
  auditTrail: {
    action: string;
    performedBy: MongooseSchema.ObjectId;
    performedAt: Date;
    details?: Record<string, any>;
    previousValues?: Record<string, any>;
  }[];
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
