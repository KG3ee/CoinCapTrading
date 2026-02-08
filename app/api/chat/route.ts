import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import { auth } from '@/lib/nextAuth';
import { NextRequest, NextResponse } from 'next/server';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5MB per attachment
const MAX_ATTACHMENTS = 3;

// GET /api/chat — get messages for current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const before = searchParams.get('before'); // cursor-based pagination
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);

    const query: any = { conversationId: session.user.id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark admin messages as read
    await ChatMessage.updateMany(
      { conversationId: session.user.id, sender: 'admin', read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({
      messages: messages.reverse(), // oldest first
      hasMore: messages.length === limit,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/chat — send a message
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { text, attachments } = await request.json();

    if (!text?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // Validate attachments
    const validAttachments: any[] = [];
    if (attachments && Array.isArray(attachments)) {
      if (attachments.length > MAX_ATTACHMENTS) {
        return NextResponse.json({ error: `Max ${MAX_ATTACHMENTS} attachments per message` }, { status: 400 });
      }
      for (const att of attachments) {
        if (!att.type || !['image', 'video'].includes(att.type)) {
          return NextResponse.json({ error: 'Invalid attachment type' }, { status: 400 });
        }
        if (!att.data) continue;
        // Estimate base64 size
        const sizeEstimate = Math.ceil((att.data.length * 3) / 4);
        if (sizeEstimate > MAX_ATTACHMENT_SIZE) {
          return NextResponse.json({ error: `Attachment too large (max 5MB)` }, { status: 400 });
        }
        validAttachments.push({
          type: att.type,
          name: att.name || 'attachment',
          data: att.data,
          size: sizeEstimate,
        });
      }
    }

    const message = await ChatMessage.create({
      conversationId: session.user.id,
      sender: 'user',
      senderName: session.user.name || session.user.email || 'User',
      text: text?.trim() || '',
      attachments: validAttachments,
      read: false,
    });

    await User.findByIdAndUpdate(session.user.id, { lastActiveAt: new Date() });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
