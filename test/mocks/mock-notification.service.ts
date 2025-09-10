import { INotificationService } from 'src/core/notification/notification.interface';

export class MockNotificationService implements INotificationService {
  private sentNotifications: Array<{ email: string; nickname: string }> = [];

  async sendWelcomeNotification(email: string, nickname: string): Promise<void> {
    // 🔑 실제로는 이메일을 보내지 않고, 호출 기록만 저장
    this.sentNotifications.push({ email, nickname });
    console.log(`📧 Mock: Would send welcome email to ${email} (${nickname})`);
  }

  // 테스트용 헬퍼 메서드들
  getSentNotifications() {
    return this.sentNotifications;
  }

  clearHistory() {
    this.sentNotifications = [];
  }
}