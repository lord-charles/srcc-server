import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OrganizationDocument = Organization & Document;

// Organization Contact Person Schema
class ContactPerson {
  @ApiProperty({ description: 'Name of contact person', example: 'John Doe' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Position in the organization', example: 'HR Manager' })
  @Prop({ required: true })
  position: string;

  @ApiProperty({ description: 'Contact email', example: 'john.doe@company.com' })
  @Prop({ required: true })
  email: string;

  @ApiProperty({ description: 'Contact phone number', example: '0712345678' })
  @Prop({ required: true })
  phoneNumber: string;
}

// Bank Details Schema
class BankDetails {
  @ApiProperty({ description: 'Name of the bank', example: 'Equity Bank' })
  @Prop({ required: true })
  bankName: string;

  @ApiProperty({ description: 'Bank account number', example: '1234567890' })
  @Prop({ required: true })
  accountNumber: string;

  @ApiProperty({ description: 'Branch code of the bank', example: '123' })
  @Prop({ required: true })
  branchCode: string;
}

@Schema({ timestamps: true })
export class Organization {
  @ApiProperty({ description: 'Company name', example: 'Tech Solutions Ltd' })
  @Prop({ required: true })
  companyName: string;

  @ApiProperty({ description: 'Company registration number', example: 'PVT-1234567X' })
  @Prop({ required: true, unique: true })
  registrationNumber: string;

  @ApiProperty({ description: 'KRA PIN number', example: 'P051234567Q' })
  @Prop({ required: true, unique: true })
  kraPin: string;

  @ApiProperty({ description: 'Physical business address', example: 'Westlands Business Park, Block A' })
  @Prop({ required: true })
  businessAddress: string;

  @ApiProperty({ description: 'Postal business address', example: 'P.O. Box 12345-00100' })
  @Prop()
  postalAddress?: string;

  @ApiProperty({ description: 'County of operation', example: 'Nairobi' })
  @Prop({ required: true })
  county: string;

  @ApiProperty({ description: 'Business phone number', example: '0712345678' })
  @Prop({ required: true })
  businessPhone: string;

  @ApiProperty({ description: 'Business email', example: 'info@techsolutions.co.ke' })
  @Prop({ required: true, unique: true })
  businessEmail: string;

  @ApiProperty({ description: 'Company website', example: 'https://techsolutions.co.ke' })
  @Prop()
  website?: string;

  @ApiProperty({ description: 'Primary expertise/department', example: 'Software Development' })
  @Prop()
  department: string;

  @ApiProperty({ description: 'Years of operation', example: 5 })
  @Prop({ required: true })
  yearsOfOperation: number;

  @ApiProperty({ description: 'Hourly rate in KES', example: 10000 })
  @Prop({ required: true })
  hourlyRate: number;

  @ApiProperty({
    description: 'Services offered by the organization',
    example: ['Software Development', 'IT Consulting', 'Cloud Solutions'],
    type: [String]
  })
  @Prop({ type: [String], required: true })
  servicesOffered: string[];

  @ApiProperty({
    description: 'Industries the organization operates in',
    example: ['Technology', 'Finance', 'Healthcare'],
    type: [String]
  })
  @Prop({ type: [String], required: true })
  industries: string[];

  @ApiProperty({
    description: 'Preferred work type',
    example: ['remote', 'hybrid'],
    enum: ['remote', 'onsite', 'hybrid']
  })
  @Prop({ type: [String], required: true })
  preferredWorkTypes: string[];

  @ApiProperty({ description: 'Contact person details' })
  @Prop({ type: ContactPerson, required: true })
  contactPerson: ContactPerson;

  @ApiProperty({ description: 'Bank payment details' })
  @Prop({ type: BankDetails, required: true })
  bankDetails: BankDetails;

  @ApiProperty({ description: 'Certificate of registration document URL' })
  @Prop({ required: true })
  registrationCertificateUrl: string;

  @ApiProperty({ description: 'KRA certificate document URL' })
  @Prop({ required: true })
  kraCertificateUrl: string;

  @ApiProperty({ description: 'Tax compliance certificate URL' })
  @Prop({ required: true })
  taxComplianceCertificateUrl: string;

  @ApiProperty({ description: 'CR12 document URL' })
  @Prop({ required: true })
  cr12Url: string;

  @ApiProperty({ description: 'Tax compliance certificate expiry date' })
  @Prop({ required: true })
  taxComplianceExpiryDate: string;

  @ApiProperty({
    description: 'Organization profile status',
    example: 'pending',
    enum: ['pending', 'active', 'inactive', 'suspended']
  })
  @Prop({ type: String, default: 'pending' })
  status: string;

  @ApiProperty({ description: 'Organization ID', example: 'ORG-001' })
  @Prop({ required: false, unique: true })
  organizationId?: string;
}

@Schema({ _id: false })
export class OrgCounter {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: 0 })
  sequenceValue: number;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
export const OrgCounterSchema = SchemaFactory.createForClass(OrgCounter);

// Add auto-increment for organizationId
OrganizationSchema.pre<OrganizationDocument>('save', async function (next) {
  if (!this.organizationId) {
    const counter = await this.db
      .model('OrgCounter', OrgCounterSchema)
      .findOneAndUpdate(
        { name: 'organizationId' },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true },
      );
    this.organizationId = `ORG-${counter.sequenceValue.toString().padStart(3, '0')}`;
  }
  next();
});
