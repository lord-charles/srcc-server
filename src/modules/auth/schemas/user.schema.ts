import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

// Skill Schema
class Skill {
  @ApiProperty({ description: 'Name of the skill', example: 'Project Management' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Years of experience with this skill', example: 5 })
  @Prop({ required: true })
  yearsOfExperience: number;

  @ApiProperty({ description: 'Proficiency level', example: 'Expert', enum: ['Beginner', 'Intermediate', 'Expert'] })
  @Prop({ required: true })
  proficiencyLevel: string;
}

// Education Background Schema
class Education {
  @ApiProperty({ description: 'Name of institution', example: 'University of Nairobi' })
  @Prop({ required: true })
  institution: string;

  @ApiProperty({ description: 'Qualification obtained', example: 'Bachelor of Science in Computer Science' })
  @Prop({ required: true })
  qualification: string;

  @ApiProperty({ description: 'Year of completion', example: '2020' })
  @Prop({ required: true })
  yearOfCompletion: string;
}

// Professional Certification Schema
class Certification {
  @ApiProperty({ description: 'Name of certification', example: 'PMP' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Issuing organization', example: 'PMI' })
  @Prop({ required: true })
  issuingOrganization: string;

  @ApiProperty({ description: 'Date of issuance' })
  @Prop({ required: true })
  dateIssued: Date;

  @ApiProperty({ description: 'Expiry date if applicable' })
  @Prop()
  expiryDate?: Date;

  @ApiProperty({ description: 'Certification ID or number', example: 'PMP123456' })
  @Prop()
  certificationId?: string;
}

// Academic Certificate Schema
class AcademicCertificate {
  @ApiProperty({ description: 'Name of the certificate', example: 'Bachelor of Science' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: 'Institution that issued the certificate', example: 'University of Nairobi' })
  @Prop({ required: true })
  institution: string;

  @ApiProperty({ description: 'Year of completion', example: '2020' })
  @Prop({ required: true })
  yearOfCompletion: string;

  @ApiProperty({ description: 'URL to the certificate document', example: 'https://cloudinary.com/certificates/bsc.pdf' })
  @Prop({ required: true })
  documentUrl: string;
}

// Bank Details Schema
class BankDetails {
  @ApiProperty({ description: 'Name of the bank', example: 'Equity Bank' })
  @Prop()
  bankName?: string;

  @ApiProperty({ description: 'Bank account number', example: '1234567890' })
  @Prop()
  accountNumber?: string;

  @ApiProperty({ description: 'Branch code of the bank', example: '123' })
  @Prop()
  branchCode?: string;
}

// Mpesa Payment Details Schema
class MpesaDetails {
  @ApiProperty({
    description: 'Phone number linked to Mpesa',
    example: '+254712345678',
  })
  @Prop()
  phoneNumber?: string;
}

// Emergency Contact Schema
class EmergencyContact {
  @ApiProperty({ description: 'Name of the contact', example: 'John Doe' })
  @Prop({ required: true })
  name: string;

  @ApiProperty({
    description: 'Relationship to the employee',
    example: 'Spouse',
  })
  @Prop({ required: true })
  relationship: string;

  @ApiProperty({
    description: 'Primary phone number',
    example: '+254712345678',
  })
  @Prop({ required: true })
  phoneNumber: string;

  @ApiProperty({
    description: 'Alternative phone number',
    example: '+254723456789',
  })
  @Prop()
  alternativePhoneNumber?: string;
}

// User Schema
@Schema({ timestamps: true })
export class User {
  @ApiProperty({ description: 'Employee first name', example: 'Jane' })
  @Prop({ required: true })
  firstName: string;

  @ApiProperty({ description: 'Employee last name', example: 'Wanjiku' })
  @Prop({ required: true })
  lastName: string;

  @ApiProperty({ description: 'Employee middle name', example: 'Njeri' })
  @Prop()
  middleName?: string;

  @ApiProperty({
    description: 'Employee email address',
    example: 'jane.wanjiku@company.com',
  })
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @ApiProperty({
    description: 'Phone number for contact and Mpesa transactions',
    example: '+254712345678',
  })
  @Prop({ required: true, unique: true, index: true })
  phoneNumber: string;

  @ApiProperty({
    description: 'Alternative phone number',
    example: '+254723456789',
  })
  @Prop()
  alternativePhoneNumber?: string;

  @ApiProperty({
    description: 'National ID of the employee',
    example: '23456789',
  })
  @Prop({ required: true, unique: true })
  nationalId: string;

  @ApiProperty({
    description: 'KRA PIN number',
    example: 'A012345678B',
  })
  @Prop({ required: true, unique: true })
  kraPinNumber: string;

  @ApiProperty({
    description: 'NHIF number',
    example: 'NHIF123456',
  })
  @Prop({ required: true, unique: true })
  nhifNumber: string;

  @ApiProperty({
    description: 'NSSF number',
    example: 'NSSF123456',
  })
  @Prop({ required: true, unique: true })
  nssfNumber: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123'
  })
  @Prop({ required: true })
  password: string;

  @ApiProperty({
    description: 'Status of the consultant account',
    example: 'pending',
    enum: ['pending', 'active', 'inactive', 'suspended', 'terminated'],
  })
  @Prop({ type: String, default: 'pending' })
  status: string;

  @ApiProperty({ description: 'Employee date of birth', example: '1990-01-15' })
  @Prop({ required: true })
  dateOfBirth: string;

  @ApiProperty({ description: 'Physical address', example: 'Westlands, Nairobi' })
  @Prop({ required: true })
  physicalAddress: string;

  @ApiProperty({ description: 'Postal address', example: 'P.O. Box 12345-00100' })
  @Prop()
  postalAddress?: string;

  @ApiProperty({ description: 'County of residence', example: 'Nairobi' })
  @Prop({ required: true })
  county: string;

  @ApiProperty({
    description: 'Consultant skills and expertise',
    type: [Skill],
  })
  @Prop({ type: [Skill], required: true })
  skills: Skill[];

  @ApiProperty({
    description: 'Educational background',
    type: [Education],
  })
  @Prop({ type: [Education], required: true })
  education: Education[];

  @ApiProperty({
    description: 'Professional certifications',
    type: [Certification],
  })
  @Prop({ type: [Certification] })
  certifications?: Certification[];

  @ApiProperty({
    description: 'CV/Resume URL',
    example: 'https://cloudinary.com/cv/john-doe-cv.pdf'
  })
  @Prop()
  cvUrl?: string;

  @ApiProperty({
    description: 'Academic certificates'
  })
  @Prop({ type: [AcademicCertificate] })
  academicCertificates?: AcademicCertificate[];

  @ApiProperty({
    description: 'Years of total work experience',
    example: 8
  })
  @Prop({ required: true })
  yearsOfExperience: number;

  @ApiProperty({
    description: 'Consultant hourly rate in KES',
    example: 5000
  })
  @Prop()
  hourlyRate: number;

  @ApiProperty({
    description: 'Availability status',
    example: 'available',
    enum: ['available', 'partially_available', 'not_available']
  })
  @Prop({ type: String, default: 'available' })
  availability: string;

  @ApiProperty({
    description: 'Preferred work type',
    example: ['remote', 'hybrid'],
    enum: ['remote', 'onsite', 'hybrid']
  })
  @Prop({ type: [String] })
  preferredWorkTypes: string[];

  @ApiProperty({
    description: 'Roles assigned in the app',
    example: ['consultant'],
  })
  @Prop({
    type: [String],
    default: ['consultant'],
    enum: ['consultant', 'admin', 'superadmin', 'hr', 'finance'],
  })
  roles: string[];

  @ApiProperty({
    description: 'Consultant ID',
    example: 'CON-001',
  })
  @Prop({ required: false, unique: true })
  employeeId?: string;

  @ApiProperty({
    description: 'Primary expertise/department',
    example: 'Software Engineering',
  })
  @Prop({ required: true })
  department: string;

  @ApiProperty({ description: 'Monthly NHIF deduction in KES', example: 1700 })
  @Prop({ type: Number })
  nhifDeduction: number;

  @ApiProperty({ description: 'Monthly NSSF deduction in KES', example: 200 })
  @Prop({ type: Number })
  nssfDeduction: number;

  @ApiProperty({ description: 'Emergency contact details' })
  @Prop({ type: EmergencyContact })
  emergencyContact: EmergencyContact;

  @ApiProperty({ description: 'Bank payment details' })
  @Prop({ type: BankDetails })
  bankDetails: BankDetails;

  @ApiProperty({ description: 'Mpesa payment details' })
  @Prop({ type: MpesaDetails })
  mpesaDetails?: MpesaDetails;

}

@Schema({ _id: false, timestamps: true })
export class Counter {
  @ApiProperty({ required: true })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ required: true, default: 0 })
  @Prop({ required: true, default: 0 })
  sequenceValue: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
export const CounterSchema = SchemaFactory.createForClass(Counter);

UserSchema.pre<UserDocument>('save', async function (next) {
  if (!this.employeeId) {
    const counter = await this.db
      .model('Counter', CounterSchema)
      .findOneAndUpdate(
        { name: 'employeeId' },
        { $inc: { sequenceValue: 1 } },
        { new: true, upsert: true },
      );
    this.employeeId = `CON-${counter.sequenceValue
      .toString()
      .padStart(3, '0')}`;
  }
  next();
});
