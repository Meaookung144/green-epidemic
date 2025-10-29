import { prisma } from '@/lib/prisma';

interface LineMessage {
  type: 'text' | 'flex';
  text?: string;
  altText?: string;
  contents?: any;
}

interface LineNotificationData {
  userId: string;
  message: LineMessage;
  reportId?: string;
}

class LineMessagingService {
  private channelAccessToken: string;
  private apiUrl = 'https://api.line.me/v2/bot/message';

  constructor() {
    this.channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
    if (!this.channelAccessToken) {
      console.warn('LINE_CHANNEL_ACCESS_TOKEN not found in environment variables');
    }
  }

  async sendMessage(lineUserId: string, message: LineMessage): Promise<boolean> {
    if (!this.channelAccessToken) {
      console.error('LINE messaging not configured - missing access token');
      return false;
    }

    try {
      const response = await fetch(`${this.apiUrl}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.channelAccessToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [message],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('LINE API error:', response.status, errorData);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending LINE message:', error);
      return false;
    }
  }

  async sendTextMessage(lineUserId: string, text: string): Promise<boolean> {
    return this.sendMessage(lineUserId, {
      type: 'text',
      text: text,
    });
  }

  async sendHealthAlert(lineUserId: string, reportData: any): Promise<boolean> {
    const flexMessage = {
      type: 'flex' as const,
      altText: `🚨 Health Alert: ${reportData.type} report in your area`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🚨 Health Alert',
              weight: 'bold',
              color: '#ff5551',
              size: 'xl',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${reportData.type} Report`,
              weight: 'bold',
              size: 'lg',
              margin: 'md',
            },
            {
              type: 'text',
              text: reportData.description || 'A health incident has been reported in your area.',
              wrap: true,
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'Severity:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${reportData.severity}/5`,
                      wrap: true,
                      color: reportData.severity >= 4 ? '#ff5551' : reportData.severity >= 3 ? '#ffaa00' : '#00aa00',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'Location:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: reportData.address || `${reportData.latitude?.toFixed(4)}, ${reportData.longitude?.toFixed(4)}`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'Symptoms:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: reportData.symptoms?.join(', ') || 'Not specified',
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'View on Map',
                uri: `${process.env.NEXTAUTH_URL}/?lat=${reportData.latitude}&lng=${reportData.longitude}`,
              },
            },
            {
              type: 'spacer',
              size: 'sm',
            },
          ],
          flex: 0,
        },
      },
    };

    return this.sendMessage(lineUserId, flexMessage);
  }

  async sendEnvironmentalAlert(lineUserId: string, alertData: any): Promise<boolean> {
    const severityColor = alertData.severity === 'HIGH' || alertData.severity === 'CRITICAL' ? '#ff5551' : 
                         alertData.severity === 'MEDIUM' ? '#ffaa00' : '#00aa00';

    const flexMessage = {
      type: 'flex' as const,
      altText: `🌍 Environmental Alert: ${alertData.severity} air quality conditions`,
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🌍 Environmental Alert',
              weight: 'bold',
              color: severityColor,
              size: 'xl',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${alertData.severity} Air Quality`,
              weight: 'bold',
              size: 'lg',
              color: severityColor,
              margin: 'md',
            },
            {
              type: 'text',
              text: alertData.message || 'Air quality conditions in your area require attention.',
              wrap: true,
              margin: 'md',
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'lg',
              spacing: 'sm',
              contents: [
                ...(alertData.pm25 ? [{
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'PM2.5:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${alertData.pm25} μg/m³`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                }] : []),
                ...(alertData.aqi ? [{
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'AQI:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: `${alertData.aqi}`,
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                }] : []),
                {
                  type: 'box',
                  layout: 'baseline',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'text',
                      text: 'Location:',
                      color: '#aaaaaa',
                      size: 'sm',
                      flex: 2,
                    },
                    {
                      type: 'text',
                      text: alertData.location || 'Your area',
                      wrap: true,
                      color: '#666666',
                      size: 'sm',
                      flex: 5,
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: 'View Environmental Data',
                uri: `${process.env.NEXTAUTH_URL}/`,
              },
            },
          ],
          flex: 0,
        },
      },
    };

    return this.sendMessage(lineUserId, flexMessage);
  }

  async notifyUsersInRadius(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
    message: LineMessage,
    reportId?: string
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Find users within radius who have LINE connected
      const users = await prisma.user.findMany({
        where: {
          lineId: { not: null },
          homeLatitude: { not: null },
          homeLongitude: { not: null },
        },
        select: {
          id: true,
          lineId: true,
          homeLatitude: true,
          homeLongitude: true,
          name: true,
        },
      });

      const usersInRadius = users.filter(user => {
        if (!user.homeLatitude || !user.homeLongitude || !user.lineId) return false;
        
        const distance = this.calculateDistance(
          centerLat,
          centerLng,
          user.homeLatitude,
          user.homeLongitude
        );
        
        return distance <= radiusKm;
      });

      let sent = 0;
      let failed = 0;

      // Send notifications
      for (const user of usersInRadius) {
        try {
          const success = await this.sendMessage(user.lineId!, message);
          
          // Log notification in database
          await prisma.notification.create({
            data: {
              userId: user.id,
              reportId: reportId || null,
              channel: 'LINE',
              title: message.altText || 'Notification',
              message: message.text || message.altText || 'Notification',
              sent: success,
              sentAt: success ? new Date() : null,
              error: success ? null : 'Failed to send LINE message',
            },
          });

          if (success) {
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to notify user ${user.id}:`, error);
          failed++;
        }
      }

      return { sent, failed };
    } catch (error) {
      console.error('Error in notifyUsersInRadius:', error);
      return { sent: 0, failed: 0 };
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const lineMessagingService = new LineMessagingService();