import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Test hotspots API called');
    
    // Get all hotspots without auth for testing
    const hotspots = await prisma.hotspot.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        acquisitionDate: 'desc',
      },
      take: 10,
    });

    console.log(`🧪 Found ${hotspots.length} hotspots in test API`);
    
    return NextResponse.json({
      message: 'Test API - Hotspots fetched successfully',
      hotspots,
      count: hotspots.length,
      sample: hotspots[0] || null,
    });
  } catch (error) {
    console.error('🧪 Test hotspots API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hotspots', details: error },
      { status: 500 }
    );
  }
}