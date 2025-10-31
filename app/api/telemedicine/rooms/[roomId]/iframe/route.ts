import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { meetingRoomService } from '@/lib/services/meetingRoomService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { roomId } = await params;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Find consultation by room ID and verify access
    const consultation = await prisma.telemedConsultation.findFirst({
      where: {
        roomId: roomId,
        OR: [
          { patientId: (session.user as any).id },
          { doctorId: (session.user as any).id }
        ]
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { error: 'Room not found or access denied' },
        { status: 404 }
      );
    }

    // Generate the Cloudflare iframe URL
    const iframeUrl = meetingRoomService.getCloudflareIframeUrl(roomId, token);

    return NextResponse.json({
      iframeUrl,
      roomId,
      message: 'Iframe URL generated successfully'
    });

  } catch (error) {
    console.error('Iframe URL generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate iframe URL' },
      { status: 500 }
    );
  }
}