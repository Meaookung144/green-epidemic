import { prisma } from '@/lib/prisma';

interface NotificationData {
  title: string;
  message: string;
  type: 'ENVIRONMENTAL_ALERT' | 'HEALTH_REPORT' | 'SYSTEM_UPDATE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data?: any;
}

interface LocationBounds {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export class NotificationService {
  
  /**
   * Send notifications to users with connected services in a specific area
   */
  async sendLocationBasedNotifications(
    location: LocationBounds,
    notification: NotificationData
  ) {
    try {
      // Find users with surveillance points in the affected area
      const affectedUsers = await this.findUsersInArea(location);
      
      console.log(`Found ${affectedUsers.length} users in notification area`);
      
      // Send notifications to each user via their connected services
      const results = await Promise.allSettled(
        affectedUsers.map(user => this.sendToUser(user, notification))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Notifications sent: ${successful} successful, ${failed} failed`);
      
      return {
        totalUsers: affectedUsers.length,
        successful,
        failed,
        results
      };

    } catch (error) {
      console.error('Error sending location-based notifications:', error);
      throw error;
    }
  }

  /**
   * Send notification about a new health report to nearby users
   */
  async notifyNearbyUsersOfReport(reportId: string) {
    try {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: { user: true }
      });

      if (!report) {
        console.error('Report not found:', reportId);
        return;
      }

      const notification: NotificationData = {
        title: `New ${report.type} Report Nearby`,
        message: `A new ${report.type.toLowerCase()} case has been reported in your surveillance area. Title: ${report.title}`,
        type: 'HEALTH_REPORT',
        severity: this.getSeverityFromReportSeverity(report.severity || 1),
        data: {
          reportId: report.id,
          reportType: report.type,
          location: {
            latitude: report.latitude,
            longitude: report.longitude
          }
        }
      };

      return await this.sendLocationBasedNotifications(
        {
          latitude: report.latitude,
          longitude: report.longitude,
          radiusKm: 2 // 2km radius for health reports
        },
        notification
      );

    } catch (error) {
      console.error('Error notifying users of new report:', error);
      throw error;
    }
  }

  /**
   * Send environmental alerts (high PM2.5, etc.)
   */
  async sendEnvironmentalAlert(
    location: LocationBounds,
    alertType: string,
    value: number,
    threshold: number
  ) {
    const severity = this.getEnvironmentalSeverity(value, threshold);
    
    const notification: NotificationData = {
      title: `Environmental Alert: High ${alertType}`,
      message: `${alertType} levels are ${severity.toLowerCase()} in your area. Current: ${value}, Threshold: ${threshold}`,
      type: 'ENVIRONMENTAL_ALERT',
      severity,
      data: {
        alertType,
        value,
        threshold,
        location
      }
    };

    return await this.sendLocationBasedNotifications(location, notification);
  }

  /**
   * Find users with surveillance points in the specified area
   */
  private async findUsersInArea(location: LocationBounds): Promise<any[]> {
    const { latitude, longitude, radiusKm } = location;
    
    // Convert radius from km to degrees (approximately)
    const radiusDegrees = radiusKm / 111; // 1 degree ≈ 111 km

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              // Users with home location in the area
              {
                AND: [
                  { homeLatitude: { gte: latitude - radiusDegrees } },
                  { homeLatitude: { lte: latitude + radiusDegrees } },
                  { homeLongitude: { gte: longitude - radiusDegrees } },
                  { homeLongitude: { lte: longitude + radiusDegrees } },
                ]
              },
              // Users with surveillance points in the area
              {
                surveillancePoints: {
                  some: {
                    AND: [
                      { latitude: { gte: latitude - radiusDegrees } },
                      { latitude: { lte: latitude + radiusDegrees } },
                      { longitude: { gte: longitude - radiusDegrees } },
                      { longitude: { lte: longitude + radiusDegrees } },
                      { active: true }
                    ]
                  }
                }
              }
            ]
          },
          // Only users with connected services
          {
            OR: [
              { lineOfficialConnected: true },
              { googleSyncEnabled: true }
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        lineOfficialConnected: true,
        lineOfficialUserId: true,
        googleSyncEnabled: true,
        notificationPreferences: true
      }
    });

    return users;
  }

  /**
   * Send notification to a specific user via their connected services
   */
  private async sendToUser(user: any, notification: NotificationData) {
    const promises = [];

    // Send via LINE if connected
    if (user.lineOfficialConnected && user.lineOfficialUserId) {
      promises.push(this.sendLineMessage(user.lineOfficialUserId, notification));
    }

    // Send via Google services if enabled (placeholder)
    if (user.googleSyncEnabled) {
      promises.push(this.sendGoogleNotification(user, notification));
    }

    // Store notification in database
    promises.push(this.storeNotificationInDB(user.id, notification));

    const results = await Promise.allSettled(promises);
    return {
      userId: user.id,
      userEmail: user.email,
      results
    };
  }

  /**
   * Send LINE message (simulated - replace with actual LINE API)
   */
  private async sendLineMessage(lineUserId: string, notification: NotificationData) {
    try {
      // Simulate LINE message sending
      console.log(`📱 LINE Message sent to ${lineUserId}:`);
      console.log(`🚨 ${notification.title}`);
      console.log(`📝 ${notification.message}`);
      
      // In real implementation:
      // const response = await axios.post('https://api.line.me/v2/bot/message/push', {
      //   to: lineUserId,
      //   messages: [{
      //     type: 'text',
      //     text: `🚨 ${notification.title}\n\n${notification.message}`
      //   }]
      // }, {
      //   headers: {
      //     'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      //     'Content-Type': 'application/json'
      //   }
      // });

      return { success: true, service: 'LINE', lineUserId };
    } catch (error) {
      console.error('LINE message send error:', error);
      throw error;
    }
  }

  /**
   * Send Google notification (placeholder)
   */
  private async sendGoogleNotification(user: any, notification: NotificationData) {
    try {
      // Simulate Google notification
      console.log(`☁️ Google notification sent to ${user.email}:`);
      console.log(`🚨 ${notification.title}`);
      console.log(`📝 ${notification.message}`);
      
      // In real implementation, could use:
      // - Gmail API to send email
      // - Google Calendar API to create events
      // - Google Drive API to create alert documents
      
      return { success: true, service: 'Google', email: user.email };
    } catch (error) {
      console.error('Google notification send error:', error);
      throw error;
    }
  }

  /**
   * Store notification in database for history
   */
  private async storeNotificationInDB(userId: string, notification: NotificationData) {
    try {
      await prisma.notification.create({
        data: {
          userId,
          title: notification.title,
          message: notification.message,
          channel: 'LINE', // Default channel for now
          data: notification.data,
          sent: true,
          sentAt: new Date()
        }
      });

      return { success: true, service: 'Database' };
    } catch (error) {
      console.error('Database notification store error:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private getSeverityFromReportSeverity(reportSeverity: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (reportSeverity <= 2) return 'LOW';
    if (reportSeverity <= 3) return 'MEDIUM';
    if (reportSeverity <= 4) return 'HIGH';
    return 'CRITICAL';
  }

  private getEnvironmentalSeverity(value: number, threshold: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const ratio = value / threshold;
    if (ratio <= 1.2) return 'LOW';
    if (ratio <= 1.5) return 'MEDIUM';
    if (ratio <= 2.0) return 'HIGH';
    return 'CRITICAL';
  }
}

export const notificationService = new NotificationService();