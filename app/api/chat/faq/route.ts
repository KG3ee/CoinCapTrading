import { NextResponse } from 'next/server';
import { auth } from '@/lib/nextAuth';
import { connectDB } from '@/lib/mongodb';
import AdminSettings from '@/lib/models/AdminSettings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] }, { status: 401 });
    }

    await connectDB();
    const settings = await (AdminSettings as any).getSettings();

    const faqs = Array.isArray(settings?.chatFaqs)
      ? settings.chatFaqs.map((item: any, index: number) => ({
          id: item?.id || `faq-${index + 1}`,
          question: item?.question || '',
          answer: item?.answer || '',
        }))
      : [];

    return NextResponse.json({ items: faqs });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
