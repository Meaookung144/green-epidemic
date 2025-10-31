import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import { prisma } from '@/lib/prisma';
import { notificationService } from '@/lib/services/notificationService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { role: true }
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, adminId, status } = body;
    const { id } = await params;

    const updateData: any = {};
    
    // Handle direct status updates
    if (status) {
      updateData.status = status;
      if (status === 'APPROVED') {
        updateData.approvedBy = adminId || (session.user as any).id;
        updateData.approvedAt = new Date();
      } else if (status === 'REJECTED') {
        updateData.rejectedBy = adminId || (session.user as any).id;
        updateData.rejectedAt = new Date();
      }
    }
    // Handle legacy action-based updates
    else if (action === 'approve') {
      updateData.status = 'APPROVED';
      updateData.approvedBy = adminId;
      updateData.approvedAt = new Date();
    } else if (action === 'reject') {
      updateData.status = 'REJECTED';
      updateData.rejectedBy = adminId;
      updateData.rejectedAt = new Date();
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    // If approved, trigger notifications for nearby users
    if (status === 'APPROVED' || action === 'approve') {
      try {
        await notificationService.notifyNearbyUsersOfReport(report.id);
        console.log(`Notifications sent for approved report ${report.id}`);
      } catch (error) {
        console.error('Failed to send notifications for approved report:', error);
        // Don't fail the approval if notifications fail
      }
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}

