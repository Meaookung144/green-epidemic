import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || '1'; // Default to last 1 day
    const limit = parseInt(searchParams.get('limit') || '100');
    const minConfidence = parseInt(searchParams.get('minConfidence') || '50');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const hotspots = await prisma.hotspot.findMany({
      where: {
        acquisitionDate: {
          gte: startDate,
          lte: endDate,
        },
        confidence: {
          gte: minConfidence,
        },
        isActive: true,
      },
      orderBy: {
        acquisitionDate: 'desc',
      },
      take: limit,
    });

    return NextResponse.json({
      hotspots,
      count: hotspots.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Hotspots API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotspots' },
      { status: 500 }
    );
  }
}