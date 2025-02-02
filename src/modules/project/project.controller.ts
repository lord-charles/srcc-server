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
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
    Required documents will be uploaded directly as files.
    
    Required documents:
    - Project Proposal
    - Signed Contract
    - Contract Execution Memo
    - Signed Budget
    
    Project manager and team member details should include:
    - Name
    - Email
    - Phone
    
    All monetary values should be in the specified currency (KES for Kenyan Shillings).
    Project status will initially be set to 'draft'.`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Health System Upgrade' },
        description: { type: 'string', example: 'Comprehensive upgrade of the hospital management system' },
        contractId: { type: 'string', example: '507f1f77bcf86cd799439011' },
        totalBudget: { type: 'number', example: 5000000 },
        totalProjectValue: { type: 'number', example: 5500000 },
        currency: { type: 'string', enum: ['KES', 'USD', 'EUR', 'GBP'], example: 'KES' },
        contractStartDate: { type: 'string', format: 'date', example: '2024-01-01' },
        contractEndDate: { type: 'string', format: 'date', example: '2024-12-31' },
        client: { type: 'string', example: 'Ministry of Health' },
        status: { 
          type: 'string', 
          enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'],
          example: 'draft'
        },
        projectManager: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+254712345678' }
          }
        },
        teamMembers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Jane Smith' },
              email: { type: 'string', format: 'email', example: 'jane.smith@example.com' },
              phone: { type: 'string', example: '+254712345679' },
              role: { type: 'string', example: 'Developer' },
              startDate: { type: 'string', format: 'date', example: '2024-01-01' },
              endDate: { type: 'string', format: 'date', example: '2024-12-31' },
              responsibilities: { 
                type: 'array', 
                items: { type: 'string' },
                example: ['Frontend Development', 'UI/UX Design']
              }
            }
          }
        },
        milestones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', example: 'Phase 1 Completion' },
              description: { type: 'string', example: 'Complete initial system setup and configuration' },
              dueDate: { type: 'string', format: 'date', example: '2024-03-31' },
              completed: { type: 'boolean', example: false },
              completionDate: { type: 'string', format: 'date', example: null },
              budget: { type: 'number', example: 1000000 },
              actualCost: { type: 'number', example: null }
            }
          }
        },
        riskAssessment: {
          type: 'object',
          properties: {
            factors: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Technical complexity', 'Resource availability']
            },
            mitigationStrategies: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['Regular technical reviews', 'Early resource planning']
            },
            lastAssessmentDate: { type: 'string', format: 'date', example: '2024-01-01' },
            nextAssessmentDate: { type: 'string', format: 'date', example: '2024-02-01' }
          }
        },
        reportingFrequency: { 
          type: 'string',
          enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'],
          example: 'Monthly'
        },
        riskLevel: {
          type: 'string',
          enum: ['Low', 'Medium', 'High'],
          example: 'Medium'
        },
        procurementMethod: {
          type: 'string',
          enum: ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Quotation'],
          example: 'Open Tender'
        },
        projectProposal: { type: 'string', format: 'binary' },
        signedContract: { type: 'string', format: 'binary' },
        executionMemo: { type: 'string', format: 'binary' },
        signedBudget: { type: 'string', format: 'binary' }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Project created successfully.',
    type: CreateProjectDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Bad Request - Invalid input data or missing required fields.' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing authentication token.' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User does not have permission to create projects.' 
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'projectProposal', maxCount: 1 },
    { name: 'signedContract', maxCount: 1 },
    { name: 'executionMemo', maxCount: 1 },
    { name: 'signedBudget', maxCount: 1 }
  ]))
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFiles() files: {
      projectProposal?: Express.Multer.File[],
      signedContract?: Express.Multer.File[],
      executionMemo?: Express.Multer.File[],
      signedBudget?: Express.Multer.File[],
    },
  ) {
    if (!files.projectProposal?.[0]) {
      throw new BadRequestException('Project proposal document is required');
    }
    if (!files.signedContract?.[0]) {
      throw new BadRequestException('Signed contract document is required');
    }
    if (!files.executionMemo?.[0]) {
      throw new BadRequestException('Contract execution memo is required');
    }
    if (!files.signedBudget?.[0]) {
      throw new BadRequestException('Signed budget document is required');
    }

    const [
      projectProposalResult,
      signedContractResult,
      executionMemoResult,
      signedBudgetResult
    ] = await Promise.all([
      this.cloudinaryService.uploadFile(files.projectProposal[0], 'project-proposals'),
      this.cloudinaryService.uploadFile(files.signedContract[0], 'signed-contracts'),
      this.cloudinaryService.uploadFile(files.executionMemo[0], 'execution-memos'),
      this.cloudinaryService.uploadFile(files.signedBudget[0], 'signed-budgets')
    ]);

    // Parse dates and nested objects
    const parsedData = {
      ...createProjectDto,
      projectManager: typeof createProjectDto.projectManager === 'string' 
        ? JSON.parse(createProjectDto.projectManager)
        : createProjectDto.projectManager,
      teamMembers: typeof createProjectDto.teamMembers === 'string'
        ? JSON.parse(createProjectDto.teamMembers)
        : createProjectDto.teamMembers,
      milestones: typeof createProjectDto.milestones === 'string'
        ? JSON.parse(createProjectDto.milestones)
        : createProjectDto.milestones,
      riskAssessment: typeof createProjectDto.riskAssessment === 'string'
        ? JSON.parse(createProjectDto.riskAssessment)
        : createProjectDto.riskAssessment,
      contractStartDate: new Date(createProjectDto.contractStartDate),
      contractEndDate: new Date(createProjectDto.contractEndDate),
      projectProposalUrl: projectProposalResult.secure_url,
      signedContractUrl: signedContractResult.secure_url,
      executionMemoUrl: executionMemoResult.secure_url,
      signedBudgetUrl: signedBudgetResult.secure_url,
      status: createProjectDto.status || 'draft'
    };

    // Parse dates in nested objects
    if (Array.isArray(parsedData.teamMembers)) {
      parsedData.teamMembers = parsedData.teamMembers.map(member => ({
        ...member,
        startDate: new Date(member.startDate),
        endDate: member.endDate ? new Date(member.endDate) : undefined
      }));
    }

    if (Array.isArray(parsedData.milestones)) {
      parsedData.milestones = parsedData.milestones.map(milestone => ({
        ...milestone,
        dueDate: new Date(milestone.dueDate),
        completionDate: milestone.completionDate ? new Date(milestone.completionDate) : undefined
      }));
    }

    if (parsedData.riskAssessment) {
      parsedData.riskAssessment = {
        ...parsedData.riskAssessment,
        lastAssessmentDate: new Date(parsedData.riskAssessment.lastAssessmentDate),
        nextAssessmentDate: new Date(parsedData.riskAssessment.nextAssessmentDate)
      };
    }

    return this.projectService.create(parsedData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all projects' })
  @ApiResponse({ status: 200, description: 'Return all projects.' })
  findAll(@Query() query: any) {
    return this.projectService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by id' })
  @ApiResponse({ status: 200, description: 'Return the project.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  findOne(@Param('id') id: string) {
    return this.projectService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto) {
    return this.projectService.update(id, updateProjectDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  remove(@Param('id') id: string) {
    return this.projectService.remove(id);
  }

  @Get('contract/:contractId')
  @ApiOperation({ summary: 'Get projects by contract ID' })
  @ApiResponse({ status: 200, description: 'Return projects for the contract.' })
  findByContract(@Param('contractId') contractId: string) {
    return this.projectService.findByContract(contractId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update project status' })
  @ApiResponse({ status: 200, description: 'Project status updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string
  ) {
    return this.projectService.updateProjectStatus(id, status);
  }

  @Post(':id/team-members')
  @ApiOperation({ summary: 'Add team member to project' })
  @ApiResponse({ status: 201, description: 'Team member added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addTeamMember(
    @Param('id') id: string,
    @Body() teamMemberData: any
  ) {
    return this.projectService.addTeamMember(id, teamMemberData);
  }

  @Patch(':id/milestones/:milestoneId')
  @ApiOperation({ summary: 'Update project milestone' })
  @ApiResponse({ status: 200, description: 'Milestone updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project or milestone not found.' })
  updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @Body() milestoneData: any
  ) {
    return this.projectService.updateMilestone(id, milestoneId, milestoneData);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add document to project' })
  @ApiResponse({ status: 201, description: 'Document added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addDocument(
    @Param('id') id: string,
    @Body() documentData: any
  ) {
    return this.projectService.addDocument(id, documentData);
  }

  @Patch(':id/financials')
  @ApiOperation({ summary: 'Update project financials' })
  @ApiResponse({ status: 200, description: 'Financials updated successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  updateFinancials(
    @Param('id') id: string,
    @Body() financialData: any
  ) {
    return this.projectService.updateFinancials(id, financialData);
  }

  @Post(':id/kpis')
  @ApiOperation({ summary: 'Add KPI to project' })
  @ApiResponse({ status: 201, description: 'KPI added successfully.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  addKPI(
    @Param('id') id: string,
    @Body() kpiData: any
  ) {
    return this.projectService.updateKPIs(id, kpiData);
  }

  // @Post('upload/proposal')
  // @ApiOperation({ summary: 'Upload project proposal document' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary'
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadProposal(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) {
  //     throw new BadRequestException('No file uploaded');
  //   }
  //   const result = await this.cloudinaryService.uploadFile(file, 'project-proposals');
  //   return { url: result.secure_url };
  // }

  // @Post('upload/contract')
  // @ApiOperation({ summary: 'Upload signed contract document' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary'
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadContract(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) {
  //     throw new BadRequestException('No file uploaded');
  //   }
  //   const result = await this.cloudinaryService.uploadFile(file, 'signed-contracts');
  //   return { url: result.secure_url };
  // }

  // @Post('upload/memo')
  // @ApiOperation({ summary: 'Upload contract execution memo' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary'
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadMemo(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) {
  //     throw new BadRequestException('No file uploaded');
  //   }
  //   const result = await this.cloudinaryService.uploadFile(file, 'execution-memos');
  //   return { url: result.secure_url };
  // }

  // @Post('upload/budget')
  // @ApiOperation({ summary: 'Upload signed budget document' })
  // @ApiConsumes('multipart/form-data')
  // @ApiBody({
  //   schema: {
  //     type: 'object',
  //     properties: {
  //       file: {
  //         type: 'string',
  //         format: 'binary'
  //       },
  //     },
  //   },
  // })
  // @UseInterceptors(FileInterceptor('file'))
  // async uploadBudget(@UploadedFile() file: Express.Multer.File) {
  //   if (!file) {
  //     throw new BadRequestException('No file uploaded');
  //   }
  //   const result = await this.cloudinaryService.uploadFile(file, 'signed-budgets');
  //   return { url: result.secure_url };
  // }
}
