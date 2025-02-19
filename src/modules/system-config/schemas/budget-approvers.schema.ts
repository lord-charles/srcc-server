import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BudgetApproversConfigDocument = BudgetApproversConfig & Document;

@Schema({ _id: false })
class ApproverConfig {
  @ApiProperty({ description: 'Reference to the user who can approve' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'Role in the approval process' })
  @Prop({ required: true })
  role: string;

  @ApiProperty({ description: 'Email notifications enabled' })
  @Prop({ default: true })
  emailNotifications: boolean;

  @ApiProperty({ description: 'SMS notifications enabled' })
  @Prop({ default: true })
  smsNotifications: boolean;

  @ApiProperty({ description: 'Maximum amount this person can approve' })
  @Prop({ required: true })
  approvalLimit: number;

  @ApiProperty({ description: 'Backup approver when this person is unavailable' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  backupApproverId?: MongooseSchema.Types.ObjectId;
}

@Schema({ timestamps: true })
export class BudgetApproversConfig {
  @ApiProperty({ description: 'Configuration for budget checkers (Level 2)' })
  @Prop({ type: [ApproverConfig], required: true })
  checkers: ApproverConfig[];

  @ApiProperty({ description: 'Configuration for budget approvers (Level 3)' })
  @Prop({ type: [ApproverConfig], required: true })
  approvers: ApproverConfig[];

  @ApiProperty({ description: 'Configuration for finance approvers (Level 4)' })
  @Prop({ type: [ApproverConfig], required: true })
  financeApprovers: ApproverConfig[];

  @ApiProperty({ description: 'Minimum number of approvers required at each level' })
  @Prop({
    type: {
      checker: { type: Number, required: true, default: 1 },
      approver: { type: Number, required: true, default: 1 },
      finance: { type: Number, required: true, default: 1 }
    },
    _id: false,
    required: true
  })
  minimumApprovals: {
    checker: number;
    approver: number;
    finance: number;
  };

  @ApiProperty({ description: 'Auto-approve if amount is below this value' })
  @Prop({ required: true, default: 0 })
  autoApproveThreshold: number;

  @ApiProperty({ description: 'Currency for the threshold amounts' })
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty({ description: 'Whether to allow parallel approvals' })
  @Prop({ required: true, default: false })
  allowParallelApprovals: boolean;

  @ApiProperty({ description: 'Timeout in hours for each approval level' })
  @Prop({
    type: {
      checker: { type: Number, required: true, default: 24 },
      approver: { type: Number, required: true, default: 48 },
      finance: { type: Number, required: true, default: 72 }
    },
    _id: false,
    required: true
  })
  approvalTimeouts: {
    checker: number;
    approver: number;
    finance: number;
  };
}

export const BudgetApproversConfigSchema = SchemaFactory.createForClass(BudgetApproversConfig);
