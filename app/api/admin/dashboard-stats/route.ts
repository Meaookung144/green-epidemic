import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get dashboard statistics
    const [
      totalReports,
      pendingReports,
      totalUsers,
      activeUsers,
      recentAnalyses,
      highRiskAssessments,
      activeMeetings,
      aiChatSessions
    ] = await Promise.all([
      // Total reports
      prisma.report.count(),
      
      // Pending reports
      prisma.report.count({
        where: { status: 'PENDING' }
      }),
      
      // Total users
      prisma.user.count(),
      
      // Active users (last 30 days)
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Recent AI analyses (last 7 days)
      prisma.aIAnalysis.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // High risk assessments
      prisma.riskAssessment.count({
        where: {
          riskLevel: {
            in: ['HIGH', 'CRITICAL']
          }
        }
      }),
      
      // Active telemedicine meetings (last 24 hours)
      prisma.telemedConsultation.count({
        where: {
          status: 'IN_PROGRESS',
          startedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // AI chat sessions (last 7 days)
      prisma.aIHealthChat.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return NextResponse.json({
      totalReports,
      pendingReports,
      totalUsers,
      activeUsers,
      recentAnalyses,
      highRiskAssessments,
      activeMeetings,
      aiChatSessions
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}