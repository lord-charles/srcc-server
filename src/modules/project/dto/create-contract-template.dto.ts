import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateContractTemplateDto {
  @ApiProperty({ description: 'Template name', example: 'Standard Team Member Contract' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Optional category', example: 'team_member' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: 'Template version', example: '1.0.0', default: '1.0.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiProperty({ description: 'Content type: html | markdown | text | json', example: 'html', default: 'html' })
  @IsString()
  @IsOptional()
  contentType?: string;

  @ApiProperty({ description: 'Template content (HTML/Markdown/Text or JSON string)' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: 'Comma-separated list of variables used', required: false })
  @IsString()
  @IsOptional()
  variablesCsv?: string;

  @ApiProperty({ description: 'Whether template is active', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
