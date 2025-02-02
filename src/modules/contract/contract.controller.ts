import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ContractService } from './contract.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('contracts')
@Controller('contracts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contract' })
  @ApiResponse({ 
    status: 201, 
    description: 'The contract has been successfully created.',
    type: CreateContractDto 
  })
  create(@Body() createContractDto: CreateContractDto) {
    return this.contractService.create(createContractDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all contracts' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of all contracts.',
    type: [CreateContractDto]
  })
  findAll() {
    return this.contractService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contract by ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'The found contract.',
    type: CreateContractDto
  })
  findOne(@Param('id') id: string) {
    return this.contractService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a contract' })
  @ApiResponse({ 
    status: 200, 
    description: 'The contract has been successfully updated.',
    type: CreateContractDto
  })
  update(@Param('id') id: string, @Body() updateContractDto: UpdateContractDto) {
    return this.contractService.update(id, updateContractDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a contract' })
  @ApiResponse({ 
    status: 200, 
    description: 'The contract has been successfully deleted.',
    type: CreateContractDto
  })
  remove(@Param('id') id: string) {
    return this.contractService.remove(id);
  }
}
