import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ContractTemplate, ContractTemplateDocument } from '../schemas/contract-template.schema';
import { CreateContractTemplateDto } from '../dto/create-contract-template.dto';

@Injectable()
export class ContractTemplateService {
  constructor(
    @InjectModel(ContractTemplate.name)
    private readonly templateModel: Model<ContractTemplateDocument>,
  ) {}

  async create(dto: CreateContractTemplateDto): Promise<ContractTemplate> {
    const variables = dto.variablesCsv
      ? dto.variablesCsv.split(',').map(v => v.trim()).filter(Boolean)
      : [];

    const created = new this.templateModel({
      name: dto.name,
      category: dto.category,
      version: dto.version || '1.0.0',
      contentType: dto.contentType || 'html',
      content: dto.content,
      variables,
      active: dto.active !== undefined ? dto.active : true,
    });
    return created.save();
  }

  async findAll(params?: { active?: boolean; category?: string }): Promise<ContractTemplate[]> {
    const query: any = {};
    if (params?.active !== undefined) query.active = params.active;
    if (params?.category) query.category = params.category;
    return this.templateModel.find(query).sort({ name: 1 }).lean();
  }

  async findOne(id: string): Promise<ContractTemplate> {
    const tpl = await this.templateModel.findById(id).lean();
    if (!tpl) throw new NotFoundException(`Template ${id} not found`);
    return tpl as any;
  }

  async update(id: string, dto: Partial<CreateContractTemplateDto>): Promise<ContractTemplate> {
    const update: any = { ...dto };
    if (dto.variablesCsv !== undefined) {
      update.variables = dto.variablesCsv
        ? dto.variablesCsv.split(',').map(v => v.trim()).filter(Boolean)
        : [];
      delete update.variablesCsv;
    }
    const tpl = await this.templateModel.findByIdAndUpdate(id, update, { new: true });
    if (!tpl) throw new NotFoundException(`Template ${id} not found`);
    return tpl;
  }

  async remove(id: string): Promise<void> {
    const res = await this.templateModel.deleteOne({ _id: id });
    if (!res.deletedCount) throw new NotFoundException(`Template ${id} not found`);
  }
}
