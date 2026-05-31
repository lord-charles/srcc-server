import {
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lpoId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ default: 'KES' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  grnUrl?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ApproveRequestDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class RejectRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RequestRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class CreateVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class ApproveVoucherDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  comments?: string;
}

export class RejectVoucherDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class VoucherRevisionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class PayVoucherDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  transactionId?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentAdviceUrl: string;
}
