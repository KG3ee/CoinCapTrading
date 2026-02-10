import { NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';

export const dynamic = 'force-dynamic';

type InboxMessage = {
  id: string;
  title: string;
  message: string;
  targetPath: string;
  createdAt: string;
};

function parseDate(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    await connectDB();
    const settings = await (AdminSettings as any).getSettings();

    const history = Array.isArray(settings?.promotion?.history)
      ? settings.promotion.history
      : [];

    const visibleHistory = history.filter((item: any) => {
      const targetAll = typeof item?.targetAll === 'boolean' ? item.targetAll : true;
      const targetUserIds = Array.isArray(item?.targetUserIds)
        ? item.targetUserIds.map((id: unknown) => String(id))
        : [];
      return targetAll || targetUserIds.includes(userId);
    });

    const mappedMessages: InboxMessage[] = visibleHistory.map((item: any): InboxMessage => ({
      id: String(item?.id || ''),
      title: typeof item?.title === 'string' && item.title.trim() ? item.title.trim() : 'Promotion',
      message: typeof item?.message === 'string' ? item.message : '',
      targetPath: typeof item?.targetPath === 'string' && item.targetPath.startsWith('/')
        ? item.targetPath
        : '/messages',
      createdAt: parseDate(item?.createdAt || new Date()).toISOString(),
    }));

    const messages: InboxMessage[] = mappedMessages
      .filter((item: InboxMessage) => item.message.trim().length > 0)
      .sort((a: InboxMessage, b: InboxMessage) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime())
      .slice(0, 200);

    return NextResponse.json({ messages });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to load messages' }, { status: 500 });
  }
}
