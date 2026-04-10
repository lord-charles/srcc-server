import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema({ timestamps: true })
export class Supplier {
  @ApiProperty({
    example: 'Tech Solutions Ltd',
    description: 'The name of the supplier company or individual',
  })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({
    example: 'info@techsolutions.com',
    description: 'Primary email address',
  })
  @Prop({ required: true, trim: true })
  email: string;

  @ApiProperty({
    example: '+254700000000',
    description: 'Primary phone number',
  })
  @Prop({ required: true, trim: true })
  phone: string;

  @ApiProperty({
    example: 'P.O Box 12345, Nairobi',
    description: 'Physical or postal address',
  })
  @Prop({ required: true })
  address: string;

  @ApiProperty({ description: 'Primary contact person details' })
  @Prop({
    type: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
    },
    _id: false,
  })
  contactPerson?: {
    name: string;
    phone: string;
    email: string;
  };

  // Legal & Compliance
  @ApiProperty({
    example: 'A000000000X',
    description: 'KRA PIN or relevant tax identification',
  })
  @Prop({ required: true, trim: true })
  kraPin: string;

  @ApiProperty({
    example: 'CPR/2021/12345',
    description: 'Certificate of Incorporation / Registration Number',
  })
  @Prop({ required: true, trim: true })
  registrationNumber: string;

  @ApiPropertyOptional({
    description: 'Date when the tax compliance certificate expires',
  })
  @Prop({ required: false })
  taxComplianceCertificateExpiry?: Date;

  @ApiPropertyOptional({
    description: 'Cloudinary URL for KRA PIN document',
  })
  @Prop({ required: false })
  kraPinUrl?: string;

  @ApiPropertyOptional({
    description: 'Cloudinary URL for Incorporation document',
  })
  @Prop({ required: false })
  incorporationCertificateUrl?: string;

  @ApiPropertyOptional({
    description:
      'Cloudinary URL for Business Permit or other compliance documents',
  })
  @Prop({ required: false })
  otherComplianceDocumentUrl?: string;

  // Financial Details
  @ApiProperty({ example: 'Equity Bank', description: 'Bank Name' })
  @Prop({ required: true, trim: true })
  bankName: string;

  @ApiProperty({ example: 'Westlands Branch', description: 'Bank Branch' })
  @Prop({ required: true, trim: true })
  bankBranch: string;

  @ApiProperty({
    example: 'Tech Solutions Ltd',
    description: 'Name on the Bank Account',
  })
  @Prop({ required: true, trim: true })
  accountName: string;

  @ApiProperty({ example: '0123456789', description: 'Account Number' })
  @Prop({ required: true, trim: true })
  accountNumber: string;

  // Business Profile
  @ApiProperty({
    example: 'Both',
    description: 'Category of supplier',
    enum: ['Goods', 'Services', 'Both'],
  })
  @Prop({
    required: true,
    enum: ['Goods', 'Services', 'Both'],
    default: 'Goods',
  })
  supplierCategory: string;

  @ApiPropertyOptional({
    description: 'Specific categories of goods/services provided',
    type: [String],
  })
  @Prop({ type: [String], default: [] })
  servicesProvided?: string[];

  @ApiProperty({
    example: 'active',
    description: 'Status of the supplier in the system',
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
  })
  @Prop({
    required: true,
    enum: ['active', 'inactive', 'suspended', 'pending_approval'],
    default: 'pending_approval',
  })
  status: string;

  // Metrics & Tracking
  @ApiPropertyOptional({
    example: 4.5,
    description: 'Supplier performance rating (1-5)',
  })
  @Prop({ required: false, min: 1, max: 5 })
  rating?: number;

  @ApiProperty({ description: 'Indicates if the supplier is soft-deleted' })
  @Prop({ default: false })
  isDeleted: boolean;

  @ApiProperty({ description: 'User who created the supplier record' })
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  createdBy?: MongooseSchema.Types.ObjectId;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
