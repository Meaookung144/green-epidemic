import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, latitude, longitude, address, radius, active } = body;

    // Verify the surveillance point belongs to the user
    const existingPoint = await prisma.surveillancePoint.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existingPoint || existingPoint.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const point = await prisma.surveillancePoint.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        address: address || undefined,
        radius: radius || undefined,
        active: active !== undefined ? active : undefined,
      },
    });

    return NextResponse.json(point);
  } catch (error) {
    console.error('Update surveillance point error:', error);
    return NextResponse.json(
      { error: 'Failed to update surveillance point' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the surveillance point belongs to the user
    const existingPoint = await prisma.surveillancePoint.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existingPoint || existingPoint.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.surveillancePoint.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete surveillance point error:', error);
    return NextResponse.json(
      { error: 'Failed to delete surveillance point' },
      { status: 500 }
    );
  }
}