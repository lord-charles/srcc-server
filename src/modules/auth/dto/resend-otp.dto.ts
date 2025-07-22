import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'test@example.com',
    description: 'The email address of the user or organization.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'user',
    description: 'The type of account.',
    enum: ['user', 'organization'],
  })
  @IsIn(['user', 'organization'])
  @IsNotEmpty()
  type: 'user' | 'organization';
}
