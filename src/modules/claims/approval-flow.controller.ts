import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  NotFoundException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ApprovalFlowService } from './approval-flow.service';
import { ApprovalFlow } from './schemas/approval-flow.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Approval Flows')
@Controller('approval-flows')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApprovalFlowController {
  constructor(private readonly approvalFlowService: ApprovalFlowService) {}

  @Post() 
  @ApiOperation({ summary: 'Create or update an approval flow', description: 'Creates or updates an approval flow for a department.' })
  @ApiBody({ type: ApprovalFlow, required: true })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Approval flow created or updated successfully.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid approval flow data.' })
  async addApprovalFlow(@Body() dto: Partial<ApprovalFlow>) {
    return this.approvalFlowService.addApprovalFlow(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an approval flow', description: 'Deletes an approval flow by its ID.' })
  @ApiParam({ name: 'id', description: 'Approval flow MongoDB ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Approval flow deleted successfully.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Approval flow not found.' })
  async deleteApprovalFlow(@Param('id') id: string) {
    const deleted = await this.approvalFlowService.deleteApprovalFlow(id);
    if (!deleted) throw new NotFoundException('ApprovalFlow not found');
    return { deleted: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get all approval flows', description: 'Returns all approval flows.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Array of approval flows.' })
  async getApprovalFlows() {
    return this.approvalFlowService.getApprovalFlows();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get approval flow by ID', description: 'Returns a specific approval flow by MongoDB ID.' })
  @ApiParam({ name: 'id', description: 'Approval flow MongoDB ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Approval flow found.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Approval flow not found.' })
  async getApprovalFlowById(@Param('id') id: string) {
    const flow = await this.approvalFlowService.getApprovalFlowById(id);
    if (!flow) throw new NotFoundException('ApprovalFlow not found');
    return flow;
  }
}
