import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    console.log('=== DEBUG SESSION INFO ===');
    console.log('Full session:', JSON.stringify(session, null, 2));
    
    let dbUser = null;
    if (session?.user?.id) {
      dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
      console.log('DB User:', JSON.stringify(dbUser, null, 2));
    }
    
    return NextResponse.json({
      session,
      dbUser,
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userName: session?.user?.name,
      sessionRole: (session?.user as any)?.role,
      dbRole: dbUser?.role,
      isAdmin: (session?.user as any)?.role === 'ADMIN',
      isDbAdmin: dbUser?.role === 'ADMIN'
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { error: 'Failed to get session', details: error },
      { status: 500 }
    );
  }
}