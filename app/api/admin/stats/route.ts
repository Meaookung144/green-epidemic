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

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    // Calculate date range
    let daysBack = 30;
    switch (range) {
      case '7d': daysBack = 7; break;
      case '30d': daysBack = 30; break;
      case '90d': daysBack = 90; break;
      case '1y': daysBack = 365; break;
    }
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    // Get statistics
    const [
      totalUsers,
      totalReports,
      pendingReports,
      approvedReports,
      rejectedReports,
      totalAnalyses,
      highRiskAssessments,
      recentReports,
      reportsByType,
      severityDistribution,
      dailyReports
    ] = await Promise.all([
      prisma.user.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.report.count({ where: { status: 'APPROVED' } }),
      prisma.report.count({ where: { status: 'REJECTED' } }),
      prisma.aIAnalysis.count(),
      prisma.riskAssessment.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
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
      }),
      prisma.report.groupBy({
        by: ['severity'],
        _count: true,
        where: {
          severity: { not: null }
        }
      }),
      prisma.report.findMany({
        select: {
          reportDate: true
        },
        where: {
          reportDate: { gte: startDate }
        }
      })
    ]);

    return NextResponse.json({
      overview: {
        totalUsers,
        totalReports,
        pendingReports,
        approvedReports,
        rejectedReports,
        totalAnalyses,
        highRiskAssessments
      },
      trends: {
        dailyReports: Object.entries(
          dailyReports.reduce((acc, item) => {
            const date = item.reportDate.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([date, count]) => ({
          date,
          count
        })).sort((a, b) => a.date.localeCompare(b.date)),
        weeklyUsers: [], // Would need more complex query
        reportsByType: reportsByType.map(item => ({
          type: item.type,
          count: item._count
        })),
        severityDistribution: severityDistribution.map(item => ({
          severity: item.severity?.toString() || 'unknown',
          count: item._count
        }))
      },
      geographical: {
        provinceStats: [] // Would need location data in reports
      },
      recentReports
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}