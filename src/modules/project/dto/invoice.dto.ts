import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

export class CreateInvoiceItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class CreateInvoiceDto {
  @ApiProperty()
  @IsMongoId()
  projectId: Types.ObjectId;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  invoiceDate: Date;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  dueDate: Date;

  @ApiProperty({ type: [CreateInvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentTerms: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateInvoiceDto extends CreateInvoiceDto {}

export class CreatePaymentDto {
  @ApiProperty()
  @IsEnum(['bank_transfer', 'cheque', 'mpesa', 'cash'])
  method: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  branchCode?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  paidAt: Date;
}

export class InvoiceApprovalDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class InvoiceRejectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}
