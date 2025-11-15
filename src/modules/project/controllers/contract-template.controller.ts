import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ContractTemplateService } from '../services/contract-template.service';
import { CreateContractTemplateDto } from '../dto/create-contract-template.dto';

@ApiTags('contract-templates')
@Controller('contract-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContractTemplateController {
  constructor(private readonly service: ContractTemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract template' })
  async create(@Body() dto: CreateContractTemplateDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contract templates' })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAll(
    @Query('active') active?: string,
    @Query('category') category?: string,
  ) {
    const params: any = {};
    if (active !== undefined) params.active = active === 'true';
    if (category) params.category = category;
    return this.service.findAll(params);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update template' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateContractTemplateDto>) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete template' })
  @ApiResponse({ status: 200, description: 'Template deleted' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { message: 'Template deleted' };
  }
}
