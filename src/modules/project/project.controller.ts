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
    
    All monetary values should be in the specified currency (KES for Kenyan Shillings).
    Project status will initially be set to 'draft'.`
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: [
        'name',
        'description',
        'contractId',
        'totalBudget',
        'totalProjectValue',
        'currency',
        'contractStartDate',
        'contractEndDate',
        'client',
        'status',
        'projectManagerId',
        'procurementMethod',
        'riskLevel',
        'reportingFrequency'
      ],
      properties: {
        name: { 
          type: 'string', 
          description: 'Project name',
          example: 'Mombasa Port Modernization Phase II'
        },
        description: { 
          type: 'string', 
          description: 'Project description',
          example: 'Second phase of Mombasa Port modernization including automation of cargo handling systems and expansion of berth capacity'
        },
        contractId: { 
          type: 'string', 
          description: 'Contract ID (MongoDB ObjectId)',
          pattern: '^[0-9a-fA-F]{24}$',
          example: '507f1f77bcf86cd799439011'
        },
        totalBudget: { 
          type: 'number', 
          description: 'Total budget in KES',
          minimum: 0,
          example: 2500000000 // 2.5B KES
        },
        totalProjectValue: { 
          type: 'number', 
          description: 'Total project value in KES',
          minimum: 0,
          example: 2300000000 // 2.3B KES
        },
        currency: { 
          type: 'string', 
          description: 'Currency code',
          example: 'KES',
          default: 'KES'
        },
        contractStartDate: { 
          type: 'string', 
          format: 'date', 
          description: 'Contract start date',
          example: '2025-03-01'
        },
        contractEndDate: { 
          type: 'string', 
          format: 'date', 
          description: 'Contract end date',
          example: '2027-02-28'
        },
        client: { 
          type: 'string', 
          description: 'Client name',
          example: 'Kenya Ports Authority'
        },
        status: { 
          type: 'string', 
          description: 'Project status',
          enum: ['draft', 'pending_approval', 'active', 'on_hold', 'completed', 'cancelled'],
          default: 'draft',
          example: 'draft'
        },
        projectManagerId: { 
          type: 'string', 
          description: 'Project manager user ID (MongoDB ObjectId)',
          pattern: '^[0-9a-fA-F]{24}$',
          example: '507f1f77bcf86cd799439011'
        },
        procurementMethod: { 
          type: 'string', 
          description: 'The procurement method used',
          example: 'Open Tender',
          enum: ['Open Tender', 'Restricted Tender', 'Direct Procurement', 'Request for Proposal', 'Request for Quotation']
        },
        riskLevel: { 
          type: 'string', 
          description: 'Risk level assessment for the project',
          enum: ['Low', 'Medium', 'High'],
          default: 'Medium',
          example: 'Medium'
        },
        reportingFrequency: { 
          type: 'string', 
          description: 'Frequency of progress reports',
          enum: ['Weekly', 'Biweekly', 'Monthly', 'Quarterly'],
          default: 'Monthly',
          example: 'Monthly'
        },
        projectProposal: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Project proposal document (PDF format)'
        },
        signedContract: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Signed contract document (PDF format)'
        },
        contractExecutionMemo: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Contract execution memo (PDF format)'
        },
        signedBudget: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary'
          },
          description: 'Signed budget document (PDF format)'
        }
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
    { name: 'contractExecutionMemo', maxCount: 1 },
    { name: 'signedBudget', maxCount: 1 }
  ]))
  async create(
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFiles() files: {
      projectProposal?: Express.Multer.File[],
      signedContract?: Express.Multer.File[],
      contractExecutionMemo?: Express.Multer.File[],
      signedBudget?: Express.Multer.File[],
    },
  ) {
    if (!files.projectProposal?.[0]) {
      throw new BadRequestException('Project proposal document is required');
    }
    if (!files.signedContract?.[0]) {
      throw new BadRequestException('Signed contract document is required');
    }
    if (!files.contractExecutionMemo?.[0]) {
      throw new BadRequestException('Contract execution memo is required');
    }
    if (!files.signedBudget?.[0]) {
      throw new BadRequestException('Signed budget document is required');
    }

    // Upload files to Cloudinary
    const [
      projectProposalResult,
      signedContractResult,
      contractExecutionMemoResult,
      signedBudgetResult
    ] = await Promise.all([
      this.cloudinaryService.uploadFile(files.projectProposal[0], 'project-proposals'),
      this.cloudinaryService.uploadFile(files.signedContract[0], 'signed-contracts'),
      this.cloudinaryService.uploadFile(files.contractExecutionMemo[0], 'execution-memos'),
      this.cloudinaryService.uploadFile(files.signedBudget[0], 'signed-budgets')
    ]);
    // Add document URLs to the DTO
    const projectData = {
      ...createProjectDto,
      projectProposalUrl: projectProposalResult.secure_url,
      signedContractUrl: signedContractResult.secure_url,
      contractExecutionMemoUrl: contractExecutionMemoResult.secure_url,
      signedBudgetUrl: signedBudgetResult.secure_url,
      status: createProjectDto.status || 'draft'
    };

    return this.projectService.create(projectData);
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
