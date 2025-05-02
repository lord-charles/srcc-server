import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApprovalFlow, ApprovalFlowDocument } from './schemas/approval-flow.schema';

@Injectable()
export class ApprovalFlowService {
  constructor(
    @InjectModel(ApprovalFlow.name)
    private approvalFlowModel: Model<ApprovalFlowDocument>,
  ) {
    this.initializeDefaultFlows();
  }

  private async initializeDefaultFlows() {
    const defaultFlows = [
      {
        department: 'SRCC',
        description: 'SRCC Claims Approval Flow',
        steps: [
          {
            stepNumber: 1,
            role: 'claim_checker',
            department: 'SRCC',
            description: 'Initial check by SRCC staff',
            nextStatus: 'pending_srcc_finance_approval'
          },
          {
            stepNumber: 2,
            role: 'srcc_finance',
            department: 'SRCC',
            description: 'Final finance approval within SRCC',
            nextStatus: 'approved'
          }
        ]
      },
      {
        department: 'SU',
        description: 'SU Claims Approval Flow',
        steps: [
          {
            stepNumber: 1,
            role: 'claim_checker',
            department: 'SU',
            description: 'Initial check by SU staff',
            nextStatus: 'pending_reviewer_approval'
          },
          {
            stepNumber: 2,
            role: 'reviewer',
            department: 'SU',
            description: 'Review by SU staff',
            nextStatus: 'pending_approver_approval'
          },
          {
            stepNumber: 3,
            role: 'approver',
            department: 'SU',
            description: 'Approval by SU staff',
            nextStatus: 'pending_srcc_checker_approval'
          },
          {
            stepNumber: 4,
            role: 'srcc_checker',
            department: 'SRCC',
            description: 'Check by SRCC staff',
            nextStatus: 'pending_srcc_finance_approval'
          },
          {
            stepNumber: 5,
            role: 'srcc_finance',
            department: 'SRCC',
            description: 'Final finance approval by SRCC',
            nextStatus: 'approved'
          }
        ]
      },
      {
        department: 'SBS',
        description: 'SBS Claims Approval Flow',
        steps: [
          {
            stepNumber: 1,
            role: 'head_of_programs',
            department: 'SBS',
            description: 'Initial approval by Head of Programs',
            nextStatus: 'pending_director_approval'
          },
          {
            stepNumber: 2,
            role: 'director',
            department: 'SBS',
            description: 'Director approval',
            nextStatus: 'pending_academic_director_approval'
          },
          {
            stepNumber: 3,
            role: 'academic_director',
            department: 'SBS',
            description: 'Academic Director approval',
            nextStatus: 'pending_finance_approval'
          },
          {
            stepNumber: 4,
            role: 'finance',
            department: 'SBS',
            description: 'Finance approval within SBS',
            nextStatus: 'pending_srcc_checker_approval'
          },
          {
            stepNumber: 5,
            role: 'srcc_checker',
            department: 'SRCC',
            description: 'Check by SRCC staff',
            nextStatus: 'pending_srcc_finance_approval'
          },
          {
            stepNumber: 6,
            role: 'srcc_finance',
            department: 'SRCC',
            description: 'Final finance approval by SRCC',
            nextStatus: 'approved'
          }

        ]
      }
    ];

    for (const flow of defaultFlows) {
      await this.approvalFlowModel.findOneAndUpdate(
        { department: flow.department },
        flow,
        { upsert: true, new: true }
      );
    }
  }

  async getApprovalFlow(department: string): Promise<ApprovalFlowDocument> {
    const flow = await this.approvalFlowModel.findOne({
      department,
      isActive: true
    });

    if (!flow) {
      throw new NotFoundException(`No active approval flow found for department ${department}`);
    }

    return flow;
  }

  async getNextApprovalStep(department: string, currentStatus: string): Promise<{
    nextStatus: string;
    role: string;
    department: string;
  } | null> {
    const flow = await this.getApprovalFlow(department);
    console.log(flow)

    // For initial submission
    if (currentStatus === 'draft') {
      const firstStep = flow.steps[0];
      return {
        nextStatus: `pending_${firstStep.role}_approval`,
        role: firstStep.role,
        department: firstStep.department
      };
    }

    // Find current step
    const currentStep = flow.steps.find(step =>
      currentStatus === `pending_${step.role}_approval`
    );
    console.log(currentStatus, currentStep);

    if (!currentStep) {
      return null;
    }

    // Find next step
    const nextStep = flow.steps.find(step =>
      currentStep.nextStatus === 'approved'
        ? step.stepNumber === currentStep.stepNumber
        : step.stepNumber === currentStep.stepNumber + 1
    );

    return nextStep ? {
      nextStatus: currentStep.nextStatus,
      role: nextStep.role,
      department: nextStep.department
    } : null;
  }
  
async addApprovalFlow(dto: Partial<ApprovalFlow>): Promise<ApprovalFlowDocument> {
    // Upsert based on department
    return this.approvalFlowModel.findOneAndUpdate(
      { department: dto.department },
      dto,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  async deleteApprovalFlow(id: string): Promise<boolean> {
    const res = await this.approvalFlowModel.findByIdAndDelete(id);
    return !!res;
  }


  async getApprovalFlows(): Promise<ApprovalFlowDocument[]> {
    return this.approvalFlowModel.find();
  }

  async getApprovalFlowById(id: string): Promise<ApprovalFlowDocument | null> {
    return this.approvalFlowModel.findById(id);
  }
}
