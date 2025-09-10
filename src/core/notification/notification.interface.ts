export interface INotificationService {
  sendWelcomeNotification(email: string, nickname: string): Promise<void>;
}

export const NOTIFICATION_SERVICE = 'NOTIFICATION_SERVICE';