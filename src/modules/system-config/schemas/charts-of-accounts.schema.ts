import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ChartsOfAccountsDocument = ChartsOfAccounts & Document;

@Schema({ _id: false })
class SubAccount {
  @ApiProperty({ description: 'Sub-account number', example: '00001' })
  @Prop({ required: true })
  subAccountNumber: string;

  @ApiProperty({ description: 'Sub-account name', example: 'SUP Books' })
  @Prop({ required: true })
  subAccountName: string;

  @ApiProperty({
    description: 'Account type',
    example: 'EX',
    enum: ['EX', 'IN', 'AS', 'LI', 'EQ'],
  })
  @Prop({ required: true })
  type: string;
}

@Schema({ _id: false })
class Mapping {
  @ApiProperty({ description: 'Section identifier', example: 'unknown' })
  @Prop({ required: true })
  section: string;

  @ApiProperty({ description: 'Chart code', example: 'SR' })
  @Prop({ required: true })
  chart: string;

  @ApiProperty({ description: 'Account number', example: '2101400' })
  @Prop({ required: true })
  accountNumber: string;

  @ApiProperty({ description: 'Account name', example: 'DLC MANAGER' })
  @Prop({ required: false })
  accountName?: string;

  @ApiProperty({ description: 'Account name for 2025', example: 'DLC MANAGER' })
  @Prop({ required: false })
  accountName2025?: string;

  @ApiProperty({ description: 'Object code', example: '265' })
  @Prop({ required: true })
  objectCode: string;

  @ApiProperty({ description: 'Object code name', example: 'REVISION KITS' })
  @Prop({ required: true })
  objectCodeName: string;

  @ApiProperty({
    description: 'Financial statement type',
    example: 'Income Statement',
  })
  @Prop({ required: true })
  financialStatement: string;

  @ApiProperty({ description: 'Account type', example: 'Income' })
  @Prop({ required: true })
  type: string;

  @ApiProperty({
    description: 'Financial statement title',
    example: 'Sale of Books',
  })
  @Prop({ required: true })
  fsTitle: string;

  @ApiProperty({
    description: 'Financial statement subtitle',
    example: 'Current Assets',
  })
  @Prop({ required: false })
  fsSubTitle?: string;

  @ApiProperty({ description: 'Whether mapping is active', example: true })
  @Prop({ required: true, default: true })
  mapping: boolean;
}

@Schema({ _id: false })
class Account {
  @ApiProperty({ description: 'Account number', example: '2101400' })
  @Prop({ required: true })
  accountNumber: string;

  @ApiProperty({ description: 'Account name', example: 'DLC MANAGER' })
  @Prop({ required: true })
  accountName: string;

  @ApiProperty({
    description: 'Sub-accounts under this account',
    type: [SubAccount],
  })
  @Prop({ type: [SubAccount], default: [] })
  subAccounts: SubAccount[];

  @ApiProperty({ description: 'Account mappings', type: [Mapping] })
  @Prop({ type: [Mapping], default: [] })
  mappings: Mapping[];
}

@Schema({ _id: false })
class ObjectCode {
  @ApiProperty({ description: 'Object code', example: '100' })
  @Prop({ required: true })
  objectCode: string;

  @ApiProperty({ description: 'Object code name', example: 'APPLICATION FEES' })
  @Prop({ required: true })
  objectCodeName: string;

  @ApiProperty({ description: 'Code type', example: 'IN' })
  @Prop({ required: true })
  type: string;
}

@Schema({ _id: false })
class ChartData {
  @ApiProperty({ description: 'List of accounts', type: [Account] })
  @Prop({ type: [Account], default: [] })
  accounts: Account[];

  @ApiProperty({ description: 'List of object codes', type: [ObjectCode] })
  @Prop({ type: [ObjectCode], default: [] })
  objectCodes: ObjectCode[];

  @ApiProperty({ description: 'Chart-level mappings', type: [Mapping] })
  @Prop({ type: [Mapping], default: [] })
  mappings?: Mapping[];
}

@Schema({ timestamps: true })
export class ChartsOfAccounts {
  @ApiProperty({ description: 'Chart code (e.g., SR, CU, CB)', example: 'SR' })
  @Prop({ required: true, unique: true })
  chartCode: string;

  @ApiProperty({
    description: 'Chart data containing accounts and object codes',
    type: ChartData,
  })
  @Prop({ type: ChartData, required: true })
  data: ChartData;

  @ApiProperty({ description: 'User who created this configuration' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy: MongooseSchema.Types.ObjectId;

  @ApiProperty({ description: 'User who last updated this configuration' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  updatedBy: MongooseSchema.Types.ObjectId;
}

export const ChartsOfAccountsSchema =
  SchemaFactory.createForClass(ChartsOfAccounts);
