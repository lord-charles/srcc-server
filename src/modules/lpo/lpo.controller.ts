import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LpoService } from './lpo.service';
import { CreateLpoDto, SendLpoEmailDto } from './dto/lpo.dto';
import { LpoStatus } from './schemas/lpo.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('lpo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('lpo')
export class LpoController {
  constructor(private readonly lpoService: LpoService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Lpo' })
  async create(@Body() createLpoDto: CreateLpoDto, @Req() req: any) {
    const userId = req.user?.sub;
    return this.lpoService.create(createLpoDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all LPOs' })
  async findAll() {
    return this.lpoService.findAll();
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get LPOs for a specific project' })
  async findByProject(@Param('projectId') projectId: string) {
    return this.lpoService.findByProject(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific LPO' })
  async findById(@Param('id') id: string) {
    return this.lpoService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update LPO Status (Approvals)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || '650a123f4b8c9d0012345678';
    return this.lpoService.updateStatus(id, body.status as LpoStatus, userId);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send LPO via Email to supplier' })
  async sendEmail(
    @Param('id') id: string,
    @Body() sendLpoEmailDto: SendLpoEmailDto,
  ) {
    const success = await this.lpoService.sendLpoEmail(id, sendLpoEmailDto);
    return { success };
  }
}
