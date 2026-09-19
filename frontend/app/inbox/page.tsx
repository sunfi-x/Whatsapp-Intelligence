'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Search, ArrowRight, Bot, ArrowLeft, Send, CheckCircle2, XCircle, Edit3, RefreshCw, Power, Loader2, Sparkles, ImageIcon, FileText, Mic, Video, Sticker, Smile, ArrowDown } from 'lucide-react';
import { Conversation, AIStatus, Message, AIReply } from '@/lib/types';
import { getConversations, getConversationDetails, approveAndStartAI, rejectReply, turnOffAI, regenerateReply, sendManualMessage } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { useNavbarVisibility } from '@/components/NavbarVisibilityContext';

// Renders message content based on message_type
function MessageContent({ message, message_type }: { message: string; message_type: string }) {
  const type = (message_type || 'text').toLowerCase();
  const isImage = type === 'image' || message.toLowerCase().includes('[image') || message.includes('📷') || message.toLowerCase().includes('photo');

  if (isImage) {
    const rawCap = message
      .replace(/\[IMAGE message received:?/gi, '')
      .replace(/📷 \[Photo received:?/gi, '')
      .replace(/📷/g, '')
      .replace(/\]/g, '')
      .trim();

    const hasCaption = rawCap && rawCap !== 'Photo received' && rawCap !== 'IMAGE message received';

    return (
      <div className="flex flex-col gap-2 py-1">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 shadow-sm">
          <div className="p-2 rounded-xl bg-[#05392E] text-white shadow-sm">
            <ImageIcon className="h-5 w-5 text-[#25D366]" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-[#05392E]">WhatsApp Photo</span>
            <span className="text-[10px] font-bold text-[#667781]">Media Image Received</span>
          </div>
        </div>
        {hasCaption && (
          <span className="text-xs font-semibold text-[#111B21] px-1">{rawCap}</span>
        )}
      </div>
    );
  }
  if (type === 'video') {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#05392E]/08 border border-[#05392E]/15 shadow-sm">
        <Video className="h-5 w-5 text-[#25D366]" />
        <span className="text-xs font-extrabold text-[#05392E]">WhatsApp Video</span>
      </div>
    );
  }
  if (type === 'audio' || type === 'voice') {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#05392E]/08 border border-[#05392E]/15 shadow-sm">
        <Mic className="h-5 w-5 text-[#25D366]" />
        <span className="text-xs font-extrabold text-[#05392E]">Voice Note / Audio</span>
      </div>
    );
  }
  if (type === 'document') {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#05392E]/08 border border-[#05392E]/15 shadow-sm">
        <FileText className="h-5 w-5 text-[#25D366]" />
        <span className="text-xs font-extrabold text-[#05392E]">Document File</span>
      </div>
    );
  }
  if (type === 'sticker') {
    return (
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-[#05392E]/08 border border-[#05392E]/15 shadow-sm">
        <Sticker className="h-5 w-5 text-[#25D366]" />
        <span className="text-xs font-extrabold text-[#05392E]">Sticker</span>
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

  const [mobileShowDetail, setMobileShowDetailState] = useState(false);
  const { setHiddenOnMobile } = useNavbarVisibility();

  // When switching between list ↔ detail on mobile, toggle the global Navbar
  const setMobileShowDetail = (value: boolean) => {
    setMobileShowDetailState(value);
    setHiddenOnMobile(value); // hide global Navbar when detail is open
  };

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

  const loadConversationDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await getConversationDetails(id);
      setMessages(data.messages || []);
      setPendingReply(data.pending_reply || null);
      if (data.pending_reply) {
        setEditedText(data.pending_reply.edited_reply || data.pending_reply.generated_reply || '');
      }
      if (data.contact) {
        const lastMsg = data.messages && data.messages.length > 0 ? data.messages[data.messages.length - 1] : null;
        setActiveContact({
          contact: data.contact,
          last_message: lastMsg,
          pending_reply: data.pending_reply || null,
          total_messages: data.messages ? data.messages.length : 0,
          updated_at: data.contact.updated_at || new Date().toISOString()
        });
      }
    } catch (e) {
      console.error('Error loading conversation detail:', e);
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

  // Restore navbar when leaving inbox page
  useEffect(() => {
    return () => {
      setHiddenOnMobile(false);
    };
  }, [setHiddenOnMobile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchConversations();
      if (selectedId) {
        await loadConversationDetail(selectedId);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const act = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await fn();
      await fetchConversations();
      if (selectedId) await loadConversationDetail(selectedId);
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
      await fetchConversations();
      await loadConversationDetail(selectedId);
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
      <div className="card-3d rounded-3xl border border-[#05392E]/15 overflow-hidden flex flex-col lg:flex-row h-[calc(100vh-12rem)] min-h-[500px] shadow-2xl">
        {/* LEFT PANEL: Conversation List */}
        <div className={`w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-[#E5EAEA] flex-col bg-white shrink-0 min-h-0 h-full ${mobileShowDetail ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search & Filter Top Bar */}
          <div className="p-4 border-b border-[#E5EAEA] space-y-3 bg-[#F7FAF9] shrink-0">
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
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-[#E5EAEA] overscroll-contain">
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
        <div className={`flex-1 flex-col bg-white min-h-0 h-full ${mobileShowDetail ? 'flex' : 'hidden lg:flex'}`}>
          {activeContact ? (
            <>
              {/* Conversation Top Header — green WhatsApp-style bar on mobile */}
              <div className={`flex items-center justify-between gap-2 shrink-0 overflow-hidden px-3 py-2.5 sm:px-6 sm:py-3 border-b border-[#E5EAEA] ${mobileShowDetail ? 'sticky top-0 z-30 bg-[#05392E] lg:bg-white' : 'bg-white'}`}>
                {/* Left: back + avatar + name */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => setMobileShowDetail(false)}
                    className={`lg:hidden p-1.5 rounded-xl font-bold flex items-center shrink-0 transition ${mobileShowDetail ? 'text-white hover:bg-white/15' : 'bg-[#E8F5E9] text-[#05392E]'}`}
                    title="Back to inbox list"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center font-extrabold text-sm shadow-sm shrink-0 ${mobileShowDetail ? 'bg-white/20 border-white/50 text-white lg:bg-[#05392E] lg:border-[#03241D]' : 'bg-[#05392E] border-[#03241D] text-white'}`}>
                    {activeContact.contact.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-extrabold text-sm truncate ${mobileShowDetail ? 'text-white lg:text-[#111B21]' : 'text-[#111B21]'}`}>
                      {activeContact.contact.name}
                    </h3>
                    <span className={`text-[10px] font-medium block truncate ${mobileShowDetail ? 'text-white/70 lg:text-[#667781]' : 'text-[#667781]'}`}>
                      {activeContact.contact.relationship} • {activeContact.contact.ai_status === 'ACTIVE' ? '● AI Active' : activeContact.contact.ai_status === 'PENDING' ? '◌ Pending' : '○ AI Off'}
                    </span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={`p-1.5 rounded-xl transition shrink-0 ${mobileShowDetail ? 'text-white hover:bg-white/15 lg:bg-[#F7FAF9] lg:border lg:border-[#E5EAEA] lg:text-[#05392E]' : 'bg-[#F7FAF9] border border-[#E5EAEA] text-[#05392E] hover:bg-[#E8F5E9]'}`}
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>

                  <span className="hidden lg:block"><StatusBadge status={activeContact.contact.ai_status} /></span>

                  {activeContact.contact.ai_status === 'ACTIVE' && (
                    <button
                      onClick={() => act(() => turnOffAI(activeContact.contact.id))}
                      disabled={actionLoading}
                      className={`p-1.5 rounded-xl font-extrabold flex items-center shrink-0 transition ${mobileShowDetail ? 'bg-red-500/80 text-white border border-red-400/50 hover:bg-red-500 lg:btn-3d-danger' : 'btn-3d-danger px-2 py-1'}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1">Turn Off AI</span>
                    </button>
                  )}

                  <Link
                    href={`/conversations/${activeContact.contact.id}`}
                    className={`p-1.5 rounded-xl font-bold flex items-center shrink-0 transition ${mobileShowDetail ? 'text-white hover:bg-white/15 lg:btn-3d-secondary' : 'btn-3d-secondary'}`}
                    title="Full Screen"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">Full Screen</span>
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
              <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 bg-[#EFEAE2] overscroll-contain touch-pan-y">
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
