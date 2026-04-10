import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type LpoDocument = Lpo & Document;

@Schema({ _id: false })
class LpoItem {
  @Prop({ required: true })
  noOfDays: number;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  quantity: number;

  @Prop({ required: true })
  rate: number;

  @Prop({ required: true })
  total: number;
}
const LpoItemSchema = SchemaFactory.createForClass(LpoItem);

export enum LpoStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  HOD_APPROVED = 'hod_approved',
  FINANCE_APPROVED = 'finance_approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class Lpo {
  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
  })
  supplierId: MongooseSchema.Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, unique: true })
  lpoNo: string;

  @ApiProperty()
  @Prop({ required: true })
  lpoDate: Date;

  @ApiProperty()
  @Prop({ type: [LpoItemSchema], required: true })
  items: LpoItem[];

  @ApiProperty()
  @Prop({ required: true })
  subTotal: number;

  @ApiProperty()
  @Prop({ required: true })
  vatAmount: number;

  @ApiProperty()
  @Prop({ required: true })
  totalAmount: number;

  @ApiProperty()
  @Prop({ required: true, default: 'KES' })
  currency: string;

  @ApiProperty()
  @Prop({ required: true, enum: LpoStatus, default: LpoStatus.SUBMITTED })
  status: string;

  @ApiProperty()
  @Prop({ default: 30 })
  validityDays: number;

  @ApiProperty()
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  preparedBy: MongooseSchema.Types.ObjectId;
}

export const LpoSchema = SchemaFactory.createForClass(Lpo);

// Auto-generate LPO Number before validate or save
LpoSchema.pre('validate', async function (next) {
  if (this.isNew && !this.lpoNo) {
    const date = new Date();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    // Using a random alphanumeric or count for simplicity without a seq collection
    const randomCounter = Math.floor(100 + Math.random() * 900);
    this.lpoNo = `LPO/${month}/${randomCounter}`;
  }
  next();
});
