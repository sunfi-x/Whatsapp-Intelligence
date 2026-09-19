'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle2, XCircle, Edit3, RefreshCw, Power, Loader2, Bot, Sparkles, ImageIcon, FileText, Mic, Video, Sticker, ArrowDown, ZoomIn } from 'lucide-react';
import { Contact, Message, AIReply } from '@/lib/types';
import { getConversationDetails, approveAndStartAI, rejectReply, turnOffAI, regenerateReply, sendManualMessage, getMediaUrl } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';

// Renders message content — supports actual image display via backend media proxy
function MessageContent({ message, message_type, contact_id, message_id }: {
  message: string;
  message_type: string;
  contact_id?: number;
  message_id?: number;
}) {
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [lightbox, setLightbox] = useState(false);
  const type = (message_type || 'text').toLowerCase();

  const hasMediaId = message.includes('MEDIA_ID:');
  const captionAfterMediaId = hasMediaId
    ? message.replace(/^.*?MEDIA_ID:\S+\s*/, '').trim()
    : '';

  const isImage = type === 'image' || message.includes('📷') || message.toLowerCase().includes('[image');

  if (isImage && hasMediaId && contact_id && message_id) {
    const imgSrc = getMediaUrl(contact_id, message_id);
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className="relative rounded-2xl overflow-hidden bg-black/5 border border-black/10 max-w-[280px] cursor-pointer group"
          onClick={() => setLightbox(true)}
        >
          {imgState === 'loading' && (
            <div className="flex items-center justify-center h-40 w-full">
              <Loader2 className="h-6 w-6 text-[#05392E] animate-spin" />
            </div>
          )}
          {imgState === 'error' && (
            <div className="flex flex-col items-center justify-center h-36 w-full gap-2">
              <ImageIcon className="h-8 w-8 text-[#667781]" />
              <span className="text-[11px] text-[#667781] font-semibold">Image unavailable</span>
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={captionAfterMediaId || 'WhatsApp Photo'}
            className={`w-full object-cover transition-opacity duration-300 ${imgState === 'loaded' ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            style={{ maxHeight: '280px' }}
            onLoad={() => setImgState('loaded')}
            onError={() => setImgState('error')}
          />
          {imgState === 'loaded' && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-7 w-7 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
            </div>
          )}
        </div>
        {captionAfterMediaId && (
          <span className="text-xs font-semibold text-[#111B21] px-1">{captionAfterMediaId}</span>
        )}
        {lightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightbox(false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={captionAfterMediaId || 'WhatsApp Photo'}
              className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition"
              onClick={() => setLightbox(false)}
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
    );
  }

  if (isImage) {
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


export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [contactId, setContactId] = useState<number | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pendingReply, setPendingReply] = useState<AIReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [inputMsg, setInputMsg] = useState('');
  const [sendLoading, setSendLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState('Casual');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then((p) => setContactId(parseInt(p.id, 10)));
  }, [params]);

  const loadData = async () => {
    if (!contactId) return;
    try {
      const data = await getConversationDetails(contactId);
      setContact(data.contact);
      setMessages(data.messages);
      setPendingReply(data.pending_reply);
      if (data.pending_reply) {
        setEditedText(data.pending_reply.edited_reply || data.pending_reply.generated_reply || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contactId) loadData();
  }, [contactId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const act = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    try {
      await fn();
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !inputMsg.trim()) return;
    setSendLoading(true);
    try {
      await sendManualMessage(contactId, inputMsg);
      setInputMsg('');
      loadData();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Send failed');
    } finally {
      setSendLoading(false);
    }
  };

  if (loading || !contact) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#05392E]" />
      </div>
    );
  }

  return (
    <div className="card-3d flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto rounded-3xl overflow-hidden border border-[#05392E]/15 shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAEA] bg-white">
        <div className="flex items-center gap-4">
          <Link href="/inbox" className="btn-3d-secondary p-2 rounded-xl text-[#05392E]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-base shadow-sm">
              {contact.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-extrabold text-[#111B21] text-base leading-tight">{contact.name}</h2>
              <span className="text-xs font-medium text-[#667781]">{contact.phone} • {contact.relationship}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={contact.ai_status} />
          {contact.ai_status === 'ACTIVE' && (
            <button
              onClick={() => act(() => turnOffAI(contactId!))}
              disabled={actionLoading}
              className="btn-3d-danger px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
            >
              <Power className="h-3.5 w-3.5 text-white" />
              <span>Turn Off AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating 3D Pending Approval Banner */}
      {contact.ai_status === 'PENDING' && pendingReply && (
        <div className="p-4 bg-[#FFF8E1] border-b border-[#FFB300]/40 shadow-sm">
          <div className="card-3d rounded-2xl p-4 bg-white border border-[#05392E]/20 shadow-sm">
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
                    act(() => regenerateReply(contactId!, e.target.value).then((r) => setEditedText(r.new_draft)));
                  }}
                  disabled={actionLoading}
                  className="bg-white border border-[#05392E]/25 rounded-xl px-2.5 py-1 text-xs font-bold text-[#05392E] focus:outline-none shadow-sm cursor-pointer"
                >
                  {['Casual', 'Short', 'Funny', 'Friendly', 'Professional', 'Serious'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={() => act(() => regenerateReply(contactId!, selectedTone).then((r) => setEditedText(r.new_draft)))}
                  disabled={actionLoading}
                  className="p-1.5 rounded-xl bg-white border border-[#05392E]/25 text-[#05392E] hover:bg-[#E8F5E9] transition shadow-sm"
                  title="Regenerate Draft"
                >
                  <RefreshCw className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <p className="text-xs font-medium text-[#667781] mb-2">
              Review and approve this draft to start automated AI conversation for {contact.name}.
            </p>

            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-[#D9FDD3] border border-[#25D366] p-2.5 text-sm font-semibold text-[#111B21] focus:outline-none shadow-inner"
              />
            ) : (
              <div className="rounded-2xl bg-[#D9FDD3] p-3 text-sm font-bold text-[#111B21] border border-[#25D366]/30 shadow-sm mb-3">
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
                onClick={() => act(() => rejectReply(contactId!))}
                disabled={actionLoading}
                className="btn-3d-danger-soft px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5 text-[#D32F2F]" />
                <span>Reject</span>
              </button>
              <button
                onClick={() => act(() => approveAndStartAI(contactId!, isEditing ? editedText : undefined))}
                disabled={actionLoading}
                className="btn-3d-bright px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-[#111B21]" /> : <><CheckCircle2 className="h-4 w-4 text-[#111B21]" /><span>Approve & Start AI</span></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D WhatsApp Chat Feed */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#EFEAE2]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <span className="inline-block rounded-2xl bg-white border border-[#E5EAEA] px-4 py-2 text-xs font-semibold text-[#667781] shadow-sm">
              No messages yet. Messages received via WhatsApp will appear here.
            </span>
          </div>
        ) : (
          messages.map((msg) => {
            const isContact = msg.sender === 'CONTACT';
            const isAI = msg.sender === 'AI';

            return (
              <div key={msg.id} className={`flex flex-col ${isContact ? 'items-start' : 'items-end'}`}>
                {/* AI Badge Header */}
                {isAI && (
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <Sparkles className="h-3.5 w-3.5 text-[#05392E]" />
                    <span className="text-[10px] font-bold text-[#05392E] tracking-wider uppercase">
                      ✨ AI Generated
                    </span>
                  </div>
                )}

                {/* 3D Chat Bubble */}
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
                    <span className="text-[10px] font-extrabold block mb-0.5 text-[#03241D]">You (Manual)</span>
                  )}
                  <MessageContent
                    message={msg.message}
                    message_type={msg.message_type}
                    contact_id={contactId ?? undefined}
                    message_id={msg.id}
                  />
                </div>

                {/* Timestamp */}
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
            onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            className="sticky bottom-4 right-4 ml-auto p-2.5 rounded-full bg-white/95 border border-[#05392E]/20 text-[#05392E] shadow-2xl hover:bg-[#E8F5E9] hover:scale-110 active:scale-95 transition-all flex items-center gap-1.5 z-30 backdrop-blur"
            title="Jump to Latest Message"
          >
            <ArrowDown className="h-4 w-4 text-[#25D366]" />
            <span className="text-[11px] font-extrabold pr-1 hidden sm:inline text-[#05392E]">Latest</span>
          </button>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Floating 3D Message Composer */}
      <form
        onSubmit={handleManualSend}
        className="p-4 bg-white border-t border-[#E5EAEA] flex items-center gap-3"
      >
        <input
          type="text"
          placeholder={`Type a manual message to ${contact.name}...`}
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
  );
}
