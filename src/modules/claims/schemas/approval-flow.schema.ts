import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export interface ApprovalStep {
  stepNumber: number;
  role: string;
  department: string;
  description: string;
  nextStatus: string;
}

@Schema({ timestamps: true })
export class ApprovalFlow {
  @ApiProperty({
    example: 'SRCC',
    description: 'Department code this approval flow applies to',
  })
  @Prop({ required: true, unique: true })
  department: string;

  @ApiProperty({
    description: 'Array of approval steps in order',
    type: [Object],
  })
  @Prop({
    required: true,
    type: [{
      stepNumber: { type: Number, required: true },
      role: { type: String, required: true },
      department: { type: String, required: true },
      description: { type: String, required: true },
      nextStatus: { type: String, required: true }
    }]
  })
  steps: ApprovalStep[];

  @ApiProperty({
    example: true,
    description: 'Whether this approval flow is currently active',
  })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({
    example: 'Standard SRCC approval flow',
    description: 'Description of this approval flow',
  })
  @Prop()
  description: string;
}

export type ApprovalFlowDocument = ApprovalFlow & Document;
export const ApprovalFlowSchema = SchemaFactory.createForClass(ApprovalFlow);
