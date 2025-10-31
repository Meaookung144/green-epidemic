import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationChannel } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }

    const reports = await prisma.report.findMany({
      where,
      take: limit,
      orderBy: {
        reportDate: 'desc',
      },
      select: {
        id: true,
        type: true,
        status: true,
        latitude: true,
        longitude: true,
        address: true,
        title: true,
        description: true,
        symptoms: true,
        severity: true,
        reportDate: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      type, 
      latitude, 
      longitude, 
      title, 
      description,
      symptoms,
      severity,
      address 
    } = body;

    if (!userId || !type || !latitude || !longitude || !title) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const report = await prisma.report.create({
      data: {
        userId,
        type,
        latitude,
        longitude,
        title,
        description,
        symptoms: symptoms || [],
        severity: severity || 1,
        address,
        status: 'PENDING',
      },
    });

    // Check for nearby surveillance points and send notifications
    await checkAndNotifyNearbyUsers(report);

    return NextResponse.json(report);
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    );
  }
}

async function checkAndNotifyNearbyUsers(report: any) {
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
        // Check user preferences
        const linePreference = point.user.notificationPreferences.find(
          (p: any) => p.channel === 'LINE' && p.enabled
        );

        if (linePreference && linePreference.reportTypes.includes(report.type)) {
          notificationsToCreate.push({
            userId: point.user.id,
            reportId: report.id,
            channel: NotificationChannel.LINE,
            title: `Health Alert Near ${point.name}`,
            message: `A ${report.type} case has been reported within ${Math.round(distance)} meters of your surveillance point "${point.name}". Title: ${report.title}`,
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
              channel: NotificationChannel.LINE,
              title: 'Health Alert Near Home',
              message: `A ${report.type} case has been reported within ${Math.round(distance)} meters of your home location. Title: ${report.title}`,
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
    console.error('Error checking and notifying users:', error);
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