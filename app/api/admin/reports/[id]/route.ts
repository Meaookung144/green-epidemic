import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, adminId } = body;

    const updateData: any = {};
    
    if (action === 'approve') {
      updateData.status = 'APPROVED';
      updateData.approvedBy = adminId;
      updateData.approvedAt = new Date();
    } else if (action === 'reject') {
      updateData.status = 'REJECTED';
      updateData.rejectedBy = adminId;
      updateData.rejectedAt = new Date();
    }

    const report = await prisma.report.update({
      where: { id: params.id },
      data: updateData,
    });

    // If approved, trigger notifications for nearby users
    if (action === 'approve') {
      await triggerNearbyNotifications(report);
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

async function triggerNearbyNotifications(report: any) {
  try {
    // Find all surveillance points within 500 meters
    const surveillancePoints = await prisma.surveillancePoint.findMany({
      where: {
        active: true,
      },
      include: {
        user: {
          include: {
            notificationPreferences: true,
          },
        },
      },
    });

    const notificationsToCreate = [];

    for (const point of surveillancePoints) {
      const distance = calculateDistance(
        report.latitude,
        report.longitude,
        point.latitude,
        point.longitude
      );

      if (distance <= point.radius) {
        const linePreference = point.user.notificationPreferences.find(
          (p: any) => p.channel === 'LINE' && p.enabled
        );

        if (linePreference && linePreference.reportTypes.includes(report.type)) {
          notificationsToCreate.push({
            userId: point.user.id,
            reportId: report.id,
            channel: 'LINE',
            title: `Health Alert Near ${point.name}`,
            message: `A confirmed ${report.type} case has been reported within ${Math.round(distance)} meters of your surveillance point "${point.name}".`,
            data: {
              reportId: report.id,
              distance,
              pointName: point.name,
              reportType: report.type,
            },
          });
        }
      }
    }

    // Also check home locations
    const users = await prisma.user.findMany({
      where: {
        homeLatitude: { not: null },
        homeLongitude: { not: null },
      },
      include: {
        notificationPreferences: true,
      },
    });

    for (const user of users) {
      if (user.homeLatitude && user.homeLongitude) {
        const distance = calculateDistance(
          report.latitude,
          report.longitude,
          user.homeLatitude,
          user.homeLongitude
        );

        if (distance <= 500) {
          const linePreference = user.notificationPreferences.find(
            (p: any) => p.channel === 'LINE' && p.enabled
          );

          if (linePreference && linePreference.reportTypes.includes(report.type)) {
            notificationsToCreate.push({
              userId: user.id,
              reportId: report.id,
              channel: 'LINE',
              title: 'Health Alert Near Home',
              message: `A confirmed ${report.type} case has been reported within ${Math.round(distance)} meters of your home location.`,
              data: {
                reportId: report.id,
                distance,
                reportType: report.type,
              },
            });
          }
        }
      }
    }

    // Create notifications
    if (notificationsToCreate.length > 0) {
      await prisma.notification.createMany({
        data: notificationsToCreate,
      });
    }
  } catch (error) {
    console.error('Error sending notifications:', error);
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}