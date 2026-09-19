'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, Edit3, RefreshCw, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { approveAndStartAI, rejectReply, regenerateReply } from '@/lib/api';

interface PendingApprovalCardProps {
  conversation: Conversation;
  onRefresh: () => void;
}

export const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({ conversation, onRefresh }) => {
  const { contact, last_message, pending_reply } = conversation;
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(pending_reply?.generated_reply || '');
  const [loading, setLoading] = useState(false);
  const [selectedTone, setSelectedTone] = useState(contact.preferred_tone || 'Casual');

  const draftText = pending_reply?.edited_reply || pending_reply?.generated_reply || '';

  const handleApprove = async () => {
    setLoading(true);
    try {
      await approveAndStartAI(contact.id, isEditing ? editedText : undefined);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Approval failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await rejectReply(contact.id);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Rejection failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async (tone: string) => {
    setLoading(true);
    try {
      const res = await regenerateReply(contact.id, tone);
      setEditedText(res.new_draft);
      onRefresh();
    } catch {
      alert('Regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-3d card-3d-hover rounded-3xl p-5 border border-[#05392E]/15 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#E5EAEA]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-[#05392E] border border-[#03241D] flex items-center justify-center font-extrabold text-white text-lg shadow-sm">
              {contact.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-extrabold text-base text-[#111B21]">{contact.name}</h4>
              <span className="text-xs text-[#667781] font-semibold"><span className="font-digits">{contact.phone}</span> • {contact.relationship}</span>
            </div>
          </div>
          <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-[#FFF8E1] text-[#E65100] border border-[#FFB300] shadow-sm">
            🟡 Approval Required
          </span>
        </div>

        {/* Message Preview Section */}
        <div className="mt-4 space-y-3">
          {/* Incoming Message Box */}
          <div className="rounded-2xl bg-[#F7FAF9] border border-[#E5EAEA] p-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#667781] block mb-1">
              Incoming WhatsApp Message
            </span>
            <p className="text-base font-semibold text-[#111B21] leading-relaxed">
              "{last_message?.message || 'No message'}"
            </p>
          </div>

          {/* AI Suggested Reply Box (Elevated Soft Green Surface) */}
          <div className="rounded-2xl bg-[#E8F5E9] border border-[#05392E]/20 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#05392E] flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#05392E]" />
                AI Suggested Response
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={selectedTone}
                  onChange={(e) => {
                    setSelectedTone(e.target.value);
                    handleRegenerate(e.target.value);
                  }}
                  disabled={loading}
                  className="bg-white border border-[#05392E]/25 rounded-xl px-3 py-1 text-xs font-bold text-[#05392E] focus:outline-none shadow-sm cursor-pointer"
                >
                  <option value="Casual">😎 Casual</option>
                  <option value="Short">⚡ Short</option>
                  <option value="Funny">😂 Funny</option>
                  <option value="Friendly">😊 Friendly</option>
                  <option value="Professional">💼 Professional</option>
                  <option value="Serious">😐 Serious</option>
                  <option value="Romantic">❤️ Romantic</option>
                </select>
                <button
                  onClick={() => handleRegenerate(selectedTone)}
                  disabled={loading}
                  className="p-1.5 rounded-xl bg-white border border-[#05392E]/25 text-[#05392E] hover:bg-[#E8F5E9] shadow-sm transition"
                  title="Regenerate Draft"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={2}
                className="w-full rounded-xl bg-white border border-[#25D366] p-3 text-base font-semibold text-[#111B21] focus:outline-none shadow-inner"
              />
            ) : (
              <p className="text-base font-bold text-[#111B21] leading-relaxed">
                "{draftText}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-[#E5EAEA] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={loading}
            className="btn-3d-secondary px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
          >
            <Edit3 className="h-4 w-4 text-[#05392E]" />
            <span>{isEditing ? 'Cancel Edit' : 'Edit'}</span>
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="btn-3d-danger-soft px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5"
          >
            <XCircle className="h-4 w-4 text-[#D32F2F]" />
            <span>Reject</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/conversations/${contact.id}`}
            className="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <MessageSquare className="h-3.5 w-3.5 text-[#05392E]" />
            <span>Chat</span>
          </Link>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="btn-3d-bright px-4 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#111B21]" />
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#111B21]" />
                <span>Approve & Start AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
