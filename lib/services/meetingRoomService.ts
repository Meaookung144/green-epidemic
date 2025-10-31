import { v4 as uuidv4 } from 'uuid';

interface CloudflareRoomCredentials {
  roomId: string;
  callUrl: string;
  token?: string;
}

interface MeetingRoomOptions {
  patientId: string;
  doctorId?: string;
  consultationId: string;
  duration?: number;
}

export class MeetingRoomService {
  private apiToken: string;
  private accountId: string;

  constructor() {
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    
    if (!this.apiToken || !this.accountId) {
      console.warn('Cloudflare API credentials not configured - telemedicine features will be limited');
    }
  }

  async createMeetingRoom(options: MeetingRoomOptions): Promise<CloudflareRoomCredentials> {
    if (!this.apiToken || !this.accountId) {
      throw new Error('Cloudflare API credentials not configured. Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.');
    }

    try {
      const roomId = `telemedicine-${options.consultationId}-${Date.now()}`;
      
      // Create a Cloudflare Calls app
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/calls/apps`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Consultation-${options.consultationId}`,
          // Cloudflare Calls doesn't use uid, the system generates an app_uid
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cloudflare API Error Response:', errorData);
        throw new Error(`Cloudflare API error: ${errorData.errors?.[0]?.message || errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // The actual app ID from Cloudflare
      const appId = data.result?.app_uid || data.result?.id;
      
      if (!appId) {
        throw new Error('No app ID returned from Cloudflare');
      }
      
      // Generate our internal meeting room URL
      const callUrl = this.generateJoinUrl(appId, '');
      
      return {
        roomId: appId,
        callUrl,
        token: ''  // Token will be generated per user
      };
    } catch (error) {
      console.error('Error creating meeting room:', error);
      throw new Error('Failed to create meeting room');
    }
  }

  async generateUserToken(roomId: string, userId: string, role: 'patient' | 'doctor'): Promise<string> {
    if (!this.apiToken || !this.accountId) {
      throw new Error('Cloudflare API credentials not configured. Please set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables.');
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/calls/apps/${roomId}/sessions/new`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Session configuration for the user
          sessionDescription: {
            userName: role === 'doctor' ? 'Doctor' : 'Patient',
            userId: userId,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token generation error:', errorData);
        throw new Error(`Token generation error: ${errorData.errors?.[0]?.message || errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.result?.token || data.result?.sessionId || '';
    } catch (error) {
      console.error('Error generating user token:', error);
      throw new Error('Failed to generate user token');
    }
  }

  async endMeetingRoom(roomId: string): Promise<void> {
    if (!this.apiToken || !this.accountId) {
      console.warn('Cloudflare API credentials not configured - cannot end meeting room');
      return;
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/calls/apps/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(`Room deletion error: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error ending meeting room:', error);
      throw new Error('Failed to end meeting room');
    }
  }

  async getRoomStatus(roomId: string): Promise<any> {
    if (!this.apiToken || !this.accountId) {
      console.warn('Cloudflare API credentials not configured - cannot get room status');
      return null;
    }

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/calls/apps/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorData = await response.json();
        throw new Error(`Room status error: ${errorData.errors?.[0]?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error getting room status:', error);
      throw new Error('Failed to get room status');
    }
  }

  generateJoinUrl(roomId: string, token: string): string {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return `${baseUrl}/telemedicine/room/${roomId}?token=${token}`;
  }

  getCloudflareIframeUrl(roomId: string, token: string): string {
    // Generate the Cloudflare Calls iframe URL
    return `https://iframe.cloudflarestream.com/calls/${roomId}?token=${token}`;
  }
}

export const meetingRoomService = new MeetingRoomService();