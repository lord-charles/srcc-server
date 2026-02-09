import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import {
  Organization,
  OrganizationDocument,
} from '../auth/schemas/organization.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { TeamMemberDto } from './dto/team-member.dto';
import { Schema as MongooseSchema } from 'mongoose';

@Injectable()
export class ProjectService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Organization.name)
    private organizationModel: Model<OrganizationDocument>,
  ) {}

  async create(createProjectDto: CreateProjectDto): Promise<Project> {
    try {
      const createdProject = new this.projectModel(createProjectDto);
      return await createdProject.save();
    } catch (error) {
      throw new BadRequestException(`Error: ${error.message}`);
    }
  }

  async findAll(query: any = {}, userId?: string): Promise<Project[]> {
    // Determine if the requester has admin access (can be a User or Organization)
    let hasAdminAccess = false;
    if (userId) {
      const user = await this.userModel.findById(userId).select('roles').lean();
      if (user && Array.isArray(user.roles) && user.roles.includes('admin')) {
        hasAdminAccess = true;
      } else {
        const org = await this.organizationModel
          .findById(userId)
          .select('roles')
          .lean();
        if (org && Array.isArray(org.roles) && org.roles.includes('admin')) {
          hasAdminAccess = true;
        }
      }
    }

    const finalQuery = hasAdminAccess
      ? { ...query }
      : {
          $and: [
            { ...query },
            {
              $or: [
                { createdBy: userId },
                { projectManagerId: userId },
                { 'assistantProjectManagers.userId': userId },
                { 'teamMembers.userId': userId },
                { 'coachManagers.userId': userId },
                { 'coachAssistants.userId': userId },
              ],
            },
          ],
        };

    return this.projectModel
      .find(finalQuery)
      .populate('createdBy', 'firstName lastName email')
      .exec();
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectModel
      .findById(id)
      .populate('projectManagerId', 'firstName lastName email')
      .populate('assistantProjectManagers.userId', 'firstName lastName email')
      .populate('assistantProjectManagers.contractId')
      .populate('teamMembers.userId', 'firstName lastName email _id')
      .populate('coachManagers.userId', 'firstName lastName email')
      .populate('coachAssistants.userId', 'firstName lastName email')
      .populate('coaches.userId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email')
      .populate({
        path: 'budgetId',
        populate: [
          {
            path: 'auditTrail.performedBy',
            select: 'firstName lastName email',
          },
        ],
      })
      .populate({
        path: 'invoices',
        populate: [
          { path: 'issuedBy', select: 'firstName lastName email' },
          {
            path: 'auditTrail.performedBy',
            select: 'firstName lastName email',
          },
        ],
      })
      .populate({
        path: 'teamMemberContracts',
        populate: [
          { path: 'contractedUserId', select: 'firstName lastName email' },
        ],
      })
      .lean()
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Manually populate milestoneId for contracts
    if (project.teamMemberContracts && project.milestones) {
      project.teamMemberContracts = project.teamMemberContracts.map(
        (contract: any) => {
          if (contract.milestoneId) {
            const milestone = project.milestones.find(
              (m: any) => m._id.toString() === contract.milestoneId.toString(),
            );
            if (milestone) {
              return {
                ...contract,
                milestoneId: milestone,
              };
            }
          }
          return contract;
        },
      );
    }

    // Manually populate milestoneId for team members
    if (project.teamMembers && project.milestones) {
      project.teamMembers = project.teamMembers.map((member: any) => {
        if (member.milestoneId) {
          const milestone = project.milestones.find(
            (m: any) => m._id.toString() === member.milestoneId.toString(),
          );
          if (milestone) {
            return {
              ...member,
              milestoneId: milestone,
            };
          }
        }
        return member;
      });
    }

    // Manually populate milestoneId for coaches
    if (project.coaches && project.milestones) {
      project.coaches = project.coaches.map((coach: any) => {
        if (coach.milestoneId) {
          const milestone = project.milestones.find(
            (m: any) => m._id.toString() === coach.milestoneId.toString(),
          );
          if (milestone) {
            return {
              ...coach,
              milestoneId: milestone,
            };
          }
        }
        return coach;
      });
    }

    return project as any;
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

  async remove(id: string, userId: string): Promise<void> {
    // Check if user is admin
    const user = await this.userModel.findById(userId).select('roles').lean();
    if (!user || !user.roles?.includes('admin')) {
      throw new BadRequestException('Only administrators can delete projects');
    }

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
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  async updateTeamMember(
    id: string,
    teamMemberId: string,
    teamMember: TeamMemberDto,
  ) {
    const updateFields: any = {
      'teamMembers.$.startDate': teamMember.startDate,
      'teamMembers.$.endDate': teamMember.endDate,
      'teamMembers.$.responsibilities': teamMember.responsibilities,
    };

    if (teamMember.milestoneId) {
      updateFields['teamMembers.$.milestoneId'] = teamMember.milestoneId;
    }

    return this.projectModel
      .findOneAndUpdate(
        { _id: id, 'teamMembers.userId': teamMemberId },
        { $set: updateFields },
        { new: true },
      )
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  async removeTeamMember(id: string, teamMemberId: string) {
    return this.projectModel
      .findByIdAndUpdate(
        id,
        { $pull: { teamMembers: { userId: teamMemberId } } },
        { new: true },
      )
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  // Milestone-specific team member methods
  async addTeamMemberToMilestone(
    projectId: string,
    milestoneId: string,
    teamMember: TeamMemberDto,
  ) {
    const teamMemberWithMilestone = {
      ...teamMember,
      milestoneId: milestoneId as any,
    };

    return this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $push: { teamMembers: teamMemberWithMilestone } },
        { new: true },
      )
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  async updateTeamMemberInMilestone(
    projectId: string,
    milestoneId: string,
    teamMemberId: string,
    teamMember: TeamMemberDto,
  ) {
    const updateFields: any = {
      'teamMembers.$.startDate': teamMember.startDate,
      'teamMembers.$.endDate': teamMember.endDate,
      'teamMembers.$.responsibilities': teamMember.responsibilities,
      'teamMembers.$.milestoneId': milestoneId,
    };

    return this.projectModel
      .findOneAndUpdate(
        {
          _id: projectId,
          'teamMembers.userId': teamMemberId,
          'teamMembers.milestoneId': milestoneId,
        },
        { $set: updateFields },
        { new: true },
      )
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  async removeTeamMemberFromMilestone(
    projectId: string,
    milestoneId: string,
    teamMemberId: string,
  ) {
    return this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $pull: {
            teamMembers: {
              userId: teamMemberId,
              milestoneId: milestoneId,
            },
          },
        },
        { new: true },
      )
      .populate('teamMembers.userId', 'firstName lastName email')
      .exec();
  }

  // Coach Managers
  async addCoachManager(
    projectId: string,
    data: { userId: MongooseSchema.Types.ObjectId; responsibilities: string[] },
  ): Promise<Project> {
    return this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $push: {
            coachManagers: {
              userId: data.userId,
              responsibilities: data.responsibilities || [],
              assignedDate: new Date(),
            },
          },
        },
        { new: true },
      )
      .populate('coachManagers.userId', 'firstName lastName email')
      .exec();
  }

  async updateCoachManager(
    projectId: string,
    managerUserId: string,
    update: { responsibilities?: string[] },
  ): Promise<Project> {
    const updateFields: any = {};
    if (update.responsibilities) {
      updateFields['coachManagers.$.responsibilities'] =
        update.responsibilities;
    }
    const project = await this.projectModel
      .findOneAndUpdate(
        { _id: projectId, 'coachManagers.userId': managerUserId },
        { $set: updateFields },
        { new: true },
      )
      .populate('coachManagers.userId', 'firstName lastName email')
      .exec();
    if (!project)
      throw new NotFoundException('Project or coach manager not found');
    return project;
  }

  async removeCoachManager(
    projectId: string,
    managerUserId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $pull: { coachManagers: { userId: managerUserId } } },
        { new: true },
      )
      .populate('coachManagers.userId', 'firstName lastName email')
      .exec();
    if (!project)
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    return project;
  }

  // Coach Assistants
  async addCoachAssistant(
    projectId: string,
    data: { userId: MongooseSchema.Types.ObjectId; responsibilities: string[] },
  ): Promise<Project> {
    return this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $push: {
            coachAssistants: {
              userId: data.userId,
              responsibilities: data.responsibilities || [],
              assignedDate: new Date(),
            },
          },
        },
        { new: true },
      )
      .populate('coachAssistants.userId', 'firstName lastName email')
      .exec();
  }

  async updateCoachAssistant(
    projectId: string,
    assistantUserId: string,
    update: { responsibilities?: string[] },
  ): Promise<Project> {
    const updateFields: any = {};
    if (update.responsibilities) {
      updateFields['coachAssistants.$.responsibilities'] =
        update.responsibilities;
    }
    const project = await this.projectModel
      .findOneAndUpdate(
        { _id: projectId, 'coachAssistants.userId': assistantUserId },
        { $set: updateFields },
        { new: true },
      )
      .populate('coachAssistants.userId', 'firstName lastName email')
      .exec();
    if (!project)
      throw new NotFoundException('Project or coach assistant not found');
    return project;
  }

  async removeCoachAssistant(
    projectId: string,
    assistantUserId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $pull: { coachAssistants: { userId: assistantUserId } } },
        { new: true },
      )
      .populate('coachAssistants.userId', 'firstName lastName email')
      .exec();
    if (!project)
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    return project;
  }

  // Coaches (milestone-scoped)
  async addCoach(
    projectId: string,
    coach: {
      userId: MongooseSchema.Types.ObjectId;
      milestoneId: MongooseSchema.Types.ObjectId;
      startDate?: Date;
      endDate?: Date;
      responsibilities: string[];
      contract: {
        rate: number;
        rateUnit: 'per_session' | 'per_hour';
        currency: 'KES' | 'USD';
        notes?: string;
      };
    },
  ): Promise<Project> {
    return this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $push: { coaches: coach } },
        { new: true },
      )
      .populate('coaches.userId', 'firstName lastName email')
      .exec();
  }

  async updateCoach(
    projectId: string,
    coachUserId: string,
    milestoneId: string,
    update: {
      startDate?: Date;
      endDate?: Date;
      responsibilities?: string[];
      milestoneId?: string;
      contract?: {
        rate?: number;
        rateUnit?: 'per_session' | 'per_hour';
        currency?: 'KES' | 'USD';
        notes?: string;
      };
    },
  ): Promise<Project> {
    const updateFields: any = {};
    if (update.startDate !== undefined)
      updateFields['coaches.$.startDate'] = update.startDate;
    if (update.endDate !== undefined)
      updateFields['coaches.$.endDate'] = update.endDate;
    if (update.responsibilities)
      updateFields['coaches.$.responsibilities'] = update.responsibilities;
    if (update.milestoneId)
      updateFields['coaches.$.milestoneId'] = update.milestoneId;
    if (update.contract) {
      for (const key of Object.keys(update.contract)) {
        updateFields[`coaches.$.contract.${key}`] = (update.contract as any)[
          key
        ];
      }
    }
    const project = await this.projectModel
      .findOneAndUpdate(
        {
          _id: projectId,
          'coaches.userId': coachUserId,
          'coaches.milestoneId': milestoneId,
        },
        { $set: updateFields },
        { new: true },
      )
      .populate('coaches.userId', 'firstName lastName email')
      .exec();
    if (!project) throw new NotFoundException('Project or coach not found');
    return project;
  }

  async removeCoach(
    projectId: string,
    coachUserId: string,
    milestoneId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $pull: {
            coaches: {
              userId: coachUserId as any,
              milestoneId: milestoneId as any,
            },
          },
        },
        { new: true },
      )
      .populate('coaches.userId', 'firstName lastName email')
      .exec();
    if (!project)
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    return project;
  }

  async addMilestone(projectId: string, milestoneData: any): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $push: { milestones: milestoneData } },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project;
  }

  async deleteMilestone(
    projectId: string,
    milestoneId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { $pull: { milestones: { _id: milestoneId } } },
        { new: true },
      )
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project;
  }

  async addAssistantProjectManager(
    projectId: string,
    assistantData: {
      userId: MongooseSchema.Types.ObjectId;
      contractId?: MongooseSchema.Types.ObjectId;
      responsibilities: string[];
    },
  ): Promise<Project> {
    // Check if user is already an assistant PM
    const project = await this.projectModel.findById(projectId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const existingAssistant = project.assistantProjectManagers?.find(
      (apm) => apm.userId.toString() === assistantData.userId.toString(),
    );

    if (existingAssistant) {
      throw new BadRequestException(
        'User is already an assistant project manager',
      );
    }

    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $push: {
            assistantProjectManagers: {
              ...assistantData,
              assignedDate: new Date(),
            },
          },
        },
        { new: true },
      )
      .populate('assistantProjectManagers.userId', 'firstName lastName email')
      .populate('assistantProjectManagers.contractId')
      .exec();

    return updatedProject;
  }

  async updateAssistantProjectManager(
    projectId: string,
    assistantUserId: string,
    updateData: {
      contractId?: MongooseSchema.Types.ObjectId;
      responsibilities?: string[];
    },
  ): Promise<Project> {
    const updateFields: any = {};
    if (updateData.contractId) {
      updateFields['assistantProjectManagers.$.contractId'] =
        updateData.contractId;
    }
    if (updateData.responsibilities) {
      updateFields['assistantProjectManagers.$.responsibilities'] =
        updateData.responsibilities;
    }

    const project = await this.projectModel
      .findOneAndUpdate(
        {
          _id: projectId,
          'assistantProjectManagers.userId': assistantUserId,
        },
        { $set: updateFields },
        { new: true },
      )
      .populate('assistantProjectManagers.userId', 'firstName lastName email')
      .populate('assistantProjectManagers.contractId')
      .exec();

    if (!project) {
      throw new NotFoundException(
        `Project or assistant project manager not found`,
      );
    }
    return project;
  }

  async removeAssistantProjectManager(
    projectId: string,
    assistantUserId: string,
  ): Promise<Project> {
    const project = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $pull: {
            assistantProjectManagers: { userId: assistantUserId },
          },
        },
        { new: true },
      )
      .populate('assistantProjectManagers.userId', 'firstName lastName email')
      .populate('assistantProjectManagers.contractId')
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
    return project;
  }
}
