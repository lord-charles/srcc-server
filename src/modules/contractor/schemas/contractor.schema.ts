import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type ContractorDocument = Contractor & Document;

@Schema({ _id: false })
export class CompanyContactDetails {
  @ApiProperty({ example: 'company@example.com', description: 'Company email' })
  @Prop({ required: true })
  email: string;

  @ApiProperty({ example: '+254123456789', description: 'Company phone number' })
  @Prop({ required: true })
  phone: string;

  @ApiProperty({ example: 'Company Address', description: 'Company physical address' })
  @Prop({ required: true })
  address: string;
}

@Schema({ _id: false })
export class ContactPersonDetails {
  @ApiProperty({ example: 'John Doe', description: 'Contact person name' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ example: 'Manager', description: 'Contact person position' })
  @Prop({ required: true })
  position: string;

  @ApiProperty({ example: '+254123456789', description: 'Contact person phone number' })
  @Prop({ required: true })
  phone: string;

  @ApiProperty({ example: 'john@example.com', description: 'Contact person email' })
  @Prop({ required: true })
  email: string;
}

@Schema({ timestamps: true })
export class Contractor {
  @ApiProperty({ example: 'ABC Construction Ltd', description: 'Full name of the contractor company' })
  @Prop({ required: true })
  fullName: string;

  @ApiProperty({ example: 'REG123456', description: 'Company registration number' })
  @Prop({ required: true, unique: true })
  registrationNumber: string;

  @ApiProperty({ example: 2020, description: 'Year of registration' })
  @Prop({ required: true })
  registrationYear: number;

  @ApiProperty({ example: 'A123456789B', description: 'KRA PIN number' })
  @Prop({ required: true, unique: true })
  kraPinNumber: string;

  @ApiProperty({
    example: {
      email: 'company@example.com',
      phone: '+254123456789',
      address: 'Company Address'
    },
    description: 'Company contact details'
  })
  @Prop({ type: CompanyContactDetails, required: true })
  companyContactDetails: CompanyContactDetails;

  @ApiProperty({
    example: {
      name: 'John Doe',
      position: 'Manager',
      phone: '+254123456789',
      email: 'john@example.com'
    },
    description: 'Contact person details'
  })
  @Prop({ type: ContactPersonDetails, required: true })
  contactPersonDetails: ContactPersonDetails;

  @ApiProperty({ example: 'TCC123456', description: 'Tax Compliance Certificate number' })
  @Prop({ required: true })
  tccNumber: string;

  @ApiProperty({ description: 'URL to the Certificate of Incorporation document' })
  @Prop({ required: true })
  certificateOfIncorporationUrl: string;

  @ApiProperty({ description: 'URL to the CR12 document' })
  @Prop({ required: true })
  cr12DocumentUrl: string;

  @ApiProperty({ description: 'URL to the KRA PIN Certificate' })
  @Prop({ required: true })
  kraPinCertificateUrl: string;

  @ApiProperty({ description: 'URL to the Tax Compliance Certificate' })
  @Prop({ required: true })
  tccCertificateUrl: string;

  @ApiProperty({ description: 'Whether the contractor details are certified' })
  @Prop({ default: false })
  isCertified: boolean;

  @ApiProperty({ description: 'Certification date' })
  @Prop()
  certificationDate?: Date;

  @ApiProperty({ description: 'Certification remarks' })
  @Prop()
  certificationRemarks?: string;
}

export const ContractorSchema = SchemaFactory.createForClass(Contractor);
