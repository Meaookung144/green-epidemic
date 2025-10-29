import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/telemedicine/consultations/[id]/start - Start consultation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const consultationId = params.id;

    // Verify consultation exists and user has permission
    const consultation = await prisma.telemedConsultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: true,
        doctor: true
      }
    });

    if (!consultation) {
      return NextResponse.json(
        { error: 'Consultation not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const canStart = userRole === 'DOCTOR' && consultation.doctorId === userId;
    const canJoin = consultation.patientId === userId || consultation.doctorId === userId;

    if (!canJoin) {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    // Generate video call room if not exists
    let roomId = consultation.roomId;
    let callUrl = consultation.callUrl;

    if (!roomId) {
      roomId = `room_${consultationId}_${Date.now()}`;
      // In a real implementation, you would integrate with a video calling service
      // like Agora, Twilio Video, or WebRTC
      callUrl = generateVideoCallUrl(roomId);
    }

    // Update consultation status
    const updateData: any = {
      roomId,
      callUrl
    };

    if (canStart && consultation.status === 'SCHEDULED') {
      updateData.status = 'IN_PROGRESS';
      updateData.startedAt = new Date();
    }

    const updatedConsultation = await prisma.telemedConsultation.update({
      where: { id: consultationId },
      data: updateData,
      include: {
        patient: {
          select: {
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      consultation: updatedConsultation,
      callUrl,
      roomId,
      message: canStart ? 'Consultation started' : 'Joining consultation'
    });

  } catch (error) {
    console.error('Start consultation error:', error);
    return NextResponse.json(
      { error: 'Failed to start consultation' },
      { status: 500 }
    );
  }
}

function generateVideoCallUrl(roomId: string): string {
  // In a real implementation, this would generate a URL for your video service
  // For demo purposes, we'll use a placeholder service
  const baseUrl = process.env.VIDEO_CALL_BASE_URL || 'https://meet.jit.si';
  return `${baseUrl}/${roomId}`;
}