import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/bulk-health-stats - Get bulk health statistics
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

    const { searchParams } = new URL(request.url);
    const province = searchParams.get('province');
    const district = searchParams.get('district');
    const diseaseType = searchParams.get('diseaseType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    let whereClause: any = {};

    if (province) {
      whereClause.province = { contains: province, mode: 'insensitive' };
    }

    if (district) {
      whereClause.district = { contains: district, mode: 'insensitive' };
    }

    if (diseaseType) {
      whereClause.diseaseType = { contains: diseaseType, mode: 'insensitive' };
    }

    if (startDate || endDate) {
      whereClause.reportDate = {};
      if (startDate) {
        whereClause.reportDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.reportDate.lte = new Date(endDate);
      }
    }

    // Get statistics with pagination
    const [statistics, totalCount] = await Promise.all([
      prisma.bulkHealthStatistic.findMany({
        where: whereClause,
        orderBy: {
          reportDate: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.bulkHealthStatistic.count({
        where: whereClause
      })
    ]);

    // Get summary statistics
    const summaryStats = await prisma.bulkHealthStatistic.groupBy({
      by: ['diseaseType'],
      _sum: {
        caseCount: true
      },
      _count: {
        id: true
      },
      where: whereClause
    });

    const provinceStats = await prisma.bulkHealthStatistic.groupBy({
      by: ['province'],
      _sum: {
        caseCount: true
      },
      _count: {
        id: true
      },
      where: whereClause
    });

    return NextResponse.json({
      statistics,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      },
      summary: {
        diseaseStats: summaryStats,
        provinceStats: provinceStats,
        totalCases: summaryStats.reduce((sum, stat) => sum + (stat._sum.caseCount || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get bulk health stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bulk health statistics' },
      { status: 500 }
    );
  }
}

// POST /api/admin/bulk-health-stats - Add bulk health statistics
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role;
    const userId = (session.user as any).id;
    
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      province, 
      district, 
      subdistrict, 
      postcode,
      latitude,
      longitude,
      diseaseType, 
      caseCount, 
      populationCount,
      severity,
      ageGroup,
      gender,
      reportDate, 
      periodType = 'DAILY',
      sourceType = 'MANUAL',
      sourceReference,
      notes
    } = body;

    // Validation
    if (!province || !diseaseType || !caseCount || !reportDate) {
      return NextResponse.json(
        { error: 'Province, disease type, case count, and report date are required' },
        { status: 400 }
      );
    }

    if (caseCount < 0) {
      return NextResponse.json(
        { error: 'Case count must be a positive number' },
        { status: 400 }
      );
    }

    // Create the statistic record
    const statistic = await prisma.bulkHealthStatistic.create({
      data: {
        province,
        district,
        subdistrict,
        postcode,
        latitude,
        longitude,
        diseaseType,
        caseCount: parseInt(caseCount),
        populationCount: populationCount ? parseInt(populationCount) : null,
        severity,
        ageGroup,
        gender,
        reportDate: new Date(reportDate),
        periodType,
        sourceType,
        sourceReference,
        reportedBy: userId,
        notes
      }
    });

    return NextResponse.json({
      statistic,
      message: 'Health statistic added successfully'
    });

  } catch (error) {
    console.error('Create bulk health stat error:', error);
    return NextResponse.json(
      { error: 'Failed to create health statistic' },
      { status: 500 }
    );
  }
}