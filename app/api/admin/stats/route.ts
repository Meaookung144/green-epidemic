import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Get statistics
    const [
      totalUsers,
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports,
      recentReports,
      reportsByType
    ] = await Promise.all([
      prisma.user.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'APPROVED' } }),
      prisma.report.count({ where: { status: 'REJECTED' } }),
      prisma.report.findMany({
        take: 5,
        orderBy: { reportDate: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.report.groupBy({
        by: ['type'],
        _count: true,
      })
    ]);

    return NextResponse.json({
      totalUsers,
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports,
      recentReports,
      reportsByType: reportsByType.map(item => ({
        type: item.type,
        count: item._count
      }))
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}