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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectManagerDto } from './dto/update-project-manager.dto';
import { TeamMemberDto } from './dto/team-member.dto';
import { MilestoneDto } from './dto/milestone.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new project',
    description: `Creates a new project with the provided details. 
    Required documents will be uploaded directly as URLs.
    
    Required documents:
    - Signed Contract
    - Contract Execution Memo
    - Signed Budget
    
    Project manager and team member details should include:
    - Name
    - Email
    - Phone
    
    All monetary values should be in the specified currency (KES for Kenyan Shillings).
    Project status will initially be set to 'draft'.`,
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully.',
    type: CreateProjectDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or missing required fields.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have permission to create projects.',
  })
  async create(@Body() createProjectDto: CreateProjectDto, @Req() req: any) {
    return this.projectService.create({
      ...createProjectDto,
      createdBy: req.user.sub,
      updatedBy: req.user.sub,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Return all projects.' })
  findAll(@Query() query: any, @Req() req: any) {
    return this.projectService.findAll(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiResponse({ status: 200, description: 'Return the project.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a project',
    description: `Updates an existing project with the provided details. 
    All fields are optional, including document uploads.
    
    Optional documents that can be updated:
    - Project Proposal
    - Signed Contract
    - Contract Execution Memo
    - Signed Budget
    
    Project manager and team member details should include:
    - Name
    - Email
    - Phone
    
    All monetary values should be in the specified currency (KES for Kenyan Shillings).`,
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Health System Upgrade' },
        description: {
          type: 'string',
          example: 'Comprehensive upgrade of the hospital management system',
        },
        totalBudget: { type: 'number', example: 5000000 },
        totalProjectValue: { type: 'number', example: 5500000 },
        currency: {
          type: 'string',
          enum: ['KES', 'USD', 'EUR', 'GBP'],
          example: 'KES',
        },
        contractStartDate: {
          type: 'string',
          format: 'date',
          example: '2024-01-01',
        },
        contractEndDate: {
          type: 'string',
          format: 'date',
          example: '2024-12-31',
        },
        client: { type: 'string', example: 'Ministry of Health' },
        status: {
          type: 'string',
          enum: [
            'draft',
            'pending_approval',
            'active',
            'on_hold',
            'completed',
            'cancelled',
          ],
          example: 'active',
        },
        projectManagerId: {
          type: 'string',
          description: 'ObjectId reference to the User model',
          example: '507f1f77bcf86cd799439011',
        },
        teamMembers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'ObjectId reference to the User model',
                example: '507f1f77bcf86cd799439011',
              },
              startDate: {
                type: 'string',
                format: 'date',
                example: '2024-01-01',
              },
              endDate: {
                type: 'string',
                format: 'date',
                example: '2024-12-31',
              },
              responsibilities: {
                type: 'array',
                items: { type: 'string' },
                example: ['Frontend Development', 'UI/UX Design'],
              },
            },
          },
        },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Phase 1 Completion' },
              description: {
                type: 'string',
                example: 'Complete initial system setup and configuration',
              },
              dueDate: {
                type: 'string',
                format: 'date',
                example: '2024-03-31',
              },
              completed: { type: 'boolean', example: false },
              completionDate: { type: 'string', format: 'date', example: null },
              budget: { type: 'number', example: 1000000 },
              actualCost: { type: 'number', example: null },
            },
          },
        },
        riskAssessment: {
          type: 'object',
          properties: {
            factors: {
              type: 'array',
              items: { type: 'string' },
              example: ['Technical complexity', 'Resource availability'],
            },
            mitigationStrategies: {
              type: 'array',
              items: { type: 'string' },
              example: ['Regular technical reviews', 'Early resource planning'],
            },
            lastAssessmentDate: {
              type: 'string',
              format: 'date',
              example: '2024-01-01',
            },
            nextAssessmentDate: {
              type: 'string',
              format: 'date',
              example: '2024-02-01',
            },
          },
        },
        reportingFrequency: {
          type: 'string',
          enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'],
          example: 'Monthly',
        },
        riskLevel: {
          type: 'string',
          enum: ['Low', 'Medium', 'High'],
          example: 'Medium',
        },
        procurementMethod: {
          type: 'string',
          enum: [
            'Open Tender',
            'Restricted Tender',
            'Direct Procurement',
            'Request for Quotation',
          ],
          example: 'Open Tender',
        },
        projectProposalUrl: { type: 'string', format: 'url' },
        signedContractUrl: { type: 'string', format: 'url' },
        executionMemoUrl: { type: 'string', format: 'url' },
        signedBudgetUrl: { type: 'string', format: 'url' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully.',
    type: UpdateProjectDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have permission to update projects.',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found.',
  })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'projectProposal', maxCount: 1 },
      { name: 'signedContract', maxCount: 1 },
      { name: 'executionMemo', maxCount: 1 },
      { name: 'signedBudget', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @UploadedFiles()
    files: {
      projectProposal?: Express.Multer.File[];
      signedContract?: Express.Multer.File[];
      executionMemo?: Express.Multer.File[];
      signedBudget?: Express.Multer.File[];
    },
    @Req() req: any,
  ) {
    // Parse dates and nested objects
    const parsedData: any = {
      ...updateProjectDto,
      projectManagerId: updateProjectDto.projectManagerId,
      teamMembers:
        typeof updateProjectDto.teamMembers === 'string'
          ? JSON.parse(updateProjectDto.teamMembers)
          : updateProjectDto.teamMembers,
      milestones:
        typeof updateProjectDto.milestones === 'string'
          ? JSON.parse(updateProjectDto.milestones)
          : updateProjectDto.milestones,
      riskAssessment:
        typeof updateProjectDto.riskAssessment === 'string'
          ? JSON.parse(updateProjectDto.riskAssessment)
          : updateProjectDto.riskAssessment,
      updatedBy: req.user.sub,
    };

    // Handle optional file uploads
    if (files?.projectProposal?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.projectProposal[0],
        'project-proposals',
      );
      parsedData.projectProposalUrl = result.secure_url;
    }
    if (files?.signedContract?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.signedContract[0],
        'signed-contracts',
      );
      parsedData.signedContractUrl = result.secure_url;
    }
    if (files?.executionMemo?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.executionMemo[0],
        'execution-memos',
      );
      parsedData.executionMemoUrl = result.secure_url;
    }
    if (files?.signedBudget?.[0]) {
      const result = await this.cloudinaryService.uploadFile(
        files.signedBudget[0],
        'signed-budgets',
      );
      parsedData.signedBudgetUrl = result.secure_url;
    }

    // Parse dates if provided
    if (updateProjectDto.contractStartDate) {
      parsedData.contractStartDate = new Date(
        updateProjectDto.contractStartDate,
      );
    }
    if (updateProjectDto.contractEndDate) {
      parsedData.contractEndDate = new Date(updateProjectDto.contractEndDate);
    }

    // Parse dates in nested objects
    if (Array.isArray(parsedData.teamMembers)) {
      parsedData.teamMembers = parsedData.teamMembers.map((member) => ({
        ...member,
        startDate: member.startDate ? new Date(member.startDate) : undefined,
        endDate: member.endDate ? new Date(member.endDate) : undefined,
      }));
    }

    if (Array.isArray(parsedData.milestones)) {
      parsedData.milestones = parsedData.milestones.map((milestone) => ({
        ...milestone,
        dueDate: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
        completionDate: milestone.completionDate
          ? new Date(milestone.completionDate)
          : undefined,
      }));
    }

    if (parsedData.riskAssessment) {
      if (parsedData.riskAssessment.lastAssessmentDate) {
        parsedData.riskAssessment.lastAssessmentDate = new Date(
          parsedData.riskAssessment.lastAssessmentDate,
        );
      }
      if (parsedData.riskAssessment.nextAssessmentDate) {
        parsedData.riskAssessment.nextAssessmentDate = new Date(
          parsedData.riskAssessment.nextAssessmentDate,
        );
      }
    }

    return this.projectService.update(id, parsedData);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a project',
    description: 'Delete a project. Only administrators can delete projects.',
  })
  @ApiResponse({ status: 200, description: 'Project deleted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Only administrators can delete projects.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.projectService.remove(id, req.user.sub);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get projects by contract ID' })
  @ApiResponse({
    status: 200,
    description: 'Return projects for the contract.',
  })
  findByContract(@Param('contractId') contractId: string) {
    return this.projectService.findByContract(contractId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({
    status: 200,
    description: 'Project status updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.projectService.updateProjectStatus(id, status);
  }

  @Post(':id/team-members')
  @ApiOperation({ summary: 'Add team member to project' })
  @ApiResponse({ status: 201, description: 'Team member added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addTeamMember(@Param('id') id: string, @Body() teamMemberDto: TeamMemberDto) {
    return this.projectService.addTeamMember(id, teamMemberDto);
  }

  @Patch(':id/team-members/:teamMemberId')
  @ApiOperation({ summary: 'Update team member details' })
  @ApiResponse({
    status: 200,
    description: 'Team member updated successfully.',
  })
  async updateTeamMember(
    @Param('id') id: string,
    @Param('teamMemberId') teamMemberId: string,
    @Body() teamMemberDto: TeamMemberDto,
  ) {
    return this.projectService.updateTeamMember(
      id,
      teamMemberId,
      teamMemberDto,
    );
  }

  @Delete(':id/team-members/:teamMemberId')
  @ApiOperation({ summary: 'Remove team member from project' })
  @ApiResponse({
    status: 200,
    description: 'Team member removed successfully.',
  })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('teamMemberId') teamMemberId: string,
  ) {
    return this.projectService.removeTeamMember(id, teamMemberId);
  }

  @Patch(':id/project-manager')
  @ApiOperation({ summary: 'Update project manager' })
  @ApiResponse({
    status: 200,
    description: 'Project manager updated successfully',
  })
  async updateProjectManager(
    @Param('id') id: string,
    @Body() updateProjectManagerDto: UpdateProjectManagerDto,
  ) {
    return this.projectService.updateProjectManager(
      id,
      updateProjectManagerDto.projectManagerId,
    );
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to project' })
  @ApiResponse({ status: 201, description: 'Document added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addDocument(@Param('id') id: string, @Body() documentData: any) {
    return this.projectService.addDocument(id, documentData);
  }

  @Patch(':id/financials')
  @ApiOperation({ summary: 'Update project financials' })
  @ApiResponse({ status: 200, description: 'Financials updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  updateFinancials(@Param('id') id: string, @Body() financialData: any) {
    return this.projectService.updateFinancials(id, financialData);
  }

  @Post(':id/kpis')
  @ApiOperation({ summary: 'Add KPI to project' })
  @ApiResponse({ status: 201, description: 'KPI added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addKPI(@Param('id') id: string, @Body() kpiData: any) {
    return this.projectService.updateKPIs(id, kpiData);
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update project milestone' })
  @ApiResponse({ status: 200, description: 'Milestone updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project or milestone not found.' })
  updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() milestoneData: MilestoneDto,
  ) {
    return this.projectService.updateMilestone(id, milestoneId, milestoneData);
  }

  @Post(':id/milestones')
  @ApiOperation({ summary: 'Add a new milestone to project' })
  @ApiResponse({ status: 201, description: 'Milestone added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addMilestone(@Param('id') id: string, @Body() milestoneData: MilestoneDto) {
    return this.projectService.addMilestone(id, milestoneData);
  }

  @Delete(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Delete a project milestone' })
  @ApiResponse({ status: 200, description: 'Milestone deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project or milestone not found.' })
  deleteMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
  ) {
    return this.projectService.deleteMilestone(id, milestoneId);
  }

  @Post(':id/assistant-project-managers')
  @ApiOperation({
    summary: 'Add assistant project manager to project',
    description:
      'Assigns a user as an assistant project manager with optional contract and responsibilities.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assistant project manager added successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'User is already an assistant project manager.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'responsibilities'],
      properties: {
        userId: {
          type: 'string',
          description: 'User ID to assign as assistant project manager',
          example: '507f1f77bcf86cd799439011',
        },
        contractId: {
          type: 'string',
          description: 'Optional contract ID reference',
          example: '507f1f77bcf86cd799439012',
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of responsibilities',
          example: ['Coordinate with stakeholders', 'Monitor project progress'],
        },
      },
    },
  })
  addAssistantProjectManager(
    @Param('id') id: string,
    @Body()
    assistantData: {
      userId: string;
      contractId?: string;
      responsibilities: string[];
    },
  ) {
    return this.projectService.addAssistantProjectManager(id, {
      userId: assistantData.userId as any,
      contractId: assistantData.contractId as any,
      responsibilities: assistantData.responsibilities,
    });
  }

  @Patch(':id/assistant-project-managers/:assistantUserId')
  @ApiOperation({
    summary: 'Update assistant project manager details',
    description:
      'Updates contract and/or responsibilities for an assistant project manager.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assistant project manager updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or assistant project manager not found.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        contractId: {
          type: 'string',
          description: 'Contract ID reference',
          example: '507f1f77bcf86cd799439012',
        },
        responsibilities: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of responsibilities',
          example: ['Coordinate with stakeholders', 'Monitor project progress'],
        },
      },
    },
  })
  updateAssistantProjectManager(
    @Param('id') id: string,
    @Param('assistantUserId') assistantUserId: string,
    @Body()
    updateData: {
      contractId?: string;
      responsibilities?: string[];
    },
  ) {
    return this.projectService.updateAssistantProjectManager(
      id,
      assistantUserId,
      {
        contractId: updateData.contractId as any,
        responsibilities: updateData.responsibilities,
      },
    );
  }

  @Delete(':id/assistant-project-managers/:assistantUserId')
  @ApiOperation({
    summary: 'Remove assistant project manager from project',
    description: 'Removes a user from the assistant project managers list.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assistant project manager removed successfully.',
  })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  removeAssistantProjectManager(
    @Param('id') id: string,
    @Param('assistantUserId') assistantUserId: string,
  ) {
    return this.projectService.removeAssistantProjectManager(
      id,
      assistantUserId,
    );
  }

  // Coach Managers
  @Post(':id/coach-managers')
  @ApiOperation({ summary: 'Add coach manager to project' })
  @ApiResponse({ status: 201, description: 'Coach manager added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        responsibilities: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  addCoachManager(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
      responsibilities?: string[];
    },
  ) {
    return this.projectService.addCoachManager(id, {
      userId: body.userId as any,
      responsibilities: body.responsibilities || [],
    });
  }

  @Patch(':id/coach-managers/:managerUserId')
  @ApiOperation({ summary: 'Update coach manager details' })
  @ApiResponse({ status: 200, description: 'Coach manager updated successfully.' })
  updateCoachManager(
    @Param('id') id: string,
    @Param('managerUserId') managerUserId: string,
    @Body() update: { responsibilities?: string[] },
  ) {
    return this.projectService.updateCoachManager(id, managerUserId, update);
  }

  @Delete(':id/coach-managers/:managerUserId')
  @ApiOperation({ summary: 'Remove coach manager from project' })
  @ApiResponse({ status: 200, description: 'Coach manager removed successfully.' })
  removeCoachManager(
    @Param('id') id: string,
    @Param('managerUserId') managerUserId: string,
  ) {
    return this.projectService.removeCoachManager(id, managerUserId);
  }

  // Coach Assistants
  @Post(':id/coach-assistants')
  @ApiOperation({ summary: 'Add coach assistant to project' })
  @ApiResponse({ status: 201, description: 'Coach assistant added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        responsibilities: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  addCoachAssistant(
    @Param('id') id: string,
    @Body()
    body: {
      userId: string;
      responsibilities?: string[];
    },
  ) {
    return this.projectService.addCoachAssistant(id, {
      userId: body.userId as any,
      responsibilities: body.responsibilities || [],
    });
  }

  @Patch(':id/coach-assistants/:assistantUserId')
  @ApiOperation({ summary: 'Update coach assistant details' })
  @ApiResponse({ status: 200, description: 'Coach assistant updated successfully.' })
  updateCoachAssistant(
    @Param('id') id: string,
    @Param('assistantUserId') assistantUserId: string,
    @Body() update: { responsibilities?: string[] },
  ) {
    return this.projectService.updateCoachAssistant(id, assistantUserId, update);
  }

  @Delete(':id/coach-assistants/:assistantUserId')
  @ApiOperation({ summary: 'Remove coach assistant from project' })
  @ApiResponse({ status: 200, description: 'Coach assistant removed successfully.' })
  removeCoachAssistant(
    @Param('id') id: string,
    @Param('assistantUserId') assistantUserId: string,
  ) {
    return this.projectService.removeCoachAssistant(id, assistantUserId);
  }

  // Coaches (milestone-scoped)
  @Post(':id/milestones/:milestoneId/coaches')
  @ApiOperation({ summary: 'Add coach to a project milestone' })
  @ApiResponse({ status: 201, description: 'Coach added successfully.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'contract'],
      properties: {
        userId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        responsibilities: { type: 'array', items: { type: 'string' } },
        contract: {
          type: 'object',
          required: ['rate', 'rateUnit'],
          properties: {
            rate: { type: 'number', example: 1000 },
            rateUnit: { type: 'string', enum: ['per_session', 'per_hour'] },
            currency: { type: 'string', enum: ['KES', 'USD'], default: 'KES' },
            notes: { type: 'string' },
          },
        },
      },
    },
  })
  addCoach(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body()
    body: {
      userId: string;
      startDate?: string;
      endDate?: string;
      responsibilities?: string[];
      contract: { rate: number; rateUnit: 'per_session' | 'per_hour'; currency?: 'KES' | 'USD'; notes?: string };
    },
  ) {
    return this.projectService.addCoach(id, {
      userId: body.userId as any,
      milestoneId: milestoneId as any,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      responsibilities: body.responsibilities || [],
      contract: {
        rate: body.contract.rate,
        rateUnit: body.contract.rateUnit,
        currency: body.contract.currency || 'KES',
        notes: body.contract.notes,
      },
    });
  }

  @Patch(':id/milestones/:milestoneId/coaches/:coachUserId')
  @ApiOperation({ summary: 'Update coach assignment for a milestone' })
  @ApiResponse({ status: 200, description: 'Coach updated successfully.' })
  updateCoach(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Param('coachUserId') coachUserId: string,
    @Body()
    body: {
      startDate?: string;
      endDate?: string;
      responsibilities?: string[];
      contract?: { rate?: number; rateUnit?: 'per_session' | 'per_hour'; currency?: 'KES' | 'USD'; notes?: string };
    },
  ) {
    return this.projectService.updateCoach(id, coachUserId, milestoneId, {
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      responsibilities: body.responsibilities,
      contract: body.contract,
    });
  }

  @Delete(':id/milestones/:milestoneId/coaches/:coachUserId')
  @ApiOperation({ summary: 'Remove coach from a milestone' })
  @ApiResponse({ status: 200, description: 'Coach removed successfully.' })
  removeCoach(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Param('coachUserId') coachUserId: string,
  ) {
    return this.projectService.removeCoach(id, coachUserId, milestoneId);
  }
}
