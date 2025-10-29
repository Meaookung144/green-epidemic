import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/consultations - Get all consultations (admin only)
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
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const doctorId = searchParams.get('doctorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (doctorId) {
      whereClause.doctorId = doctorId;
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

    const consultations = await prisma.telemedConsultation.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        riskAssessment: {
          select: {
            patientName: true,
            primarySymptoms: true,
            riskLevel: true,
            recommendation: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    const totalCount = await prisma.telemedConsultation.count({
      where: whereClause
    });

    // Get summary statistics
    const stats = await prisma.telemedConsultation.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Get doctor statistics
    const doctorStats = await prisma.telemedConsultation.groupBy({
      by: ['doctorId'],
      _count: {
        id: true
      },
      where: {
        doctorId: { not: null }
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });

    // Get doctor names for stats
    const doctorIds = doctorStats.map(d => d.doctorId).filter(Boolean);
    const doctors = await prisma.user.findMany({
      where: {
        id: { in: doctorIds }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const doctorStatsWithNames = doctorStats.map(stat => ({
      ...stat,
      doctor: doctors.find(d => d.id === stat.doctorId)
    }));

    return NextResponse.json({
      consultations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      statistics: {
        statusStats,
        doctorStats: doctorStatsWithNames
      }
    });

  } catch (error) {
    console.error('Admin consultations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    );
  }
}