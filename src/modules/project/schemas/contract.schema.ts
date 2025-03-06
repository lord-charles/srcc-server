import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ContractDocument = Contract & Document;

@Schema({ timestamps: true })
export class Contract extends Document {
  @ApiProperty({
    example: 'CONT-2024-001',
    description: 'The unique contract number',
  })
  @Prop({ required: true, trim: true, unique: true })
  contractNumber: string;

  @ApiProperty({
    example: 'Project Manager Contract',
    description: 'Description of the contract',
  })
  @Prop({ required: true, trim: true })
  description: string;

  @ApiProperty({
    example: 50000,
    description: 'The total value of the contract',
  })
  @Prop({ required: true })
  contractValue: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency for the contract value',
  })
  @Prop({ required: true, trim: true })
  currency: string;

  @ApiProperty({
    example: 'draft',
    description: 'Contract status',
    enum: [
      'draft',
      'pending_finance_approval',
      'pending_md_approval',
      'pending_signature',
      'active',
      'suspended',
      'terminated',
      'completed',
      'rejected'
    ],
  })
  @Prop({
    required: true,
    enum: [
      'draft',
      'pending_finance_approval',
      'pending_md_approval',
      'pending_signature',
      'active',
      'suspended',
      'terminated',
      'completed',
      'rejected'
    ],
    default: 'draft',
  })
  status: string;

  @ApiProperty({ description: 'User who created the contract' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'User who last updated the contract' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({ example: '2024-12-31', description: 'Contract end date' })
  @Prop({ required: true })
  endDate: Date;

  @ApiProperty({ description: 'Reference to the associated project' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @ApiProperty({
    description:
      'Reference to the contracted user (team member or project manager)',
  })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  contractedUserId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'History of contract amendments' })
  @Prop({
    type: [
      {
        date: { type: Date, required: false },
        description: { type: String, required: false },
        changedFields: { type: [String], required: false },
        approvedBy: {
          type: MongooseSchema.Types.ObjectId,
          ref: 'User',
          required: false,
        },
      },
    ],
  })
  amendments: {
    date?: Date;
    description?: string;
    changedFields?: string[];
    approvedBy?: MongooseSchema.Types.ObjectId;
  }[];

  @ApiProperty({ description: 'Approval workflow tracking' })
  @Prop({
    type: {
      financeApprovals: [{
        approverId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String
      }],
      mdApprovals: [{
        approverId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        comments: String
      }]
    }
  })
  approvalFlow: {
    financeApprovals?: {
      approverId: MongooseSchema.Types.ObjectId;
      approvedAt: Date;
      comments?: string;
    }[];
    mdApprovals?: {
      approverId: MongooseSchema.Types.ObjectId;
      approvedAt: Date;
      comments?: string;
    }[];
  };

  @ApiProperty({ description: 'Current approval level deadline' })
  @Prop()
  currentLevelDeadline?: Date;

  @ApiProperty({ description: 'Final approval details' })
  @Prop({
    type: {
      approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      approvedAt: Date
    }
  })
  finalApproval?: {
    approvedBy: MongooseSchema.Types.ObjectId;
    approvedAt: Date;
  };

  @ApiProperty({ description: 'Rejection details if contract is rejected' })
  @Prop({
    type: {
      rejectedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      rejectedAt: Date,
      reason: String,
      level: String
    }
  })
  rejectionDetails?: {
    rejectedBy: MongooseSchema.Types.ObjectId;
    rejectedAt: Date;
    reason: string;
    level: string;
  };
}

export const ContractSchema = SchemaFactory.createForClass(Contract);
