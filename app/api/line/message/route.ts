import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { lineMessagingService } from '@/lib/services/lineMessagingService';
import { prisma } from '@/lib/prisma';

// POST /api/line/message - Send LINE message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin and volunteer roles can send LINE messages
    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'VOLUNTEER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const {
      type,
      recipients,
      message,
      reportId,
      centerLat,
      centerLng,
      radiusKm
    } = await request.json();

    let sent = 0;
    let failed = 0;

    if (type === 'radius') {
      // Send to users within radius
      if (!centerLat || !centerLng || !radiusKm) {
        return NextResponse.json(
          { error: 'Missing location parameters for radius notification' },
          { status: 400 }
        );
      }

      const result = await lineMessagingService.notifyUsersInRadius(
        parseFloat(centerLat),
        parseFloat(centerLng),
        parseFloat(radiusKm),
        message,
        reportId
      );

      sent = result.sent;
      failed = result.failed;

    } else if (type === 'specific') {
      // Send to specific users
      if (!recipients || !Array.isArray(recipients)) {
        return NextResponse.json(
          { error: 'Recipients array is required for specific notifications' },
          { status: 400 }
        );
      }

      for (const userId of recipients) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { lineId: true, name: true }
          });

          if (user?.lineId) {
            const success = await lineMessagingService.sendMessage(user.lineId, message);
            
            // Log notification
            await prisma.notification.create({
              data: {
                userId: userId,
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
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error sending to user ${userId}:`, error);
          failed++;
        }
      }

    } else {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      message: `Sent ${sent} messages successfully, ${failed} failed`
    });

  } catch (error) {
    console.error('LINE message API error:', error);
    return NextResponse.json(
      { error: 'Failed to send LINE messages' },
      { status: 500 }
    );
  }
}

// GET /api/line/message - Get notification history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'VOLUNTEER') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const notifications = await prisma.notification.findMany({
      where: {
        channel: 'LINE'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        report: {
          select: {
            title: true,
            type: true,
            severity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.notification.count({
      where: {
        channel: 'LINE'
      }
    });

    return NextResponse.json({
      notifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('Get LINE notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}