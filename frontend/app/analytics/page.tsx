'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, MessageSquare, CheckCircle2, Edit3, XCircle, Bot } from 'lucide-react';
import { AnalyticsOverview, HumanEditComparison } from '@/lib/types';
import { getAnalytics, getHumanEdits } from '@/lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [humanEdits, setHumanEdits] = useState<HumanEditComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, e] = await Promise.all([getAnalytics(), getHumanEdits()]);
        setAnalytics(s);
        setHumanEdits(e);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = [
    {
      label: 'MESSAGES RECEIVED',
      value: analytics?.messages_received ?? 0,
      icon: MessageSquare,
      color: '#05392E',
    },
    {
      label: 'AI GENERATED',
      value: analytics?.ai_replies_generated ?? 0,
      icon: Bot,
      color: '#03241D',
    },
    {
      label: 'AI SENT',
      value: analytics?.ai_replies_sent ?? 0,
      icon: CheckCircle2,
      color: '#25D366',
    },
    {
      label: 'HUMAN EDITED',
      value: analytics?.ai_replies_edited ?? 0,
      icon: Edit3,
      color: '#F4B400',
    },
    {
      label: 'REJECTED',
      value: analytics?.ai_replies_rejected ?? 0,
      icon: XCircle,
      color: '#D32F2F',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-2">
        <h1 className="text-2xl font-extrabold text-[#111B21] tracking-tight">Analytics & Human Edit Insights</h1>
        <p className="text-xs font-medium text-[#667781] mt-0.5">
          System operational metrics and human edit comparisons for prompt engineering & persona refinement.
        </p>
      </div>

      {/* 3D Dimensional Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="card-3d card-3d-hover rounded-3xl p-5 border border-[#05392E]/10 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667781]">{label}</span>
              <div className="icon-3d-container h-9 w-9 rounded-2xl flex items-center justify-center">
                <Icon className="h-4 w-4 text-[#05392E]" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-[#111B21] tracking-tight font-digits">{value}</p>
          </div>
        ))}
      </div>

      {/* Side-by-Side Human Edit Logger */}
      <div className="card-3d rounded-3xl p-6 space-y-6 border border-[#05392E]/15 bg-white">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-[#05392E]" />

          <div>
            <h3 className="font-extrabold text-base text-[#111B21]">Human Edit Comparison Log</h3>
            <p className="text-xs font-medium text-[#667781]">
              Comparing original AI generated responses against human-edited text helps refine persona guidelines.
            </p>
          </div>
        </div>

        {humanEdits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E5EAEA] p-8 text-center text-xs font-semibold text-[#667781]">
            No human edited replies recorded yet. Edit a pending draft before approving to log comparisons here.
          </div>
        ) : (
          <div className="space-y-4">
            {humanEdits.map((item, idx) => (
              <div key={idx} className="rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#111B21]">Contact: {item.contact_name}</span>
                  <span className="text-[10px] font-semibold text-[#667781]">
                    {new Date(item.approved_at).toLocaleString()}
                  </span>
                </div>

                {/* Side by Side Comparison Surface */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* AI GENERATED */}
                  <div className="rounded-2xl bg-white border border-[#E5EAEA] p-3.5 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#667781] block mb-1">
                      🤖 AI GENERATED
                    </span>
                    <p className="text-xs font-semibold text-[#667781] italic leading-relaxed">
                      "{item.original_ai_reply}"
                    </p>
                  </div>

                  {/* HUMAN FINAL */}
                  <div className="rounded-2xl bg-[#D9FDD3] border border-[#25D366]/40 p-3.5 shadow-sm">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#075E54] block mb-1">
                      👤 HUMAN FINAL (APPROVED)
                    </span>
                    <p className="text-xs font-bold text-[#111B21] leading-relaxed">
                      "{item.human_edited_reply}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
