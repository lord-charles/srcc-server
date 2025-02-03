import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BudgetDocument = Budget & Document;

@Schema({ timestamps: true })
export class Budget {
  @ApiProperty({
    description: 'Name of the project',
    example: 'School Construction Project Phase 1',
    required: true
  })
  @Prop({ required: true })
  projectName: string;

  @ApiProperty({
    description: 'Total value of the project in the specified currency',
    example: 5000000,
    minimum: 0,
    required: true
  })
  @Prop({ required: true, type: Number })
  projectValue: number;

  @ApiProperty({
    description: 'Start date of the budget period',
    example: '2025-02-01T00:00:00.000Z',
    required: true
  })
  @Prop({ required: true, type: Date })
  budgetStartDate: Date;

  @ApiProperty({
    description: 'End date of the budget period',
    example: '2025-12-31T00:00:00.000Z',
    required: true
  })
  @Prop({ required: true, type: Date })
  budgetEndDate: Date;

  @ApiProperty({
    description: 'Category of the budget (e.g., Construction, IT, Marketing)',
    example: 'Construction',
    required: true
  })
  @Prop({ required: true })
  budgetCategory: string;

  @ApiProperty({
    description: 'Currency code used in the budget (ISO 4217)',
    example: 'KES',
    default: 'KES',
    required: true
  })
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty({
    description: 'Total planned cost for all budget items',
    example: 4800000,
    minimum: 0,
    required: true
  })
  @Prop({ required: true, type: Number })
  totalPlannedCost: number;

  @ApiProperty({
    description: 'Total actual cost incurred so far',
    example: 1200000,
    minimum: 0,
    default: 0,
    required: true
  })
  @Prop({ required: true, type: Number, default: 0 })
  totalActualCost: number;

  @ApiProperty({
    description: 'Current status of the budget',
    enum: ['active', 'completed', 'pending'],
    example: 'active',
    default: 'pending',
    required: true
  })
  @Prop({ required: true, enum: ['active', 'completed', 'pending'], default: 'pending' })
  status: string;

  @ApiProperty({
    description: 'Additional notes or comments about the budget',
    example: 'Initial budget for school construction project phase 1, including foundation and basic structure',
    required: false
  })
  @Prop()
  notes: string;

  @ApiProperty({
    description: 'List of individual budget items with their costs and details',
    type: [Object],
    example: [
      {
        itemName: 'Foundation Work',
        plannedCost: 1200000,
        actualCost: 400000,
        description: 'Complete foundation and ground work',
        dateIncurred: '2025-02-15T00:00:00.000Z'
      },
      {
        itemName: 'Building Materials',
        plannedCost: 2500000,
        actualCost: 800000,
        description: 'All construction materials including cement, steel, and bricks',
        dateIncurred: '2025-03-01T00:00:00.000Z'
      }
    ]
  })
  @Prop([
    {
      itemName: { type: String, required: true },
      plannedCost: { type: Number, required: true },
      actualCost: { type: Number, default: 0 },
      description: { type: String },
      dateIncurred: { type: Date },
    },
  ])
  budgetItems: {
    itemName: string;
    plannedCost: number;
    actualCost: number;
    description?: string;
    dateIncurred?: Date;
  }[];

  @ApiProperty({
    description: 'Reference to the associated project',
    example: '65be1234c52d3e001234abce',
    required: true,
    type: String
  })
  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId: Types.ObjectId;

  @ApiProperty({
    description: 'Reference to the user responsible for managing this budget',
    example: '65be1234c52d3e001234abcf',
    required: true,
    type: String
  })
  @Prop({ type: Types.ObjectId, ref: 'User' })
  budgetOwner: Types.ObjectId;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
