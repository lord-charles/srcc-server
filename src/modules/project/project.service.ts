import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    const createdProject = new this.projectModel(createProjectDto);
    return createdProject.save();
  }

  async findAll(query: any = {}): Promise<Project[]> {
    return this.projectModel
      .find(query)
      .populate('contractId', 'name reference')
      .populate('projectManagerId', 'name email')
      .populate('teamMembers.userId', 'name email')
      .exec();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectModel
      .findById(id)
      .populate('contractId', 'name reference')
      .populate('projectManagerId', 'name email')
      .populate('teamMembers.userId', 'name email')
      .exec();
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
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
      .populate('projectManagerId', 'name email')
      .populate('teamMembers.userId', 'name email')
      .exec();
  }

  async updateProjectStatus(id: string, status: string): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { status },
        { new: true }
      )
      .exec();
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async addTeamMember(id: string, teamMemberData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { $push: { teamMembers: teamMemberData } },
        { new: true }
      )
      .exec();
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    milestoneData: any
  ): Promise<Project> {
    const project = await this.projectModel
      .findOneAndUpdate(
        { 
          _id: projectId,
          'milestones._id': milestoneId 
        },
        { 
          $set: { 'milestones.$': milestoneData }
        },
        { new: true }
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
        { new: true }
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
          $inc: { amountSpent: financialData.amount || 0 }
        },
        { new: true }
      )
      .exec();
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async updateKPIs(id: string, kpiData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        id,
        { $push: { kpis: kpiData } },
        { new: true }
      )
      .exec();
    
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }
}
