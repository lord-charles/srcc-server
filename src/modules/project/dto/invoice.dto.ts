import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsArray, ValidateNested, IsOptional, IsEnum, Min, IsMongoId, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class InvoiceItemDto {
  @ApiProperty({
    example: 'Professional Consulting Services - January 2025',
    description: 'Description of the invoice item'
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 160,
    description: 'Quantity of items'
  })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    example: 150000,
    description: 'Amount for the item (without tax)'
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 16,
    description: 'Tax rate percentage for the item'
  })
  @IsNumber()
  @Min(0)
  taxRate: number;
}

export class CreateInvoiceDto {
  @ApiProperty({
    example: '65c4a7890d2d3a1b3c5e8f9a',
    description: 'ID of the project this invoice belongs to'
  })
  @IsMongoId()
  projectId: string;

  @ApiProperty({
    example: '2025-02-20',
    description: 'Date when the invoice was issued'
  })
  @Type(() => Date)
  @IsDate()
  invoiceDate: Date;

  @ApiProperty({
    example: '2025-03-20',
    description: 'Due date for payment'
  })
  @Type(() => Date)
  @IsDate()
  dueDate: Date;

  @ApiProperty({
    example: 'KES',
    description: 'Currency code for the invoice'
  })
  @IsString()
  currency: string;

  @ApiProperty({
    example: 'Net 30',
    description: 'Payment terms for the invoice'
  })
  @IsString()
  paymentTerms: string;

  @ApiProperty({
    example: [{
      description: 'Professional Consulting Services - January 2025',
      quantity: 160,
      amount: 150000,
      taxRate: 16
    }, {
      description: 'Project Management Services - January 2025',
      quantity: 80,
      amount: 75000,
      taxRate: 16
    }],
    description: 'Array of invoice items'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];

  @ApiProperty({
    example: 'Net 30 payment terms apply',
    description: 'Additional notes for the invoice'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoiceDto extends CreateInvoiceDto {}

export class CreatePaymentDto {
  @ApiProperty({
    example: 100000,
    description: 'Amount paid in this transaction'
  })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiProperty({
    example: 'MPESA',
    description: 'Payment method used'
  })
  @IsString()
  paymentMethod: string;

  @ApiProperty({
    example: 'QK7XLPBRN5',
    description: 'Reference number for the payment'
  })
  @IsString()
  referenceNumber: string;

  @ApiProperty({
    example: '2025-02-20',
    description: 'Date when the payment was made'
  })
  @Type(() => Date)
  @IsDate()
  paymentDate: Date;

  @ApiProperty({
    example: 'First installment payment',
    description: 'Additional notes about the payment'
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InvoiceApprovalDto {
  @ApiProperty({
    example: 'Invoice approved. All items and calculations verified.',
    description: 'Comments regarding the approval'
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class InvoiceRejectionDto {
  @ApiProperty({
    example: 'Invoice amounts do not match the agreed contract terms.',
    description: 'Reason for rejecting the invoice'
  })
  @IsString()
  reason: string;
}

export class InvoiceRevisionDto {
  @ApiProperty({
    example: 'Please update the payment terms and add missing item descriptions',
    description: 'Comments explaining why revision is needed'
  })
  @IsString()
  comments: string;

  @ApiProperty({
    example: ['Update payment terms', 'Add item descriptions'],
    description: 'List of specific changes requested'
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  changes: string[];
}
