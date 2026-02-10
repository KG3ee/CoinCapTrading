'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, ExternalLink, Loader2, MessageSquare } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

type UserMessage = {
  id: string;
  title: string;
  message: string;
  targetPath: string;
  createdAt: string;
};

export default function MessagesPage() {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const loadMessages = async () => {
      if (status !== 'authenticated') return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/messages', { cache: 'no-store', credentials: 'include' });
        if (res.status === 401) {
          await signOut({ redirect: false });
          router.push('/login');
          return;
        }
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Failed to load messages');
        const nextMessages: UserMessage[] = Array.isArray(payload.messages) ? payload.messages : [];
        setMessages(nextMessages);
        setSelectedId((current) => current || nextMessages[0]?.id || '');
      } catch (err: any) {
        setError(err?.message || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 15000);
    return () => clearInterval(interval);
  }, [status, router]);

  const selectedMessage = useMemo(
    () => messages.find((item) => item.id === selectedId) || messages[0] || null,
    [messages, selectedId]
  );

  if (loading && messages.length === 0) {
    return (
      <div className="bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Messages</h1>
            <p className="text-sm text-gray-400">Promotion and system updates sent to your account.</p>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold"
          >
            Refresh
          </button>
        </div>

        {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4">
          <section className="glass-card border border-white/10 p-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/10 text-xs font-semibold flex items-center gap-2">
              <Bell size={14} className="text-accent" />
              Inbox ({messages.length})
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {messages.length === 0 ? (
                <div className="px-3 py-6 text-xs text-gray-500 text-center">No messages yet</div>
              ) : (
                messages.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition-colors ${
                      selectedMessage?.id === item.id ? 'bg-accent/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-300 line-clamp-2 mt-0.5">{item.message}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="glass-card border border-white/10 p-4 min-h-[320px]">
            {!selectedMessage ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                <MessageSquare size={16} className="mr-2" />
                Select a message to view details
              </div>
            ) : (
              <div className="h-full flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedMessage.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  </div>
                  {selectedMessage.targetPath && selectedMessage.targetPath !== '/messages' && (
                    <button
                      type="button"
                      onClick={() => router.push(selectedMessage.targetPath)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs"
                    >
                      Open
                      <ExternalLink size={12} />
                    </button>
                  )}
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-200 whitespace-pre-wrap break-words overflow-y-auto min-h-0">
                  {selectedMessage.message}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

