import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { notificationService } from '@/lib/services/notificationService';

// POST /api/notifications/test - Test notification system
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, location } = body;

    let result;

    switch (type) {
      case 'environmental':
        result = await notificationService.sendEnvironmentalAlert(
          {
            latitude: location?.latitude || 13.7563,
            longitude: location?.longitude || 100.5018,
            radiusKm: 5
          },
          'PM2.5',
          75, // Current value
          50  // Threshold
        );
        break;

      case 'test':
      default:
        result = await notificationService.sendLocationBasedNotifications(
          {
            latitude: location?.latitude || 13.7563,
            longitude: location?.longitude || 100.5018,
            radiusKm: 5
          },
          {
            title: 'Test Notification',
            message: 'This is a test notification to verify the integration system is working properly.',
            type: 'SYSTEM_UPDATE',
            severity: 'LOW'
          }
        );
        break;
    }

    return NextResponse.json({
      success: true,
      message: 'Notification test completed',
      result
    });

  } catch (error) {
    console.error('Notification test error:', error);
    return NextResponse.json(
      { error: 'Failed to test notifications' },
      { status: 500 }
    );
  }
}