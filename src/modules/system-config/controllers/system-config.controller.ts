import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { SystemConfigService } from '../services/system-config.service';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
} from '../dto/system-config.dto';

@ApiTags('System Config')
@Controller('system-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a system configuration' })
  @ApiResponse({
    status: 201,
    description: 'Configuration created successfully',
  })
  create(@Body() createDto: CreateSystemConfigDto, @Req() req: any) {
    return this.systemConfigService.create(createDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all system configurations' })
  @ApiResponse({ status: 200, description: 'List of system configurations' })
  findAll(@Query('type') type?: string) {
    if (type) return this.systemConfigService.findByType(type);
    return this.systemConfigService.findAll();
  }

  @Get('key/:key')
  @ApiOperation({ summary: 'Get a system configuration by key' })
  @ApiResponse({ status: 200, description: 'Configuration details' })
  findByKey(@Param('key') key: string) {
    return this.systemConfigService.findByKey(key);
  }

  @Patch(':key')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update a system configuration by key' })
  @ApiResponse({
    status: 200,
    description: 'Configuration updated successfully',
  })
  update(
    @Param('key') key: string,
    @Body() updateDto: UpdateSystemConfigDto,
    @Req() req: any,
  ) {
    return this.systemConfigService.update(key, updateDto, req.user.sub);
  }

  @Delete(':key')
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a system configuration by key' })
  @ApiResponse({
    status: 204,
    description: 'Configuration deleted successfully',
  })
  async remove(@Param('key') key: string) {
    await this.systemConfigService.remove(key);
  }
}
