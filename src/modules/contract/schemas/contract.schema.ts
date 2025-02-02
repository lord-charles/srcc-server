import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ContractDocument = Contract & Document;

@Schema({ timestamps: true })
export class Contract {
  @ApiProperty({ example: 'KPA/2025/001', description: 'Contract reference number' })
  @Prop({ required: true, unique: true, trim: true })
  contractNumber: string;

  @ApiProperty({ example: 'Port Infrastructure Development', description: 'Title of the contract' })
  @Prop({ required: true, trim: true })
  title: string;

  @ApiProperty({ example: 'Infrastructure development and modernization of Mombasa Port facilities', description: 'Detailed description of the contract' })
  @Prop({ required: true })
  description: string;

  @ApiProperty({ example: 'PROJECT-001', description: 'Reference to the project' })
  @Prop()
  projectId: string

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Reference to the contractor organization' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: true })
  contractorId: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: 2500000000, description: 'Total contract value in KES' })
  @Prop({ required: true, min: 0 })
  contractValue: number;

  @ApiProperty({ example: 'KES', description: 'Currency code' })
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty({ example: '2025-03-01', description: 'Contract start date' })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({ example: '2027-02-28', description: 'Contract end date' })
  @Prop({ required: true })
  endDate: Date;

  @ApiProperty({ 
    example: 'active', 
    description: 'Contract status',
    enum: ['draft', 'pending_approval', 'active', 'completed', 'terminated', 'suspended']
  })
  @Prop({ 
    required: true,
    enum: ['draft', 'pending_approval', 'active', 'completed', 'terminated', 'suspended'],
    default: 'draft'
  })
  status: string;

  @ApiProperty({ 
    example: 'Open Tender',
    description: 'Procurement method used',
    enum: ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Proposal', 'Request for Quotation']
  })
  @Prop({ 
    required: true,
    enum: ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Proposal', 'Request for Quotation']
  })
  procurementMethod: string;

  @ApiProperty({ example: 'PPRA/2025/123', description: 'Procurement reference number from PPRA' })
  @Prop({ required: true, trim: true })
  procurementReferenceNumber: string;

  @ApiProperty({ description: 'Contract terms and conditions' })
  @Prop({
    type: [{
      clause: { type: String, required: true },
      description: { type: String, required: true }
    }]
  })
  terms: {
    clause: string;
    description: string;
  }[];

  @ApiProperty({ description: 'Contract deliverables' })
  @Prop({
    type: [{
      title: { type: String, required: true },
      description: { type: String, required: true },
      dueDate: { type: Date, required: true },
      completed: { type: Boolean, default: false },
      acceptanceCriteria: [String]
    }]
  })
  deliverables: {
    title: string;
    description: string;
    dueDate: Date;
    completed: boolean;
    acceptanceCriteria: string[];
  }[];

  @ApiProperty({ description: 'Payment schedule' })
  @Prop({
    type: [{
      milestone: { type: String, required: true },
      amount: { type: Number, required: true },
      dueDate: { type: Date, required: true },
      paid: { type: Boolean, default: false },
      paymentDate: Date
    }]
  })
  paymentSchedule: {
    milestone: string;
    amount: number;
    dueDate: Date;
    paid: boolean;
    paymentDate?: Date;
  }[];

  @ApiProperty({ example: true, description: 'Whether performance security is required' })
  @Prop({ required: true, default: false })
  requiresPerformanceSecurity: boolean;

  @ApiProperty({ example: 125000000, description: 'Performance security amount in KES (if required)' })
  @Prop()
  performanceSecurityAmount: number;

  @ApiProperty({ description: 'Contract amendments history' })
  @Prop({
    type: [{
      amendmentNumber: { type: String, required: true },
      description: { type: String, required: true },
      date: { type: Date, required: true },
      approvedBy: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true }
    }]
  })
  amendments: {
    amendmentNumber: string;
    description: string;
    date: Date;
    approvedBy: MongooseSchema.Types.ObjectId;
  }[];

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'User who created the contract' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Contract manager assigned to oversee the contract' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  contractManagerId: MongooseSchema.Types.ObjectId;
}

export const ContractSchema = SchemaFactory.createForClass(Contract);


@Schema({ _id: false, timestamps: true })
export class Counter {
  @ApiProperty({ required: true })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ required: true, default: 0 })
  @Prop({ required: true, default: 0 })
  sequenceValue: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);

ContractSchema.pre<ContractDocument>('save', async function (next) {
  if (!this.projectId) {
    const counter = await this.db
      .model('Counter', CounterSchema)
      .findOneAndUpdate(
        { name: 'projectId' },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true },
      );
    this.projectId = `PROJECT-${counter.sequenceValue
      .toString()
      .padStart(3, '0')}`;
  }
  next();
});