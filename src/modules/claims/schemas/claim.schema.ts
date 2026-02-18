import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ClaimStatus =
  | 'draft'
  | 'pending_checker_approval'
  | 'pending_reviewer_approval'
  | 'pending_approver_approval'
  | 'pending_srcc_checker_approval'
  | 'pending_srcc_finance_approval'
  | 'pending_director_approval'
  | 'pending_academic_director_approval'
  | 'pending_finance_approval'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'cancelled'
  | 'revision_requested';

export type ClaimDocument = Claim & Document;

@Schema({ timestamps: true })
export class Claim {
  @ApiProperty({ description: 'Reference to the project' })
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @ApiProperty({ description: 'Reference to the team member contract' })
  @Prop({ type: Types.ObjectId, ref: 'Contract', required: true })
  contractId: Types.ObjectId;

  @ApiProperty({ description: 'Team member making the claim' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  claimantId: Types.ObjectId;

  @ApiProperty({
    description:
      'Coach claim details (units, rate, and totals) for coach-type contracts',
    required: false,
  })
  @Prop({
    type: {
      units: { type: Number },
      rate: { type: Number },
      rateUnit: { type: String, enum: ['per_session', 'per_hour'] },
      unitAmount: { type: Number },
      totalAmount: { type: Number },
    },
    _id: false,
    required: false,
  })
  coachClaim?: {
    units: number;
    rate: number;
    rateUnit: 'per_session' | 'per_hour';
    unitAmount: number;
    totalAmount: number;
  };

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
    type: [
      {
        milestoneId: { type: String, required: true },
        title: { type: String, required: true },
        percentageClaimed: { type: Number, required: true },
        maxClaimableAmount: { type: Number, required: true },
        previouslyClaimed: { type: Number, required: true, default: 0 },
        currentClaim: { type: Number, required: true },
        remainingClaimable: { type: Number, required: true },
      },
    ],
    required: true,
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
  })
  @Prop({
    required: true,
    default: 'draft',
  })
  status: string;

  @ApiProperty({ description: 'Current version of the claim' })
  @Prop({ type: Number, default: 1 })
  version: number;

  @ApiProperty({ description: 'Deadline for current approval level' })
  @Prop({ type: Date })
  currentLevelDeadline?: Date;

  @ApiProperty({
    description: 'Revision request details if status is revision_requested',
  })
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
    requestedBy: Types.ObjectId;
    requestedAt: Date;
    reason: string;
    returnToStatus: string;
    returnToLevel: string;
    comments?: string;
  };

  @ApiProperty({ description: 'Supporting documents for the claim' })
  @Prop({
    type: [
      {
        url: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: {
          type: MongooseSchema.ObjectId,
          ref: 'User',
          required: true,
        },
      },
    ],
    default: [],
  })
  documents: {
    url: string;
    name: string;
    type: string;
    uploadedAt: Date;
    uploadedBy: Types.ObjectId;
  }[];

  @ApiProperty({ description: 'Approval details' })
  @Prop({
    type: {
      checkerApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      reviewerApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      approverApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      srccCheckerApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      srccFinanceApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      directorApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      academicDirectorApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
      financeApproval: {
        approvedBy: { type: MongooseSchema.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String,
        department: String,
      },
    },
    _id: false,
  })
  approval?: {
    checkerApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    reviewerApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    approverApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    srccCheckerApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    srccFinanceApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    directorApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    academicDirectorApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
    };
    financeApproval?: {
      approvedBy: Types.ObjectId;
      approvedAt: Date;
      comments?: string;
      department: string;
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
      paymentAdviceUrl: String,
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
    paidBy: Types.ObjectId;
    paidAt: Date;
    transactionId: string;
    paymentMethod: string;
    reference: string;
    paymentAdviceUrl: string;
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
      projectId: MongooseSchema.Types.ObjectId,
      rejectedAt: Date,
      reason: String,
      level: String,
      department: String,
      rejectedBy: MongooseSchema.Types.ObjectId,
    },
    _id: false,
  })
  rejection?: {
    projectId: Types.ObjectId;
    rejectedAt: Date;
    reason: string;
    level: string;
    department: string;
    rejectedBy: Types.ObjectId;
  };

  @ApiProperty({ description: 'User who created the claim' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({ description: 'User who last updated the claim' })
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @ApiProperty({ description: 'Notes or comments about the claim' })
  @Prop({ type: String })
  notes?: string;

  @ApiProperty({ description: 'Audit trail of all claim changes' })
  @Prop([
    {
      action: { type: String, required: true },
      performedBy: {
        type: MongooseSchema.ObjectId,
        ref: 'User',
        required: true,
      },
      performedAt: { type: Date, required: true },
      details: { type: Object },
      previousValues: { type: Object },
    },
  ])
  auditTrail: {
    action: string;
    performedBy: Types.ObjectId;
    performedAt: Date;
    details?: Record<string, any>;
    previousValues?: Record<string, any>;
  }[];
}

export const ClaimSchema = SchemaFactory.createForClass(Claim);
