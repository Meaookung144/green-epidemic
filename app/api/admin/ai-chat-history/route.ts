import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/ai-chat-history - Get AI chat history (admin/volunteer only)
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
        { error: 'Admin or Volunteer access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('userId');
    const riskLevel = searchParams.get('riskLevel');
    const shouldConsultDoctor = searchParams.get('shouldConsultDoctor');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const whereClause: any = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    if (shouldConsultDoctor !== null) {
      whereClause.shouldConsultDoctor = shouldConsultDoctor === 'true';
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const chatSessions = await prisma.AIHealthChat.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.AIHealthChat.count({
      where: whereClause
    });

    // Get summary statistics
    const riskLevelStats = await prisma.AIHealthChat.groupBy({
      by: ['riskLevel'],
      _count: {
        id: true
      },
      where: {
        riskLevel: { not: null }
      }
    });

    const consultDoctorStats = await prisma.AIHealthChat.groupBy({
      by: ['shouldConsultDoctor'],
      _count: {
        id: true
      }
    });

    // Get recent high-risk cases
    const highRiskCases = await prisma.AIHealthChat.findMany({
      where: {
        OR: [
          { riskLevel: 'HIGH' },
          { riskLevel: 'CRITICAL' },
          { shouldConsultDoctor: true }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      chatSessions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        riskLevelStats: riskLevelStats.reduce((acc, stat) => {
          acc[stat.riskLevel || 'UNKNOWN'] = stat._count.id;
          return acc;
        }, {} as Record<string, number>),
        consultDoctorStats: consultDoctorStats.reduce((acc, stat) => {
          acc[stat.shouldConsultDoctor ? 'needsDoctor' : 'selfCare'] = stat._count.id;
          return acc;
        }, {} as Record<string, number>)
      },
      highRiskCases
    });

  } catch (error) {
    console.error('AI chat history API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI chat history' },
      { status: 500 }
    );
  }
}