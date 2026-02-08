import { connectDB } from '@/lib/mongodb';
import ChatMessage from '@/lib/models/ChatMessage';
import User from '@/lib/models/User';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext, hasPermission } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// GET /api/admin/chat — list conversations with latest message
export async function GET(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_support')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // If userId is provided, return messages for that user
    if (userId) {
      const messages = await ChatMessage.find({ conversationId: userId })
        .sort({ createdAt: 1 })
        .limit(200)
        .lean();

      // Mark user messages as read
      await ChatMessage.updateMany(
        { conversationId: userId, sender: 'user', read: false },
        { $set: { read: true } }
      );

      return NextResponse.json({ messages });
    }

    // Otherwise, return list of conversations
    const conversations = await ChatMessage.aggregate([
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$text' },
          lastSender: { $first: '$sender' },
          lastTime: { $first: '$createdAt' },
          senderName: { $first: '$senderName' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$sender', 'user'] }, { $eq: ['$read', false] }] },
                1,
                0,
              ],
            },
          },
          totalMessages: { $sum: 1 },
        },
      },
      { $sort: { lastTime: -1 } },
    ]);

    // Enrich with user info
    const userIds = conversations.map((c: any) => c._id);
    const users = await User.find({ _id: { $in: userIds } }, 'fullName email').lean();
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

    const enriched = conversations.map((c: any) => {
      const user = userMap.get(c._id);
      return {
        userId: c._id,
        userName: (user as any)?.fullName || c.senderName || 'Unknown',
        userEmail: (user as any)?.email || '',
        lastMessage: c.lastMessage || '[attachment]',
        lastSender: c.lastSender,
        lastTime: c.lastTime,
        unreadCount: c.unreadCount,
        totalMessages: c.totalMessages,
      };
    });

    return NextResponse.json({ conversations: enriched });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/chat — admin sends a reply
export async function POST(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_support')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const { userId, text, attachments } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }
    if (!text?.trim() && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const validAttachments: any[] = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (!att.type || !['image', 'video'].includes(att.type)) continue;
        if (!att.data) continue;
        validAttachments.push({
          type: att.type,
          name: att.name || 'attachment',
          data: att.data,
          size: Math.ceil((att.data.length * 3) / 4),
        });
      }
    }

    const message = await ChatMessage.create({
      conversationId: userId,
      sender: 'admin',
      senderName: 'Support',
      text: text?.trim() || '',
      attachments: validAttachments,
      read: false,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/chat — delete a message or entire conversation
export async function DELETE(request: NextRequest) {
  const context = await getAdminContext(request);
  if ('error' in context) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }
  if (!hasPermission(context.permissions, 'manage_support')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');
    const userId = searchParams.get('userId');

    if (messageId) {
      // Delete a single message
      const result = await ChatMessage.findByIdAndDelete(messageId);
      if (!result) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deleted: 'message' });
    }

    if (userId) {
      // Delete entire conversation
      const result = await ChatMessage.deleteMany({ conversationId: userId });
      return NextResponse.json({ success: true, deleted: 'conversation', count: result.deletedCount });
    }

    return NextResponse.json({ error: 'messageId or userId required' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
