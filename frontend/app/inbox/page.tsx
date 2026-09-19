'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, ArrowRight, Bot, ArrowLeft, Send, CheckCircle2, XCircle, Edit3, RefreshCw, Power, Loader2, Sparkles, ImageIcon, FileText, Mic, Video, Sticker, Smile, ArrowDown, ChevronDown } from 'lucide-react';
import { Conversation, AIStatus, Message, AIReply } from '@/lib/types';
import { getConversations, getConversationDetails, approveAndStartAI, rejectReply, turnOffAI, regenerateReply, sendManualMessage } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

// Renders message content based on message_type
function MessageContent({ message, message_type }: { message: string; message_type: string }) {
  const type = (message_type || 'text').toLowerCase();
  if (type === 'image') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border border-black/10">
          <ImageIcon className="h-5 w-5 text-[#25D366]" />
          <span className="text-sm font-semibold text-[#667781]">Photo</span>
        </div>
        <span className="text-xs text-[#667781] italic">{message}</span>
      </div>
    );
  }
  if (type === 'video') {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border border-black/10">
          <Video className="h-5 w-5 text-[#25D366]" />
          <span className="text-sm font-semibold text-[#667781]">Video</span>
        </div>
        <span className="text-xs text-[#667781] italic">{message}</span>
      </div>
    );
  }
  if (type === 'audio' || type === 'voice') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border border-black/10">
        <Mic className="h-5 w-5 text-[#25D366]" />
        <span className="text-sm font-semibold text-[#667781]">Voice / Audio message</span>
      </div>
    );
  }
  if (type === 'document') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border border-black/10">
        <FileText className="h-5 w-5 text-[#25D366]" />
        <span className="text-sm font-semibold text-[#667781]">Document</span>
      </div>
    );
  }
  if (type === 'sticker') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/5 border border-black/10">
        <Sticker className="h-5 w-5 text-[#25D366]" />
        <span className="text-sm font-semibold text-[#667781]">Sticker</span>
      </div>
    );
  }
  return <span>{message}</span>;
}


const EMOJI_CATEGORIES = [
  {
    name: 'Popular',
    emojis: ['😂', '🥰', '😍', '❤️', '😘', '😊', '😭', '🥺', '🙈', '🔥', '👍', '🙏', '💯', '✨', '👀', '🤣']
  },
  {
    name: 'Love & Warmth',
    emojis: ['❤️', '💖', '💗', '💓', '💕', '💞', '😘', '🥰', '😍', '😻', '👩‍❤️‍👨', '💋', '🤗', '💌']
  },
  {
    name: 'Reactions & Gestures',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '🤙', '🖐️', '👊', '👌', '🙏', '💪', '🔥']
  },
  {
    name: 'Expressions',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥹', '😊', '😇', '🙂', '🙃', '😉', '😌', '😎', '🥳', '😜', '🤪']
  }
];

const tabs: { key: 'ALL' | AIStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active AI' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'OFF', label: 'AI Off' },
];

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<'ALL' | AIStatus>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Selected conversation detail state for right panel
  const [activeContact, setActiveContact] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingReply, setPendingReply] = useState<AIReply | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Chat actions
  const [inputMsg, setInputMsg] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Casual');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await getConversations(filter);
      setConversations(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].contact.id);
      }
      return data;
    } catch (e) {
      console.error(e);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filter, selectedId]);

  // Background polling for fresh messages without UI flicker or scroll jumps
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(async () => {
      try {
        const freshConvs = await getConversations(filter);
        setConversations(freshConvs);

        if (selectedId) {
          const detail = await getConversationDetails(selectedId);
          setMessages((prevMsgs) => {
            const isDifferent =
              prevMsgs.length !== detail.messages.length ||
              (prevMsgs.length > 0 &&
                detail.messages.length > 0 &&
                prevMsgs[prevMsgs.length - 1].id !== detail.messages[detail.messages.length - 1].id);
            return isDifferent ? detail.messages : prevMsgs;
          });

          setPendingReply((prevPending) => {
            const isDiff = JSON.stringify(prevPending) !== JSON.stringify(detail.pending_reply);
            return isDiff ? detail.pending_reply : prevPending;
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [filter, selectedId, fetchConversations]);

  const loadConversationDetail = async (id: number, convList?: Conversation[]) => {
    setDetailLoading(true);
    try {
      const data = await getConversationDetails(id);
      setMessages(data.messages);
      setPendingReply(data.pending_reply);
      if (data.pending_reply) {
        setEditedText(data.pending_reply.edited_reply || data.pending_reply.generated_reply || '');
      }
      const list = convList ?? conversations;
      const match = list.find((c) => c.contact.id === id);
      if (match) setActiveContact(match);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadConversationDetail(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const freshConvs = await fetchConversations() as Conversation[];
      if (selectedId) {
        await loadConversationDetail(selectedId, freshConvs);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const act = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await fn();
      const freshConvs = await fetchConversations() as Conversation[];
      if (selectedId) await loadConversationDetail(selectedId, freshConvs);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !inputMsg.trim()) return;
    setSendLoading(true);
    setShowEmoji(false);
    try {
      await sendManualMessage(selectedId, inputMsg);
      setInputMsg('');
      const freshConvs = (await fetchConversations()) as Conversation[];
      await loadConversationDetail(selectedId, freshConvs);
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Send failed');
    } finally {
      setSendLoading(false);
    }
  };

  const filteredList = conversations.filter(
    (c) =>
      (c.contact.name.toLowerCase().includes(search.toLowerCase()) || c.contact.phone.includes(search)) &&
      (filter === 'ALL' || c.contact.ai_status === filter)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">Conversation Inbox</h1>
          <p className="text-xs font-medium text-[#667781] mt-0.5">
            Two-panel WhatsApp AI conversation workspace.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-3d-secondary px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 self-start sm:self-auto shadow-sm hover:scale-[1.02] transition-transform"
        >
          <RefreshCw className={`h-4 w-4 text-[#05392E] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Inbox'}</span>
        </button>
      </div>

      {/* Two Panel 3D Container */}
      <div className="card-3d rounded-3xl border border-[#05392E]/15 overflow-hidden flex flex-col lg:flex-row h-[calc(100vh-10rem)] shadow-2xl">
        {/* LEFT PANEL: Conversation List */}
        <div className={`w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-[#E5EAEA] flex-col bg-white shrink-0 ${mobileShowDetail ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Filter Top Bar */}
          <div className="p-4 border-b border-[#E5EAEA] space-y-3 bg-[#F7FAF9]">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#667781]" />
                <input
                  type="text"
                  placeholder="Search contact or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-[#E5EAEA] bg-white pl-10 pr-4 py-2 text-xs font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
                />
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-2xl bg-white border border-[#E5EAEA] text-[#05392E] hover:bg-[#E8F5E9] shadow-sm transition shrink-0"
                title="Refresh Conversations & Messages"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {tabs.map((tab) => {
                const isActive = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 ${
                      isActive ? 'nav-pill-active' : 'btn-3d-secondary'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* List Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E5EAEA]">
            {filteredList.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-[#667781]">
                No conversations found.
              </div>
            ) : (
              filteredList.map((conv) => {
                const isSelected = selectedId === conv.contact.id;
                const isActive = conv.contact.ai_status === 'ACTIVE';
                const isPending = conv.contact.ai_status === 'PENDING';

                const ringColor = isActive
                  ? 'ring-2 ring-[#25D366]'
                  : isPending
                  ? 'ring-2 ring-[#FFB300]'
                  : 'ring-1 ring-[#90A4AE]';

                return (
                  <div
                    key={conv.contact.id}
                    onClick={() => {
                      setSelectedId(conv.contact.id);
                      setMobileShowDetail(true);
                    }}
                    className={`p-4 cursor-pointer transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-[#E8F5E9] border-l-4 border-l-[#05392E] shadow-inner'
                        : 'hover:bg-[#F7FAF9]'
                    }`}
                  >
                    {/* 3D Avatar */}
                    <div
                      className={`h-11 w-11 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-base shadow-sm shrink-0 ${ringColor}`}
                    >
                      {conv.contact.name.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="font-extrabold text-sm text-[#111B21] truncate">{conv.contact.name}</h4>
                        <span className="text-[10px] font-bold text-[#667781]">
                          {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[#667781] truncate flex-1">
                          {conv.last_message?.message || 'No message yet'}
                        </p>
                        <StatusBadge status={conv.contact.ai_status} size="sm" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Selected Conversation Chat Feed & Action Panel */}
        <div className={`flex-1 flex-col bg-white ${mobileShowDetail ? 'flex' : 'hidden lg:flex'}`}>
          {activeContact ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-4 sm:px-6 py-3 border-b border-[#E5EAEA] bg-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setMobileShowDetail(false)}
                    className="lg:hidden p-2 rounded-xl bg-[#E8F5E9] text-[#05392E] font-bold text-xs flex items-center gap-1 shrink-0"
                    title="Back to inbox list"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-sm sm:text-base shadow-sm shrink-0">
                    {activeContact.contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-xs sm:text-sm text-[#111B21] truncate">{activeContact.contact.name}</h3>
                    <span className="text-[11px] sm:text-xs font-medium text-[#667781] block truncate">
                      <span className="font-digits">{activeContact.contact.phone}</span> • {activeContact.contact.relationship}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 rounded-xl bg-[#F7FAF9] border border-[#E5EAEA] text-[#05392E] hover:bg-[#E8F5E9] transition shadow-sm"
                    title="Refresh Chat Messages"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>

                  <StatusBadge status={activeContact.contact.ai_status} />
                  {activeContact.contact.ai_status === 'ACTIVE' && (
                    <button
                      onClick={() => act(() => turnOffAI(activeContact.contact.id))}
                      disabled={actionLoading}
                      className="btn-3d-danger px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>Turn Off AI</span>
                    </button>
                  )}
                  <Link
                    href={`/conversations/${activeContact.contact.id}`}
                    className="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Full Screen</span>
                    <ArrowRight className="h-3.5 w-3.5 text-[#05392E]" />
                  </Link>
                </div>
              </div>

              {/* Pending Approval Banner */}
              {activeContact.contact.ai_status === 'PENDING' && pendingReply && (
                <div className="p-3.5 bg-[#FFF8E1] border-b border-[#FFB300]/40 shadow-sm shrink-0">
                  <div className="rounded-2xl bg-white border border-[#05392E]/20 p-3.5 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#E65100] flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#FFC107]" />
                        ✨ AI Reply Ready for Approval
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTone}
                          onChange={(e) => {
                            setSelectedTone(e.target.value);
                            act(() => regenerateReply(activeContact.contact.id, e.target.value).then((r) => setEditedText(r.new_draft)));
                          }}
                          disabled={actionLoading}
                          className="bg-white border border-[#05392E]/25 rounded-xl px-2.5 py-1 text-xs font-bold text-[#05392E] focus:outline-none shadow-sm cursor-pointer"
                        >
                          {['Casual', 'Short', 'Funny', 'Friendly', 'Professional', 'Serious'].map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => act(() => regenerateReply(activeContact.contact.id, selectedTone).then((r) => setEditedText(r.new_draft)))}
                          disabled={actionLoading}
                          className="p-1 rounded-xl bg-white border border-[#05392E]/25 text-[#05392E] hover:bg-[#E8F5E9] shadow-sm transition"
                          title="Regenerate Draft"
                        >
                          <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl bg-[#D9FDD3] border border-[#25D366] p-2.5 text-sm font-semibold text-[#111B21] focus:outline-none shadow-inner"
                      />
                    ) : (
                      <div className="rounded-2xl bg-[#D9FDD3] p-3 text-sm font-bold text-[#111B21] border border-[#25D366]/30 shadow-sm mb-2">
                        "{editedText || pendingReply.generated_reply}"
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        disabled={actionLoading}
                        className="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#05392E]" />
                        <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
                      </button>
                      <button
                        onClick={() => act(() => rejectReply(activeContact.contact.id))}
                        disabled={actionLoading}
                        className="btn-3d-danger-soft px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5 text-[#D32F2F]" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => act(() => approveAndStartAI(activeContact.contact.id, isEditing ? editedText : undefined))}
                        disabled={actionLoading}
                        className="btn-3d-bright px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#111B21]" /> : <><CheckCircle2 className="h-4 w-4 text-[#111B21]" /><span>Approve & Start AI</span></>}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#EFEAE2]">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="inline-block rounded-2xl bg-white border border-[#E5EAEA] px-4 py-2 text-xs font-semibold text-[#667781] shadow-sm">
                      No messages yet in this conversation.
                    </span>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isContact = msg.sender === 'CONTACT';
                    const isAI = msg.sender === 'AI';

                    return (
                      <div key={msg.id} className={`flex flex-col ${isContact ? 'items-start' : 'items-end'}`}>
                        {isAI && (
                          <div className="flex items-center gap-1 mb-1 px-1">
                            <Sparkles className="h-3.5 w-3.5 text-[#05392E]" />
                            <span className="text-[10px] font-bold text-[#05392E] tracking-wider uppercase">
                              ✨ AI Generated
                            </span>
                          </div>
                        )}

                        <div
                          className="max-w-[75%] rounded-2xl px-4 py-3 text-sm font-semibold relative shadow-sm"
                          style={
                            isContact
                              ? {
                                  backgroundColor: '#FFFFFF',
                                  color: '#111B21',
                                  borderRadius: '18px 18px 18px 4px',
                                  border: '1px solid rgba(0,0,0,0.06)',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                }
                              : isAI
                              ? {
                                  backgroundColor: '#D9FDD3',
                                  color: '#111B21',
                                  borderRadius: '18px 4px 18px 18px',
                                  border: '1px solid rgba(37,211,102,0.3)',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                }
                              : {
                                  backgroundColor: '#D9FDD3',
                                  color: '#111B21',
                                  borderRadius: '18px 4px 18px 18px',
                                  border: '2px solid #25D366',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                }
                          }
                        >
                          {!isContact && !isAI && (
                            <span className="text-[10px] font-black block mb-0.5 text-[#075E54]">You (Manual)</span>
                          )}
                          <MessageContent message={msg.message} message_type={msg.message_type} />
                        </div>

                        <span className="text-[10px] font-medium text-[#667781] mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Floating Down / Latest Message Button */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={scrollToBottom}
                    className="sticky bottom-4 right-4 ml-auto p-2.5 rounded-full bg-white/95 border border-[#05392E]/20 text-[#05392E] shadow-2xl hover:bg-[#E8F5E9] hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 z-30 backdrop-blur"
                    title="Jump to Latest Message"
                  >
                    <ArrowDown className="h-4 w-4 text-[#25D366]" />
                    <span className="text-[11px] font-extrabold pr-1 hidden sm:inline text-[#05392E]">Latest</span>
                  </button>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Message Composer with WhatsApp Emoji Picker */}
              <div className="relative border-t border-[#E5EAEA] bg-white shrink-0">
                {/* Emoji Picker Popover */}
                {showEmoji && (
                  <div 
                    ref={emojiRef}
                    className="absolute bottom-full left-4 mb-2 w-72 sm:w-80 bg-white border border-[#05392E]/15 rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  >
                    <div className="flex items-center justify-between border-b border-[#E5EAEA] pb-2 mb-2 px-1">
                      <span className="text-xs font-extrabold text-[#05392E] flex items-center gap-1.5">
                        <Smile className="h-4 w-4 text-[#25D366]" />
                        WhatsApp Emojis
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowEmoji(false)} 
                        className="text-xs font-bold text-[#667781] hover:text-[#111B21] px-1.5 py-0.5 rounded-lg hover:bg-black/5"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.name}>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667781] block mb-1 px-1">
                            {cat.name}
                          </span>
                          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setInputMsg((prev) => prev + emoji);
                                  inputRef.current?.focus();
                                }}
                                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-[#E8F5E9] rounded-xl transition hover:scale-125"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleManualSend} className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmoji(!showEmoji)}
                    className={`p-2.5 rounded-full transition ${showEmoji ? 'bg-[#E8F5E9] text-[#25D366]' : 'text-[#667781] hover:bg-black/5 hover:text-[#05392E]'}`}
                    title="Insert WhatsApp Emoji"
                  >
                    <Smile className="h-6 w-6" />
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={`Type a manual message to ${activeContact.contact.name}...`}
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    className="flex-1 rounded-full border border-[#E5EAEA] bg-[#F7FAF9] px-5 py-3 text-sm font-semibold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
                  />

                  <button
                    type="submit"
                    disabled={sendLoading || !inputMsg.trim()}
                    className="btn-3d-bright flex h-11 w-11 items-center justify-center rounded-full shrink-0 disabled:opacity-50"
                  >
                    {sendLoading ? <Loader2 className="h-5 w-5 animate-spin text-[#111B21]" /> : <Send className="h-5 w-5 text-[#111B21]" />}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-12 text-center text-[#667781]">
              <div>
                <MessageSquare className="mx-auto h-12 w-12 text-[#94A3B8] mb-3" />
                <p className="text-sm font-extrabold text-[#111B21]">Select a conversation</p>
                <p className="text-xs font-medium mt-1">Choose a conversation from the left inbox panel to inspect messages and approve AI suggestions.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
