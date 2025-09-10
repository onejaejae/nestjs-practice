import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { NOTIFICATION_SERVICE } from './notification.interface';

@Module({
  providers: [
    {
      provide: NOTIFICATION_SERVICE,
      useClass: EmailService,
    },
  ],
  exports: [NOTIFICATION_SERVICE],
})
export class NotificationModule {}