import { db } from '../db/store';
import { Notification } from '../types';

export class NotificationService {
  /**
   * Create an in-app notification for a user.
   */
  static createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    link?: string
  ): Notification {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      title,
      message,
      type,
      link: link || null,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    db.notifications.unshift(notification);
    return notification;
  }

  /**
   * Retrieve all notifications for a specific user, sorted newest first.
   */
  static getUserNotifications(userId: string): Notification[] {
    return db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Mark a single notification as read.
   */
  static markAsRead(notificationId: string, userId: string): boolean {
    const notif = db.notifications.find((n) => n.id === notificationId && n.userId === userId);
    if (!notif) return false;
    notif.isRead = true;
    return true;
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  static markAllAsRead(userId: string): number {
    let count = 0;
    for (const notif of db.notifications) {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        count++;
      }
    }
    return count;
  }

  /**
   * Get unread count for user.
   */
  static getUnreadCount(userId: string): number {
    return db.notifications.filter((n) => n.userId === userId && !n.isRead).length;
  }
}
