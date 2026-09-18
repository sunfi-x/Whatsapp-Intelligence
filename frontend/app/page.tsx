'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Clock, ShieldCheck, Send, RefreshCw, Sparkles, ArrowRight, Zap, Users, Settings, CheckCircle2 } from 'lucide-react';
import { Conversation, AnalyticsOverview } from '@/lib/types';
import { getConversations, getAnalytics, simulateIncomingMessage } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { PendingApprovalCard } from '@/components/PendingApprovalCard';

export default function DashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Simulator state
  const [simName, setSimName] = useState('Rakib');
  const [simPhone, setSimPhone] = useState('8801700000001');
  const [simMsg, setSimMsg] = useState('bro ki obostha?');
  const [simLoading, setSimLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [convs, stats] = await Promise.all([
        getConversations(),
        getAnalytics(),
      ]);
      setConversations(convs);
      setAnalytics(stats);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simMsg.trim()) return;
    setSimLoading(true);
    try {
      await simulateIncomingMessage(simPhone, simName, simMsg);
      setSimMsg('');
      fetchData();
    } catch {
      alert('Simulator error');
    } finally {
      setSimLoading(false);
    }
  };

  const pendingList = conversations.filter((c) => c.contact.ai_status === 'PENDING');
  const activeList = conversations.filter((c) => c.contact.ai_status === 'ACTIVE');

  const metricCards = [
    {
      label: 'ACTIVE AI',
      value: analytics?.active_conversations ?? activeList.length,
      sub: '● AI currently responding',
      icon: Bot,
      activeColor: '#25D366',
    },
    {
      label: 'PENDING APPROVALS',
      value: analytics?.pending_approvals ?? pendingList.length,
      sub: '● Action required by human',
      icon: Clock,
      activeColor: '#F4B400',
    },
    {
      label: 'MESSAGES TODAY',
      value: analytics?.messages_received ?? 0,
      sub: 'Received via WhatsApp API',
      icon: MessageSquare,
      activeColor: '#05392E',
    },
    {
      label: 'AI SENT REPLIES',
      value: analytics?.ai_replies_sent ?? 0,
      sub: 'Approved & sent automatically',
      icon: ShieldCheck,
      activeColor: '#03241D',
    },
  ];

  const quickActions = [
    { title: 'Approve Reply', desc: 'Review AI suggestion', href: '#pending-approvals', icon: CheckCircle2 },
    { title: 'View Inbox', desc: 'Open conversation feed', href: '/inbox', icon: MessageSquare },
    { title: 'Manage Contacts', desc: 'Configure relationship & tone', href: '/contacts', icon: Users },
    { title: 'Configure AI', desc: 'Persona & safety toggle', href: '/settings', icon: Settings },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* 3D Dashboard Hero with Refined Depth & Software AI Core Visualization */}
      <div className="hero-3d p-6 sm:p-8 relative overflow-hidden bg-white">
        {/* Soft Background Radial Ambient Lighting */}
        <div className="absolute top-1/2 right-12 -translate-y-1/2 w-96 h-96 rounded-full bg-[radial-gradient(circle_at_center,rgba(37,211,102,0.12)_0%,transparent_70%)] blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(5,57,46,0.08)_0%,transparent_70%)] blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left Text Information */}
          <div className="flex-1 min-w-0 max-w-lg lg:max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F5E9] border border-[#05392E]/20 text-xs font-extrabold text-[#05392E] mb-4 shadow-sm">
              <Sparkles className="h-4 w-4 text-[#25D366]" />
              <span>✦ AI COMMAND CENTER ACTIVE</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#111B21] tracking-tight leading-tight">
              Welcome back 👋
            </h1>

            <p className="text-sm sm:text-base font-semibold text-[#667781] mt-3 leading-relaxed">
              Your personal AI WhatsApp assistant is monitoring incoming conversations, style-matching responses, and managing approved autonomous AI workflows.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <button
                onClick={fetchData}
                className="btn-3d-primary px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2"
              >
                <RefreshCw className={`h-4.5 w-4.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync System Data</span>
              </button>

              <Link
                href="/inbox"
                className="btn-3d-secondary px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2"
              >
                <MessageSquare className="h-4.5 w-4.5 text-[#05392E]" />
                <span>Open Inbox</span>
              </Link>
            </div>
          </div>

          {/* Right 3D Software Visualization (3D Orbit + Central AI Bot Logo) */}
          <div className="shrink-0 flex items-center justify-center mx-auto md:mx-0 mt-4 md:mt-0">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 lg:w-60 lg:h-60 flex items-center justify-center">
              {/* Outer Dashed Rotating Orbit Ring */}
              <div className="absolute w-40 h-40 sm:w-44 sm:h-44 lg:w-52 lg:h-52 rounded-full border-2 border-dashed border-[#05392E]/30 ai-core-ring" />
              
              {/* Inner Orbit Accent Ring */}
              <div className="absolute w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full border border-[#25D366]/35" />

              {/* Pulsing Green Ambient Aura */}
              <div className="absolute w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full bg-[#25D366]/20 blur-xl pointer-events-none" />

              {/* Central 3D AI Core Sphere with Bot Logo */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full ai-core-sphere flex items-center justify-center relative shadow-2xl z-10">
                <Bot className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 text-white drop-shadow-lg" />
                <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-[#25D366] border-2 border-white halo-active" />
              </div>

              {/* Floating Element 1: AI Spark Badge */}
              <div className="absolute top-0 left-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-[#05392E]/20 text-[11px] sm:text-xs font-extrabold text-[#05392E] shadow-xl animate-float-subtle flex items-center gap-1.5 z-20">
                <Sparkles className="h-3.5 w-3.5 text-[#25D366]" />
                <span>Smart Auto-Reply</span>
              </div>

              {/* Floating Element 2: WhatsApp Chat Bubble Badge */}
              <div className="absolute bottom-0 right-0 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl bg-white/95 backdrop-blur border border-[#25D366]/30 text-[11px] sm:text-xs font-extrabold text-[#111B21] shadow-xl animate-float-reverse flex items-center gap-1.5 z-20">
                <MessageSquare className="h-3.5 w-3.5 text-[#05392E]" />
                <span>WhatsApp API</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3D Floating Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card-3d card-3d-hover rounded-3xl p-6 border border-[#05392E]/08 flex flex-col justify-between relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#667781]">
                  {card.label}
                </span>
                <div className="icon-3d-container h-11 w-11 rounded-2xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[#05392E]" />
                </div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-4xl sm:text-[40px] font-extrabold text-[#111B21] tracking-tight font-digits">{card.value}</span>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#E5EAEA] flex items-center justify-between text-xs font-bold text-[#667781]">
                <span>{card.sub}</span>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: card.activeColor }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Feature Action Visualizations (Level 1 Utility Cards) */}
      <div className="space-y-3.5">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#667781] px-1">
          Quick Workflows & Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.title}
                href={act.href}
                className="card-3d-sm card-3d-sm-hover rounded-2xl p-4.5 flex items-center gap-3.5 border border-[#05392E]/08 group block"
              >
                <div className="icon-3d-container h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Icon className="h-5 w-5 text-[#05392E]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-base text-[#111B21] truncate">{act.title}</h4>
                  <p className="text-xs font-semibold text-[#667781] truncate">{act.desc}</p>
                </div>
                <ArrowRight className="h-4.5 w-4.5 text-[#667781] group-hover:text-[#05392E] group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>


      {/* 3D Webhook Sandbox Simulator Widget */}
      <div className="card-3d rounded-3xl p-6 sm:p-7 border border-[#05392E]/15 bg-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3.5">
            <div className="icon-3d-container p-3 rounded-2xl">
              <Zap className="h-6 w-6 text-[#05392E]" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-[#111B21]">WhatsApp Webhook Simulator</h3>
              <p className="text-xs font-semibold text-[#667781]">Live message injection test pipeline</p>
            </div>
          </div>
          <span className="text-xs font-extrabold px-4 py-1.5 rounded-full bg-[#E8F5E9] text-[#05392E] border border-[#05392E]/20 shadow-sm">
            Sandbox Test
          </span>
        </div>

        <form onSubmit={handleSimulate} className="mt-5 flex flex-wrap items-center gap-3.5">
          <input
            type="text"
            placeholder="Sender Name"
            value={simName}
            onChange={(e) => setSimName(e.target.value)}
            className="w-40 rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-4 py-3 text-sm font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
          />
          <input
            type="text"
            placeholder="Phone Number"
            value={simPhone}
            onChange={(e) => setSimPhone(e.target.value)}
            className="w-44 rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-4 py-3 text-sm font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
          />
          <input
            type="text"
            placeholder="Message (e.g., bro kal campus e ashbi?)"
            value={simMsg}
            onChange={(e) => setSimMsg(e.target.value)}
            className="flex-1 min-w-[240px] rounded-2xl border border-[#E5EAEA] bg-[#F7FAF9] px-4 py-3 text-sm font-bold text-[#111B21] focus:outline-none focus:border-[#05392E] transition shadow-inner"
          />
          <button
            type="submit"
            disabled={simLoading}
            className="btn-3d-bright px-6 py-3 rounded-2xl text-sm font-extrabold flex items-center gap-2 disabled:opacity-50"
          >
            {simLoading ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
            <span>Simulate Message</span>
          </button>
        </form>
      </div>

      {/* Pending Approvals Section */}
      <div id="pending-approvals" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#111B21] flex items-center gap-2.5">
            <span>Pending Approvals</span>
            <span className="px-3 py-0.5 rounded-full bg-[#FFF8E1] text-[#E65100] border border-[#FFB300] text-xs font-black shadow-sm font-digits">
              {pendingList.length}
            </span>
          </h2>
        </div>

        {pendingList.length === 0 ? (
          <div className="card-3d rounded-3xl p-10 text-center border border-dashed border-[#E5EAEA]">
            <Clock className="mx-auto h-9 w-9 text-[#667781]/40 mb-2" />
            <p className="text-base font-extrabold text-[#111B21]">No pending approvals</p>
            <p className="text-xs text-[#667781] font-semibold mt-1">
              New incoming messages from unapproved contacts will show up here for your review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {pendingList.map((conv) => (
              <PendingApprovalCard key={conv.contact.id} conversation={conv} onRefresh={fetchData} />
            ))}
          </div>
        )}
      </div>

      {/* Active Conversations Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-[#111B21] flex items-center gap-2.5">
            <span>Active Conversations</span>
            <span className="px-3 py-0.5 rounded-full bg-[#E8F5E9] text-[#05392E] border border-[#05392E]/20 text-xs font-black shadow-sm font-digits">
              {activeList.length}
            </span>
          </h2>
          <Link href="/inbox?status=ACTIVE" className="text-xs font-extrabold text-[#05392E] hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {activeList.length === 0 ? (
          <div className="card-3d rounded-3xl p-10 text-center border border-dashed border-[#E5EAEA]">
            <Bot className="mx-auto h-9 w-9 text-[#667781]/40 mb-2" />
            <p className="text-base font-extrabold text-[#111B21]">No active AI conversations yet</p>
            <p className="text-xs text-[#667781] font-semibold mt-1">
              Approve pending suggestions above to enable automatic AI responses for contacts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {activeList.map((conv) => (
              <div key={conv.contact.id} className="card-3d card-3d-hover rounded-3xl p-5.5 border border-[#05392E]/15 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-base text-[#111B21]">{conv.contact.name}</h4>
                    <StatusBadge status={conv.contact.ai_status} size="sm" />
                  </div>
                  <p className="text-xs font-semibold text-[#667781] mb-3"><span className="font-digits">{conv.contact.phone}</span> • {conv.contact.relationship}</p>
                  <div className="rounded-2xl bg-[#F7FAF9] border border-[#E5EAEA] p-3.5 text-xs text-[#111B21]">
                    <span className="font-extrabold text-[#667781] block mb-1">Last message:</span>
                    "{conv.last_message?.message || 'No recent message'}"
                  </div>
                </div>

                <div className="mt-4 pt-3.5 border-t border-[#E5EAEA] flex items-center justify-between">
                  <span className="text-xs text-[#667781] font-semibold"><span className="font-digits">{conv.total_messages}</span> messages</span>
                  <Link
                    href={`/conversations/${conv.contact.id}`}
                    className="text-xs font-extrabold text-[#05392E] hover:underline flex items-center gap-1"
                  >
                    <span>Open Chat</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

