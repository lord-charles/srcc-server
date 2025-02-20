import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TeamMemberDto } from './dto/team-member.dto';
import { Schema as MongooseSchema } from 'mongoose';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = new this.projectModel(createProjectDto);
    return createdProject.save();
  }

  async findAll(query: any = {}): Promise<Project[]> {
    return this.projectModel.find(query).exec();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectModel
      .findById(id)
      .populate('projectManagerId', 'firstName lastName email')
      .populate('teamMembers.userId', 'firstName lastName email _id')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate('budgetId')
      .populate({
        path: 'invoices',
        populate: [
          { path: 'issuedBy', select: 'firstName lastName email' }, // Populate issuedBy
          {
            path: 'auditTrail.performedBy',
            select: 'firstName lastName email',
          },
        ],
      })
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, updateProjectDto, { new: true })
      .exec();

    if (!updatedProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return updatedProject;
  }

  async remove(id: string): Promise<void> {
    const result = await this.projectModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
  }

  async findByContract(contractId: string): Promise<Project[]> {
    return this.projectModel
      .find({ contractId })
      .populate('projectManagerId', 'firstName lastName email')
      .populate('teamMembers.userId', 'firstName lastName email _id')
      .exec();
  }

  async updateProjectStatus(id: string, status: string): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    milestoneData: any,
  ): Promise<Project> {
    const project = await this.projectModel
      .findOneAndUpdate(
        {
          _id: projectId,
          'milestones._id': milestoneId,
        },
        {
          $set: { 'milestones.$': milestoneData },
        },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException(`Project or milestone not found`);
    }
    return project;
  }

  async addDocument(id: string, documentData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { $push: { documents: documentData } },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateFinancials(id: string, financialData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        {
          $set: { financialTracking: financialData },
          $inc: { amountSpent: financialData.amount || 0 },
        },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateKPIs(id: string, kpiData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(id, { $push: { kpis: kpiData } }, { new: true })
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateProjectManager(
    id: string,
    projectManagerId: MongooseSchema.Types.ObjectId | null,
  ) {
    return this.projectModel
      .findByIdAndUpdate(id, { projectManagerId }, { new: true })
      .exec();
  }

  async addTeamMember(id: string, teamMember: TeamMemberDto) {
    return this.projectModel
      .findByIdAndUpdate(
        id,
        { $push: { teamMembers: teamMember } },
        { new: true },
      )
      .exec();
  }

  async updateTeamMember(
    id: string,
    teamMemberId: string,
    teamMember: TeamMemberDto,
  ) {
    return this.projectModel
      .findOneAndUpdate(
        { _id: id, 'teamMembers.userId': teamMemberId },
        {
          $set: {
            'teamMembers.$.startDate': teamMember.startDate,
            'teamMembers.$.endDate': teamMember.endDate,
            'teamMembers.$.responsibilities': teamMember.responsibilities,
          },
        },
        { new: true },
      )
      .exec();
  }

  async removeTeamMember(id: string, teamMemberId: string) {
    return this.projectModel
      .findByIdAndUpdate(
        id,
        { $pull: { teamMembers: { userId: teamMemberId } } },
        { new: true },
      )
      .exec();
  }
}
