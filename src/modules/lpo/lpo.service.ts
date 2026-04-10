import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Lpo, LpoDocument, LpoStatus } from './schemas/lpo.schema';
import { CreateLpoDto, SendLpoEmailDto } from './dto/lpo.dto';
import { NotificationService } from '../notifications/services/notification.service';
import { User, UserDocument } from '../auth/schemas/user.schema';

@Injectable()
export class LpoService {
  private readonly logger = new Logger(LpoService.name);

  constructor(
    @InjectModel(Lpo.name) private lpoModel: Model<LpoDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createLpoDto: CreateLpoDto, userId: string): Promise<Lpo> {
    const newLpo = new this.lpoModel({
      ...createLpoDto,
      preparedBy: userId,
      status: LpoStatus.SUBMITTED,
    });

    const savedLpo = await newLpo.save();

    // Notify HODs
    const hods = await this.userModel.find({ roles: 'hod' }).exec();
    for (const hod of hods) {
      if (hod.email) {
        await this.notificationService.sendEmail(
          hod.email,
          `New LPO Submitted for Approval`,
          `A new LPO (${savedLpo.lpoNo}) has been submitted and requires your approval as HOD.`,
        );
      }
    }

    return savedLpo;
  }

  async findByProject(projectId: string): Promise<Lpo[]> {
    return this.lpoModel
      .find({ projectId })
      .populate('supplierId', 'name email phone')
      .populate('preparedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findById(id: string): Promise<LpoDocument> {
    const lpo = await this.lpoModel
      .findById(id)
      .populate('supplierId')
      .populate('preparedBy', 'firstName lastName email')
      .exec();

    if (!lpo) {
      throw new NotFoundException(`LPO with ID ${id} not found`);
    }
    return lpo;
  }

  async updateStatus(
    id: string,
    status: LpoStatus,
    _userId: string,
  ): Promise<Lpo> {
    const lpo = await this.findById(id);
    lpo.status = status;
    const updatedLpo = await lpo.save();

    // Notification Logic
    if (status === LpoStatus.HOD_APPROVED) {
      // Notify Finance
      const finances = await this.userModel
        .find({ roles: 'srcc_finance' })
        .exec();
      for (const finance of finances) {
        if (finance.email) {
          await this.notificationService.sendEmail(
            finance.email,
            `LPO Pending Finance Approval`,
            `LPO (${updatedLpo.lpoNo}) has been approved by HOD and requires Finance approval.`,
          );
        }
      }
    } else if (status === LpoStatus.FINANCE_APPROVED) {
      // Notify Requester
      if (lpo.preparedBy && (lpo.preparedBy as any).email) {
        await this.notificationService.sendEmail(
          (lpo.preparedBy as any).email,
          `LPO Approved`,
          `Your LPO (${updatedLpo.lpoNo}) has been fully approved by Finance and is ready for dispatch.`,
        );
      }
    } else if (status === LpoStatus.REJECTED) {
      // Notify Requester
      if (lpo.preparedBy && (lpo.preparedBy as any).email) {
        await this.notificationService.sendEmail(
          (lpo.preparedBy as any).email,
          `LPO Rejected`,
          `Your LPO (${updatedLpo.lpoNo}) was rejected.`,
        );
      }
    }

    return updatedLpo;
  }

  async sendLpoEmail(id: string, payload: SendLpoEmailDto): Promise<boolean> {
    const lpo = await this.findById(id);
    if (!lpo) throw new NotFoundException('LPO not found');

    const supplier: any = lpo.supplierId;
    if (!supplier || !supplier.email) {
      throw new BadRequestException('Supplier email not found');
    }

    const { pdfBase64, ccEmails, message } = payload;
    const finalMessage =
      message ||
      `Please find attached the Local Purchase Order (${lpo.lpoNo}).`;

    // Strip the "data:application/pdf;base64," part if it exists
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

    const attachments = [
      {
        filename: `${lpo.lpoNo.replace(/\//g, '_')}.pdf`,
        content: Buffer.from(base64Data, 'base64'),
      },
    ];

    // Simple CC logic: since our NotificationService sendEmailWithAttachments expects a basic 'to',
    // If the service doesn't specifically support CC natively, we dispatch individual emails for CCs
    const success = await this.notificationService.sendEmailWithAttachments(
      supplier.email,
      `Local Purchase Order: ${lpo.lpoNo}`,
      finalMessage,
      attachments,
    );

    if (ccEmails && ccEmails.length > 0) {
      for (const cc of ccEmails) {
        if (cc && cc.trim()) {
          await this.notificationService.sendEmailWithAttachments(
            cc.trim(),
            `CC: Local Purchase Order: ${lpo.lpoNo}`,
            finalMessage,
            attachments,
          );
        }
      }
    }

    return success;
  }
}
