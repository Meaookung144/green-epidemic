import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch current role from database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true, email: true }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Role check completed',
      userId: session.user.id,
      currentSessionRole: (session.user as any)?.role,
      databaseRole: dbUser.role,
      needsRefresh: (session.user as any)?.role !== dbUser.role,
      user: dbUser
    });
  } catch (error) {
    console.error('Refresh role error:', error);
    return NextResponse.json(
      { error: 'Failed to check role' },
      { status: 500 }
    );
  }
}