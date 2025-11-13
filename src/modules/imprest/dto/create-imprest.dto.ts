import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  Min,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateImprestDto {
  @ApiProperty({
    example: 'TOTEMK Google Cloud Payment',
    description: 'Reason for payment',
  })
  @IsString()
  @IsNotEmpty()
  paymentReason: string;

  @ApiProperty({
    example: 'USD',
    description: 'Currency of the amount',
  })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    example: 1048.59,
    description: 'Amount requested',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    example: 'Contingency Cash',
    description: 'Type of payment',
    enum: ['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'],
  })
  @IsEnum(['Contingency Cash', 'Travel Cash', 'Purchase Cash', 'Others'])
  @IsNotEmpty()
  paymentType: string;

  @ApiProperty({
    example: 'January 2024 - January 2025',
    description: 'Additional explanation or details',
  })
  @IsString()
  @IsNotEmpty()
  explanation: string;

  @ApiProperty({
    description: 'Optional file attachment URLs from Cloudinary',
    type: 'array',
    items: {
      type: 'string',
    },
    required: false,
    example: ['https://res.cloudinary.com/...'],
  })
  @IsOptional()
  @IsString({ each: true })
  attachmentUrls?: string[];
}
