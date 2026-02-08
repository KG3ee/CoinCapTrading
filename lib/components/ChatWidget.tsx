'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Paperclip, Image as ImageIcon, Film, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Attachment {
  type: 'image' | 'video';
  name: string;
  data: string;
  size: number;
}

interface ChatMsg {
  _id: string;
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  attachments: Attachment[];
  createdAt: string;
}

export default function ChatWidget() {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isAuthenticated = status === 'authenticated';

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }, 50);
  }, []);

  // Check for scroll position
  const handleScroll = () => {
    if (!chatBodyRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
  };

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch {}
  }, [isAuthenticated]);

  // Fetch unread count
  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch('/api/chat/unread');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }, [isAuthenticated]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnread();
    }
  }, [isAuthenticated, fetchUnread]);

  // When opening chat
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      setIsLoading(true);
      fetchMessages().then(() => {
        setIsLoading(false);
        setUnreadCount(0);
        scrollToBottom(false);
      });
    }
  }, [isOpen, isAuthenticated, fetchMessages, scrollToBottom]);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const interval = setInterval(() => {
      fetchMessages().then(() => {
        // Auto-scroll if near bottom
        if (chatBodyRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
          if (scrollHeight - scrollTop - clientHeight < 100) {
            scrollToBottom();
          }
        }
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated, fetchMessages, scrollToBottom]);

  // Poll unread when closed
  useEffect(() => {
    if (isOpen || !isAuthenticated) return;
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated, fetchUnread]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Max 5MB.');
        return;
      }

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        alert('Only images and videos are supported.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setPendingAttachments((prev) => {
          if (prev.length >= 3) {
            alert('Max 3 attachments per message.');
            return prev;
          }
          return [
            ...prev,
            {
              type: isImage ? 'image' : 'video',
              name: file.name,
              data,
              size: file.size,
            },
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  // Remove pending attachment
  const removePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send message
  const handleSend = async () => {
    if ((!input.trim() && pendingAttachments.length === 0) || sending) return;

    const text = input.trim();
    const attachments = [...pendingAttachments];

    setInput('');
    setPendingAttachments([]);
    setSending(true);

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMsg = {
      _id: tempId,
      sender: 'user',
      senderName: 'You',
      text,
      attachments,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, attachments }),
      });

      if (!res.ok) {
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
        const err = await res.json();
        alert(err.error || 'Failed to send');
      } else {
        // Replace optimistic with real
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? data.message : m))
        );
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 rounded-full bg-accent text-black shadow-lg shadow-accent/30 flex items-center justify-center hover:scale-110 transition-transform"
          aria-label="Open chat"
        >
          <MessageCircle size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-xs font-bold flex items-center justify-center px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-6 md:right-6 z-[70] w-full md:w-[380px] h-[100dvh] md:h-[520px] md:rounded-xl overflow-hidden flex flex-col bg-[var(--app-bg)] md:border md:border-white/10 md:shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent/20 to-purple-600/20 border-b border-white/10" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <MessageCircle size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold">Customer Support</p>
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                  Online
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={chatBodyRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                    CS
                  </div>
                  <div className="max-w-[80%] rounded-xl px-3 py-2 bg-white/10 text-[13px] text-white">
                    Hello! How can we assist you today? Please describe your issue clearly.
                  </div>
                </div>
                <div className="text-center text-gray-500 text-xs">
                  Send a message to start a conversation with our support team.
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 space-y-1.5 ${
                      msg.sender === 'user'
                        ? 'bg-accent/20 text-white rounded-br-sm'
                        : 'bg-white/10 text-white rounded-bl-sm'
                    }`}
                  >
                    {msg.sender === 'admin' && (
                      <p className="text-[11px] text-accent font-medium">{msg.senderName}</p>
                    )}

                    {/* Attachments */}
                    {msg.attachments?.length > 0 && (
                      <div className="space-y-1.5">
                        {msg.attachments.map((att, i) => (
                          <div key={i}>
                            {att.type === 'image' ? (
                              <img
                                src={att.data}
                                alt={att.name}
                                className="max-w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setPreviewAttachment(att)}
                                style={{ maxHeight: '200px' }}
                              />
                            ) : (
                              <video
                                src={att.data}
                                controls
                                className="max-w-full rounded-lg"
                                style={{ maxHeight: '200px' }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.text && (
                      <p className="text-xs whitespace-pre-wrap break-words">{msg.text}</p>
                    )}
                    <p className="text-[11px] text-gray-500">{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button
              onClick={() => scrollToBottom()}
              className="absolute bottom-24 md:bottom-[120px] left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs text-gray-300 flex items-center gap-1 hover:bg-white/20 transition-colors z-10"
            >
              <ChevronDown size={12} /> New messages
            </button>
          )}

          {/* Pending Attachments Preview */}
          {pendingAttachments.length > 0 && (
            <div className="px-3 py-2 border-t border-white/10 flex gap-2 overflow-x-auto">
              {pendingAttachments.map((att, i) => (
                <div key={i} className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-white/5">
                  {att.type === 'image' ? (
                    <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film size={20} className="text-gray-400" />
                    </div>
                  )}
                  <button
                    onClick={() => removePendingAttachment(i)}
                    className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-danger text-white flex items-center justify-center"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-white/10 p-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <div className="flex items-end gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                title="Attach image or video"
              >
                <Paperclip size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-accent/50 max-h-20"
                style={{ minHeight: '36px' }}
              />
              <button
                onClick={handleSend}
                disabled={sending || (!input.trim() && pendingAttachments.length === 0)}
                className="p-2 rounded-lg bg-accent text-black hover:bg-accent/80 disabled:opacity-30 transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Image Preview */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-[999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <button
            onClick={() => setPreviewAttachment(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <X size={20} className="text-white" />
          </button>
          {previewAttachment.type === 'image' ? (
            <img
              src={previewAttachment.data}
              alt={previewAttachment.name}
              className="max-w-full max-h-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={previewAttachment.data}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}
