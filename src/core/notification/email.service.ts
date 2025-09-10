import { Injectable } from '@nestjs/common';
import { INotificationService } from './notification.interface';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EmailService implements INotificationService {
  constructor(private readonly loggerService: LoggerService) {}

  async sendWelcomeNotification(email: string, nickname: string): Promise<void> {
    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Sending welcome email to ${email} (${nickname})`,
    );
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.loggerService.info(
      this.sendWelcomeNotification.name,
      `Welcome email sent successfully to ${email}`,
    );
  }
}