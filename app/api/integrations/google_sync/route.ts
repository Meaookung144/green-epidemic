import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/integrations/google_sync - Enable Google Sync
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is already connected via Google OAuth
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user?.googleId) {
      return NextResponse.json(
        { error: 'Google account not connected. Please sign in with Google first.' },
        { status: 400 }
      );
    }

    // Enable Google Sync
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleSyncEnabled: true
      }
    });

    console.log(`Google Sync enabled for user ${session.user.email}`);
    // In real implementation, this could sync data to Google Drive, Calendar, etc.

    return NextResponse.json({
      success: true,
      message: 'Google Sync enabled successfully',
      user: {
        googleSyncEnabled: updatedUser.googleSyncEnabled
      }
    });

  } catch (error) {
    console.error('Google Sync enable error:', error);
    return NextResponse.json(
      { error: 'Failed to enable Google Sync' },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/google_sync - Disable Google Sync
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        googleSyncEnabled: false
      }
    });

    console.log(`Google Sync disabled for user ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Google Sync disabled successfully',
      user: {
        googleSyncEnabled: updatedUser.googleSyncEnabled
      }
    });

  } catch (error) {
    console.error('Google Sync disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable Google Sync' },
      { status: 500 }
    );
  }
}