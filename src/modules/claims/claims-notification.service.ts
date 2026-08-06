import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from '../notifications/services/notification.service';
import { Claim } from './schemas/claim.schema';
import { Project } from '../project/schemas/project.schema';

@Injectable()
export class ClaimsNotificationService {
  private readonly logger = new Logger(ClaimsNotificationService.name);

  constructor(private readonly notificationService: NotificationService) {}

  private getEntityName(entity: any): string {
    if (!entity) return 'Unknown';
    if (entity.companyName) return entity.companyName;
    return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || 'Unknown';
  }

  private async notifyUser(user: any, subject: string, message: string) {
    const email = user.email || user.businessEmail || user.contactPerson?.email;
    const phoneNumber = user.phoneNumber || user.businessPhone || user.contactPerson?.phoneNumber;
    if (!email) {
      this.logger.warn(`No email found for user/org: ${JSON.stringify(user)}`);
      return;
    }
    this.logger.log(
      `Sending notification to ${email} (${phoneNumber || 'no phone'})`,
    );
    this.logger.log(`Subject: ${subject}`);

    try {
      const promises: Promise<any>[] = [
        this.notificationService.sendEmail(email, subject, message),
      ];
      if (phoneNumber) {
        promises.push(this.notificationService.sendSMS(phoneNumber, message));
      }
      await Promise.all(promises);
      this.logger.log(`Notification sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification to ${email}: ${error.message}`,
      );
      throw error;
    }
  }

  async notifyClaimCreated(
    claim: Claim,
    project: Project,
    claimant: any,
    approvers: any[],
  ) {
    this.logger.log(`notifyClaimCreated called for claim ${claim}`);
    this.logger.log(`Number of approvers to notify: ${approvers.length}`);

    const claimantName = this.getEntityName(claimant);
    const subject = `New Claim Submitted - ${project.name}`;
    const message = `${claimantName} has submitted a new claim for ${project.name} worth ${claim.currency} ${claim.amount}`;

    // Notify each approver
    await Promise.all(
      approvers.map((approver) => this.notifyUser(approver, subject, message)),
    );

    this.logger.log(
      `Finished notifying ${approvers.length} approvers for claim creation`,
    );
  }

  async notifyClaimSubmitted(
    claim: Claim,
    project: Project,
    claimant: any,
    approvers: any[],
  ) {
    this.logger.log(`Number of approvers to notify: ${approvers.length}`);

    const claimantName = this.getEntityName(claimant);
    const subject = `Claim Pending Approval - ${project.name}`;
    const message = `${claimantName} has submitted a claim for ${project.name} that requires your approval`;

    // Notify each approver
    await Promise.all(
      approvers.map((approver) => this.notifyUser(approver, subject, message)),
    );

    this.logger.log(
      `Finished notifying ${approvers.length} approvers for claim submission`,
    );
  }

  async notifyClaimApproved(
    claim: Claim,
    project: Project,
    claimant: any,
    approver: any,
  ) {
    const approverName = this.getEntityName(approver);
    const subject = `Claim Approved - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been approved by ${approverName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimRejected(
    claim: Claim,
    project: Project,
    claimant: any,
    approver: any,
    reason: string,
  ) {
    const approverName = this.getEntityName(approver);
    const subject = `Claim Rejected - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been rejected by ${approverName}.\n\nReason: ${reason}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimPaid(
    claim: Claim,
    project: Project,
    claimant: any,
    paidBy: any,
  ) {
    const paidByName = this.getEntityName(paidBy);
    const subject = `Claim Payment Processed - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been marked as paid by ${paidByName}.\n\nTransaction ID: ${claim.payment?.transactionId || 'N/A'}\nPayment Advice: ${claim.payment?.paymentAdviceUrl || 'Not available'}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimCancelled(
    claim: Claim,
    project: Project,
    claimant: any,
    cancelledBy: any,
  ) {
    const cancelledByName = this.getEntityName(cancelledBy);
    const subject = `Claim Cancelled - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been cancelled by ${cancelledByName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }

  async notifyClaimUpdated(
    claim: Claim,
    project: Project,
    claimant: any,
    updatedBy: any,
  ) {
    const updatedByName = this.getEntityName(updatedBy);
    const subject = `Claim Updated - ${project.name}`;
    const message = `Your claim for ${project.name} worth ${claim.currency} ${claim.amount} has been updated by ${updatedByName}`;

    // Notify claimant
    await this.notifyUser(claimant, subject, message);
  }
}
