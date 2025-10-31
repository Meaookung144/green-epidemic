import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { meetingRoomService } from '@/lib/services/meetingRoomService';

// POST /api/telemedicine/consultations/[id]/start - Start consultation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
    const { id: consultationId } = await params;

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
    let patientToken = '';
    let doctorToken = '';

    if (!roomId) {
      try {
        // Create meeting room using Cloudflare
        const roomCredentials = await meetingRoomService.createMeetingRoom({
          patientId: consultation.patientId,
          doctorId: consultation.doctorId || undefined,
          consultationId: consultationId,
          duration: 60
        });

        roomId = roomCredentials.roomId;
        
        // Generate tokens for patient and doctor
        patientToken = await meetingRoomService.generateUserToken(roomId, consultation.patientId, 'patient');
        if (consultation.doctorId) {
          doctorToken = await meetingRoomService.generateUserToken(roomId, consultation.doctorId, 'doctor');
        }

        // Generate join URLs
        const patientJoinUrl = meetingRoomService.generateJoinUrl(roomId, patientToken);
        const doctorJoinUrl = consultation.doctorId 
          ? meetingRoomService.generateJoinUrl(roomId, doctorToken)
          : patientJoinUrl;

        callUrl = userId === consultation.patientId ? patientJoinUrl : doctorJoinUrl;
      } catch (error) {
        console.error('Failed to create meeting room:', error);
        return NextResponse.json(
          { error: 'Failed to create meeting room' },
          { status: 500 }
        );
      }
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

