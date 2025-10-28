import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const points = await prisma.surveillancePoint.findMany({
      where: { userId: (session.user as any).id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(points);
  } catch (error) {
    console.error('Surveillance points API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch surveillance points' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, latitude, longitude, address, radius } = body;

    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Name, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const point = await prisma.surveillancePoint.create({
      data: {
        userId: (session.user as any).id,
        name,
        latitude,
        longitude,
        address: address || null,
        radius: radius || 500,
        active: true,
      },
    });

    return NextResponse.json(point);
  } catch (error) {
    console.error('Create surveillance point error:', error);
    return NextResponse.json(
      { error: 'Failed to create surveillance point' },
      { status: 500 }
    );
  }
}