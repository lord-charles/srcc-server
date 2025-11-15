import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type ContractTemplateDocument = ContractTemplate & Document;

@Schema({ timestamps: true })
export class ContractTemplate extends Document {
  @ApiProperty({ example: 'Standard Team Member Contract', description: 'Human readable name of the template' })
  @Prop({ required: true, trim: true, unique: true })
  name: string;

  @ApiProperty({ example: 'team_member', description: 'Optional category for grouping' })
  @Prop({ required: false, trim: true })
  category?: string;

  @ApiProperty({ example: '1.0.0', description: 'Template version' })
  @Prop({ required: true, trim: true, default: '1.0.0' })
  version: string;

  @ApiProperty({ example: 'html', description: 'Content type of the template (e.g., html, markdown, text, json)' })
  @Prop({ required: true, trim: true, default: 'html' })
  contentType: string;

  @ApiProperty({ description: 'Raw template content. Can be HTML/Markdown/Text or JSON string.' })
  @Prop({ required: true })
  content: string;

  @ApiProperty({ description: 'Optional list of variable keys used in the template' })
  @Prop({ type: [String], required: false, default: [] })
  variables?: string[];

  @ApiProperty({ description: 'Whether the template is active/available for use' })
  @Prop({ default: true })
  active: boolean;
}

export const ContractTemplateSchema = SchemaFactory.createForClass(ContractTemplate);
