import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// LINE Webhook endpoint for handling incoming messages and events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      console.error('LINE_CHANNEL_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Verify LINE signature
    if (signature) {
      const hash = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');

      if (signature !== `SHA256=${hash}`) {
        console.error('Invalid LINE signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const webhookBody = JSON.parse(body);
    const events = webhookBody.events || [];

    for (const event of events) {
      await handleLineEvent(event);
    }

    return NextResponse.json({ status: 'ok' });

  } catch (error) {
    console.error('LINE webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleLineEvent(event: any) {
  try {
    switch (event.type) {
      case 'message':
        await handleMessageEvent(event);
        break;
      case 'follow':
        await handleFollowEvent(event);
        break;
      case 'unfollow':
        await handleUnfollowEvent(event);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('Error handling LINE event:', error);
  }
}

async function handleMessageEvent(event: any) {
  const userId = event.source.userId;
  const messageText = event.message.text;

  console.log(`Received message from ${userId}: ${messageText}`);

  // Here you can implement auto-responses or command handling
  // For example, responding to specific keywords with health information
  
  // Example: Auto-reply with app information
  if (messageText?.toLowerCase().includes('help') || messageText?.toLowerCase().includes('info')) {
    // Import the LINE messaging service here to avoid circular dependencies
    const { lineMessagingService } = await import('@/lib/services/lineMessagingService');
    
    await lineMessagingService.sendTextMessage(
      userId,
      `🌍 Green Epidemic Health Monitor\n\nI can send you alerts about:\n• Environmental conditions (PM2.5, AQI)\n• Health incidents in your area\n• Emergency notifications\n\nTo set your location and receive relevant alerts, please visit our website: ${process.env.NEXTAUTH_URL}`
    );
  }
}

async function handleFollowEvent(event: any) {
  const userId = event.source.userId;
  console.log(`User ${userId} followed the LINE bot`);

  // Send welcome message
  const { lineMessagingService } = await import('@/lib/services/lineMessagingService');
  
  await lineMessagingService.sendTextMessage(
    userId,
    `🎉 Welcome to Green Epidemic Health Monitor!\n\nThank you for following us. We'll keep you informed about environmental and health conditions in your area.\n\nTo get personalized alerts, please:\n1. Visit ${process.env.NEXTAUTH_URL}\n2. Sign in with LINE\n3. Set your home location\n\nSend "help" anytime for assistance.`
  );
}

async function handleUnfollowEvent(event: any) {
  const userId = event.source.userId;
  console.log(`User ${userId} unfollowed the LINE bot`);
  
  // You might want to update the user's notification preferences in your database
  // or mark their LINE connection as inactive
}

// GET endpoint for webhook verification (LINE may require this)
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'LINE webhook endpoint is active' });
}