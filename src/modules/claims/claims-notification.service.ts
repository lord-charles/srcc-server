import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notifications/services/notification.service';
import { Claim } from './schemas/claim.schema';
import { User } from '../auth/schemas/user.schema';
import { Project } from '../project/schemas/project.schema';

@Injectable()
export class ClaimsNotificationService {
  constructor(private readonly notificationService: NotificationService) {}

  private async notifyUser(user: User, subject: string, message: string) {
    await Promise.all([
      this.notificationService.sendEmail(user.email, subject, message),
      this.notificationService.sendSMS(user.phoneNumber, message)
    ]);
  }

  async notifyClaimCreated(claim: Claim, project: Project, claimant: User, approvers: User[]) {
    const subject = `New Claim Submitted - ${project.name}`;
    const message = `${claimant.firstName} ${claimant.lastName} has submitted a new claim for ${project.name} worth ${claim.currency} ${claim.amount}`;

    // Notify each approver
    await Promise.all(approvers.map(approver => 
      this.notifyUser(approver, subject, message)
    ));
  }

  async notifyClaimSubmitted(claim: Claim, project: Project, claimant: User, approvers: User[]) {
    const subject = `Claim Pending Approval - ${project.name}`;
    const message = `${claimant.firstName} ${claimant.lastName} has submitted a claim for ${project.name} that requires your approval`;

    // Notify each approver
    await Promise.all(approvers.map(approver => 
      this.notifyUser(approver, subject, message)
    ));
  }

  async notifyClaimApproved(claim: Claim, project: Project, claimant: User, approver: User) {
    const subject = `Claim Approved - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been approved by ${approver.firstName} ${approver.lastName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimRejected(claim: Claim, project: Project, claimant: User, approver: User, reason: string) {
    const subject = `Claim Rejected - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been rejected by ${approver.firstName} ${approver.lastName}.\n\nReason: ${reason}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimPaid(claim: Claim, project: Project, claimant: User, paidBy: User) {
    const subject = `Claim Payment Processed - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been marked as paid by ${paidBy.firstName} ${paidBy.lastName}.\n\nTransaction ID: ${claim.payment?.transactionId || 'N/A'}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimCancelled(claim: Claim, project: Project, claimant: User, cancelledBy: User) {
    const subject = `Claim Cancelled - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been cancelled by ${cancelledBy.firstName} ${cancelledBy.lastName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimUpdated(claim: Claim, project: Project, claimant: User, updatedBy: User) {
    const subject = `Claim Updated - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been updated by ${updatedBy.firstName} ${updatedBy.lastName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }
}
