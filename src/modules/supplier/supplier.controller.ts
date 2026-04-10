import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from './dto/create-supplier.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Suppliers')
@Controller('supplier')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiResponse({
    status: 201,
    description: 'The supplier has been successfully created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request / Email or KRA PIN already exists.',
  })
  create(@Body() createSupplierDto: CreateSupplierDto, @Request() req) {
    // Optionally assign createdBy if user is in req
    if (req.sub) {
      (createSupplierDto as any).createdBy = req.sub;
    }
    return this.supplierService.create(createSupplierDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated statistics for suppliers' })
  @ApiResponse({ status: 200, description: 'Returns statistics object.' })
  getStats() {
    return this.supplierService.getStats();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for suppliers for suggestions' })
  @ApiQuery({ name: 'q', required: true })
  @ApiResponse({ status: 200, description: 'Returns matching suppliers.' })
  search(@Query('q') q: string) {
    return this.supplierService.search(q);
  }

  @Get()
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'supplierCategory', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(@Query() query: any) {
    return this.supplierService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by id' })
  findOne(@Param('id') id: string) {
    return this.supplierService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier' })
  remove(@Param('id') id: string) {
    return this.supplierService.remove(id);
  }
}
